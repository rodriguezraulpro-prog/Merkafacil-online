import {
  Product,
  Sale,
  StockMovement,
  StoreSettings,
  Customer,
  UserAccount,
  CashShift,
  CreditRecord,
  CreditPayment,
  PayableRecord,
  PayablePayment,
  PaymentMethod,
} from '../types';
import {
  getBrowserSupabaseConfig,
  saveBrowserSupabaseConfig,
  disconnectBrowserSupabase,
  isBrowserSupabaseActive,
  getBrowserLocalState,
  saveBrowserLocalState,
  testAndConnectBrowserSupabase,
  pushBrowserStateToSupabase,
  pullBrowserStateFromSupabase,
  deleteFromBrowserSupabaseTable,
  wipeBrowserSupabaseDatabase,
  scheduleBrowserSupabasePush,
  checkAndApplyUrlSupabaseConfig,
  getSupabaseBrowserClient,
  syncBrowserProduct,
  deleteBrowserProduct,
  syncBrowserSale,
  syncBrowserCustomer,
  syncBrowserCredit,
  syncBrowserPayable,
  syncBrowserShift,
  syncBrowserSettings,
} from './supabaseBrowser';

export interface FullAppState {
  products: Product[];
  categories: string[];
  customers: Customer[];
  credits: CreditRecord[];
  payables?: PayableRecord[];
  sales: Sale[];
  movements: StockMovement[];
  shifts: CashShift[];
  currentShift: CashShift | null;
  users: UserAccount[];
  settings: StoreSettings;
}

async function safeRequestJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; isJson: boolean; data?: T }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    if (!text) {
      return { ok: res.ok, status: res.status, isJson: false };
    }
    const trimmed = text.trim();
    if (
      contentType.includes('application/json') ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[')
    ) {
      try {
        const parsed = JSON.parse(trimmed) as T;
        return { ok: res.ok, status: res.status, isJson: true, data: parsed };
      } catch {
        return { ok: false, status: res.status, isJson: false };
      }
    }
    return { ok: false, status: res.status, isJson: false };
  } catch {
    return { ok: false, status: 0, isJson: false };
  }
}

export const api = {
  async getState(): Promise<FullAppState> {
    // 1. Check if URL contains Supabase credentials (e.g. from mobile link or QR code)
    checkAndApplyUrlSupabaseConfig();

    // 2. If this device/browser doesn't have Supabase configured yet, try discovering from server
    if (!isBrowserSupabaseActive()) {
      try {
        const cfgRes = await safeRequestJson<any>('/api/system/supabase-config');
        if (cfgRes.ok && cfgRes.isJson && cfgRes.data?.url && cfgRes.data?.anonKey) {
          saveBrowserSupabaseConfig({
            enabled: Boolean(cfgRes.data.enabled),
            isConnected: Boolean(cfgRes.data.isConnected),
            url: cfgRes.data.url,
            anonKey: cfgRes.data.anonKey,
            connectedAt: cfgRes.data.connectedAt,
            lastSyncAt: cfgRes.data.lastSyncAt,
          });
        }
      } catch (_) {}
    }

    // 3. When Supabase is active, Supabase is the single source of truth across all devices!
    if (isBrowserSupabaseActive()) {
      try {
        const pulled = await pullBrowserStateFromSupabase();
        if (pulled.success && pulled.state) {
          // Hydrate local SQLite backup asynchronously if Express backend is running
          safeRequestJson('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pulled.state),
          }).catch(() => {});
          return pulled.state;
        }
      } catch (err) {
        console.warn('[API] Could not pull from Supabase directly:', err);
      }
    }

    // 4. Fallback to Express backend (/api/state)
    const serverRes = await safeRequestJson<FullAppState>('/api/state');
    if (serverRes.ok && serverRes.isJson && serverRes.data) {
      saveBrowserLocalState(serverRes.data);
      return serverRes.data;
    }

    // 5. Final fallback to cached local state
    return getBrowserLocalState();
  },

  async createProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    const res = await safeRequestJson<Product>('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const created: Product = (res.ok && res.isJson && res.data)
      ? res.data
      : {
          ...product,
          id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        };

    // Immediate sync to Supabase PostgreSQL (atomic)
    syncBrowserProduct(created).catch(() => {});

    const st = getBrowserLocalState();
    saveBrowserLocalState({
      ...st,
      products: [created, ...st.products.filter(p => p.id !== created.id)],
    });
    return created;
  },

  async updateProduct(product: Product): Promise<Product> {
    safeRequestJson<Product>(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    }).catch(() => {});

    // Immediate sync to Supabase PostgreSQL (atomic)
    syncBrowserProduct(product).catch(() => {});

    const st = getBrowserLocalState();
    saveBrowserLocalState({
      ...st,
      products: st.products.map((p) => (p.id === product.id ? product : p)),
    });
    return product;
  },

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    safeRequestJson<{ success: boolean }>(`/api/products/${id}`, {
      method: 'DELETE',
    }).catch(() => {});

    deleteBrowserProduct(id).catch(() => {});

    const st = getBrowserLocalState();
    saveBrowserLocalState({
      ...st,
      products: st.products.filter((p) => p.id !== id),
    });
    return { success: true };
  },

  async adjustStock(
    productId: string,
    newStock: number,
    reason: string
  ): Promise<{ product: Product; movement: StockMovement }> {
    const res = await safeRequestJson<{ product: Product; movement: StockMovement }>(
      `/api/products/${productId}/adjust`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStock, reason }),
      }
    );
    const st = getBrowserLocalState();
    const existing = st.products.find((p) => p.id === productId);
    const prevStock = existing ? existing.stock : 0;
    const updatedProduct: Product = res.data?.product || (existing
      ? { ...existing, stock: Math.max(0, newStock) }
      : ({ id: productId, stock: Math.max(0, newStock) } as Product));
    const movement: StockMovement = res.data?.movement || {
      id: `mov-${Date.now()}-${productId}`,
      productId,
      productName: existing?.name || 'Producto',
      type: 'ajuste_merma',
      quantity: newStock - prevStock,
      previousStock: prevStock,
      newStock: Math.max(0, newStock),
      reason: reason || 'Ajuste de inventario',
      date: new Date().toISOString(),
    };

    syncBrowserProduct(updatedProduct).catch(() => {});
    if (isBrowserSupabaseActive()) {
      const cfg = getBrowserSupabaseConfig();
      const client = getSupabaseBrowserClient(cfg.url, cfg.anonKey);
      Promise.resolve(
        client.from('movements').insert({
          id: movement.id,
          product_id: movement.productId,
          product_name: movement.productName,
          type: movement.type,
          quantity: movement.quantity,
          previous_stock: movement.previousStock,
          new_stock: movement.newStock,
          reason: movement.reason,
          date: movement.date,
        })
      ).catch(() => {});
    }

    saveBrowserLocalState({
      ...st,
      products: st.products.map((p) => (p.id === productId ? updatedProduct : p)),
      movements: [movement, ...st.movements],
    });
    return { product: updatedProduct, movement };
  },

  async restockProduct(
    productId: string,
    quantityToAdd: number,
    reason?: string
  ): Promise<{ product: Product; movement: StockMovement }> {
    const res = await safeRequestJson<{ product: Product; movement: StockMovement }>(
      `/api/products/${productId}/restock`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityToAdd, reason }),
      }
    );
    const st = getBrowserLocalState();
    const existing = st.products.find((p) => p.id === productId);
    const prevStock = existing ? existing.stock : 0;
    const newStock = prevStock + quantityToAdd;
    const updatedProduct: Product = res.data?.product || (existing
      ? { ...existing, stock: newStock }
      : ({ id: productId, stock: newStock } as Product));
    const movement: StockMovement = res.data?.movement || {
      id: `mov-${Date.now()}-${productId}`,
      productId,
      productName: existing?.name || 'Producto',
      type: 'entrada',
      quantity: quantityToAdd,
      previousStock: prevStock,
      newStock,
      reason: reason || 'Reabastecimiento de mercancía',
      date: new Date().toISOString(),
    };

    syncBrowserProduct(updatedProduct).catch(() => {});
    if (isBrowserSupabaseActive()) {
      const cfg = getBrowserSupabaseConfig();
      const client = getSupabaseBrowserClient(cfg.url, cfg.anonKey);
      Promise.resolve(
        client.from('movements').insert({
          id: movement.id,
          product_id: movement.productId,
          product_name: movement.productName,
          type: movement.type,
          quantity: movement.quantity,
          previous_stock: movement.previousStock,
          new_stock: movement.newStock,
          reason: movement.reason,
          date: movement.date,
        })
      ).catch(() => {});
    }

    saveBrowserLocalState({
      ...st,
      products: st.products.map((p) => (p.id === productId ? updatedProduct : p)),
      movements: [movement, ...st.movements],
    });
    return { product: updatedProduct, movement };
  },

  async addCategory(name: string): Promise<{ success: boolean; error?: string }> {
    const res = await safeRequestJson<{ success: boolean; error?: string }>('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok && res.isJson && res.data) return res.data;
    const st = getBrowserLocalState();
    if (!st.categories.includes(name)) {
      scheduleBrowserSupabasePush({
        ...st,
        categories: [...st.categories, name],
      });
    }
    return { success: true };
  },

  async updateCategory(
    oldName: string,
    newName: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await safeRequestJson<{ success: boolean; error?: string }>(
      `/api/categories/${encodeURIComponent(oldName)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      }
    );
    await deleteFromBrowserSupabaseTable('categories', 'name', oldName);
    if (res.ok && res.isJson && res.data) return res.data;
    const st = getBrowserLocalState();
    scheduleBrowserSupabasePush({
      ...st,
      categories: st.categories.map((c) => (c === oldName ? newName : c)),
      products: st.products.map((p) => (p.category === oldName ? { ...p, category: newName } : p)),
    });
    return { success: true };
  },

  async deleteCategory(name: string): Promise<{ success: boolean; affectedProducts: number }> {
    const res = await safeRequestJson<{ success: boolean; affectedProducts: number }>(
      `/api/categories/${encodeURIComponent(name)}`,
      { method: 'DELETE' }
    );
    await deleteFromBrowserSupabaseTable('categories', 'name', name);
    if (res.ok && res.isJson && res.data) return res.data;
    return { success: true, affectedProducts: 0 };
  },

  async saveCustomer(customer: {
    id?: string;
    idDocType: 'V' | 'E' | 'J' | 'G';
    idDocNumber: string;
    name: string;
    phone?: string;
    address?: string;
    creditLimitUSD?: number;
  }): Promise<Customer> {
    const res = await safeRequestJson<Customer>('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    const savedCustomer: Customer = res.ok && res.isJson && res.data ? res.data : {
      id: customer.id || `cust-${Date.now()}`,
      idDocType: customer.idDocType,
      idDocNumber: customer.idDocNumber,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      creditLimitUSD: customer.creditLimitUSD,
      createdAt: new Date().toISOString(),
    };

    syncBrowserCustomer(savedCustomer).catch(() => {});

    const st = getBrowserLocalState();
    const exists = st.customers.some((c) => c.id === savedCustomer.id);
    saveBrowserLocalState({
      ...st,
      customers: exists
        ? st.customers.map((c) => (c.id === savedCustomer.id ? savedCustomer : c))
        : [...st.customers, savedCustomer],
    });
    return savedCustomer;
  },

  async updateCustomerCreditLimit(customerId: string, creditLimitUSD?: number): Promise<void> {
    safeRequestJson(`/api/customers/${customerId}/credit-limit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creditLimitUSD }),
    }).catch(() => {});

    const st = getBrowserLocalState();
    const target = st.customers.find(c => c.id === customerId);
    if (target) {
      const updated = { ...target, creditLimitUSD };
      syncBrowserCustomer(updated).catch(() => {});
      saveBrowserLocalState({
        ...st,
        customers: st.customers.map((c) => (c.id === customerId ? updated : c)),
      });
    }
  },

  async createCredit(creditData: {
    id?: string;
    customerId: string;
    customerName: string;
    customerIdDoc?: string;
    customerPhone?: string;
    customerAddress?: string;
    originalAmountUSD: number;
    description?: string;
    notes?: string;
    saleId?: string;
    saleNumber?: string;
    bcvRate?: number;
  }): Promise<CreditRecord> {
    const res = await safeRequestJson<CreditRecord>('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creditData),
    });
    const st = getBrowserLocalState();
    const rate = creditData.bcvRate || st.settings.bcvRate || 54.5;
    const credit: CreditRecord = res.ok && res.isJson && res.data ? res.data : {
      id: creditData.id || `cred-${Date.now()}`,
      customerId: creditData.customerId,
      customerName: creditData.customerName,
      customerIdDoc: creditData.customerIdDoc,
      customerPhone: creditData.customerPhone,
      customerAddress: creditData.customerAddress,
      saleId: creditData.saleId,
      saleNumber: creditData.saleNumber,
      date: new Date().toISOString(),
      originalAmountUSD: creditData.originalAmountUSD,
      originalAmountBs: creditData.originalAmountUSD * rate,
      bcvRate: rate,
      currentBalanceUSD: creditData.originalAmountUSD,
      status: 'pendiente',
      description: creditData.description || 'Crédito',
      notes: creditData.notes,
      payments: [],
    };

    syncBrowserCredit(credit).catch(() => {});

    saveBrowserLocalState({
      ...st,
      credits: [credit, ...st.credits.filter((c) => c.id !== credit.id)],
    });
    return credit;
  },

  async addCreditPayment(
    creditRecordId: string,
    paymentData: {
      amountPaid: number;
      currency: 'Bs.' | '$';
      paymentMethod: PaymentMethod;
      paymentReference?: string;
      notes?: string;
      registerInCashDrawer?: boolean;
      receivedByUserName?: string;
      shiftId?: string;
    }
  ): Promise<{ success: boolean; error?: string; payment?: CreditPayment; credit?: CreditRecord }> {
    const res = await safeRequestJson<{
      success: boolean;
      error?: string;
      payment?: CreditPayment;
      credit?: CreditRecord;
    }>(`/api/credits/${creditRecordId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });

    const st = getBrowserLocalState();
    const existing = st.credits.find((c) => c.id === creditRecordId);
    if (existing) {
      const rate = existing.bcvRate || st.settings.bcvRate || 54.5;
      const paidUSD =
        paymentData.currency === 'Bs.' ? (paymentData.amountPaid || 0) / rate : paymentData.amountPaid;
      const nextBalanceUSD = Math.max(0, existing.currentBalanceUSD - paidUSD);
      const nextStatus = nextBalanceUSD <= 0.01 ? 'pagado' : 'parcial';
      const newPayment: CreditPayment = {
        id: `pay-${Date.now()}`,
        creditRecordId,
        customerId: existing.customerId,
        date: new Date().toISOString(),
        amountUSD: paidUSD,
        amountBs: paymentData.currency === 'Bs.' ? paymentData.amountPaid : paidUSD * rate,
        bcvRate: rate,
        paymentMethod: paymentData.paymentMethod,
        currency: paymentData.currency,
        paymentReference: paymentData.paymentReference,
        notes: paymentData.notes,
        receivedByUserName: paymentData.receivedByUserName || 'Administrador Bodega',
        shiftId: paymentData.shiftId,
      };

      const updatedCredit: CreditRecord = {
        ...existing,
        currentBalanceUSD: nextBalanceUSD,
        status: nextStatus as any,
        payments: [...(existing.payments || []), newPayment],
      };

      syncBrowserCredit(updatedCredit).catch(() => {});

      saveBrowserLocalState({
        ...st,
        credits: st.credits.map((c) => (c.id === creditRecordId ? updatedCredit : c)),
      });
      return { success: true, payment: newPayment, credit: updatedCredit };
    }

    if (res.ok && res.isJson && res.data) return res.data;
    return { success: true };
  },

  async deleteCredit(id: string): Promise<{ success: boolean }> {
    const res = await safeRequestJson<{ success: boolean }>(`/api/credits/${id}`, {
      method: 'DELETE',
    });
    await deleteFromBrowserSupabaseTable('credits', 'id', id);
    if (res.ok && res.isJson && res.data) return res.data;
    const st = getBrowserLocalState();
    saveBrowserLocalState({
      ...st,
      credits: st.credits.filter((c) => c.id !== id),
    });
    return { success: true };
  },

  async createPayable(payableData: {
    id?: string;
    supplierName: string;
    supplierDoc?: string;
    supplierPhone?: string;
    invoiceNumber?: string;
    description: string;
    originalAmountUSD: number;
    dueDate?: string;
    notes?: string;
    bcvRate?: number;
  }): Promise<PayableRecord> {
    const res = await safeRequestJson<PayableRecord>('/api/payables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payableData),
    });
    if (res.ok && res.isJson && res.data) return res.data;
    const st = getBrowserLocalState();
    const rate = payableData.bcvRate || st.settings.bcvRate || 54.5;
    const fallbackPayable: PayableRecord = {
      id: payableData.id || `payb-${Date.now()}`,
      supplierName: payableData.supplierName,
      supplierDoc: payableData.supplierDoc,
      supplierPhone: payableData.supplierPhone,
      invoiceNumber: payableData.invoiceNumber,
      description: payableData.description,
      date: new Date().toISOString(),
      dueDate: payableData.dueDate,
      originalAmountUSD: payableData.originalAmountUSD,
      originalAmountBs: payableData.originalAmountUSD * rate,
      bcvRate: rate,
      currentBalanceUSD: payableData.originalAmountUSD,
      status: 'pendiente',
      notes: payableData.notes,
      payments: [],
    };
    scheduleBrowserSupabasePush({
      ...st,
      payables: [
        fallbackPayable,
        ...(st.payables || []).filter((p) => p.id !== fallbackPayable.id),
      ],
    });
    return fallbackPayable;
  },

  async addPayablePayment(
    payableId: string,
    paymentData: {
      amountPaid: number;
      currency: 'Bs.' | '$';
      paymentMethod: PaymentMethod;
      paymentReference?: string;
      notes?: string;
      paidByUserName?: string;
    }
  ): Promise<{
    success: boolean;
    error?: string;
    payment?: PayablePayment;
    payable?: PayableRecord;
  }> {
    const res = await safeRequestJson<{
      success: boolean;
      error?: string;
      payment?: PayablePayment;
      payable?: PayableRecord;
    }>(`/api/payables/${payableId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });
    if (res.ok && res.isJson && res.data) return res.data;
    return { success: true };
  },

  async deletePayable(id: string): Promise<{ success: boolean }> {
    const res = await safeRequestJson<{ success: boolean }>(`/api/payables/${id}`, {
      method: 'DELETE',
    });
    await deleteFromBrowserSupabaseTable('payables', 'id', id);
    if (res.ok && res.isJson && res.data) return res.data;
    const st = getBrowserLocalState();
    saveBrowserLocalState({
      ...st,
      payables: (st.payables || []).filter((p) => p.id !== id),
    });
    return { success: true };
  },

  async createSale(
    sale: Sale,
    movements?: StockMovement[],
    updatedProducts?: { id: string; stock: number }[]
  ): Promise<{ success: boolean; sale?: Sale; error?: string }> {
    safeRequestJson<{ success: boolean; sale?: Sale; error?: string }>(
      '/api/sales',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale),
      }
    ).catch(() => {});

    syncBrowserSale(sale, movements, updatedProducts).catch(() => {});

    const st = getBrowserLocalState();
    saveBrowserLocalState({
      ...st,
      sales: [sale, ...st.sales.filter((s) => s.id !== sale.id)],
      movements: movements ? [...movements, ...st.movements] : st.movements,
      products: updatedProducts
        ? st.products.map((p) => {
            const match = updatedProducts.find((u) => u.id === p.id);
            return match ? { ...p, stock: match.stock } : p;
          })
        : st.products,
    });
    return { success: true, sale };
  },

  async cancelSale(
    saleId: string,
    reason?: string,
    cancelledBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    safeRequestJson<{ success: boolean; error?: string }>(
      `/api/sales/${saleId}/cancel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, cancelledBy }),
      }
    ).catch(() => {});

    if (isBrowserSupabaseActive()) {
      const cfg = getBrowserSupabaseConfig();
      const client = getSupabaseBrowserClient(cfg.url, cfg.anonKey);
      Promise.resolve(
        client
          .from('sales')
          .update({
            status: 'anulada',
            cancelled_reason: reason || null,
            cancelled_at: new Date().toISOString(),
            cancelled_by: cancelledBy || null,
          })
          .eq('id', saleId)
      ).catch(() => {});
    }

    const st = getBrowserLocalState();
    saveBrowserLocalState({
      ...st,
      sales: st.sales.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'anulada' as const,
              cancelledReason: reason,
              cancelledAt: new Date().toISOString(),
              cancelledBy,
            }
          : s
      ),
    });
    return { success: true };
  },

  async openShift(params: {
    userId: string;
    userName: string;
    initialCashBs: number;
    initialCashUSD: number;
    notes?: string;
  }): Promise<{ success: boolean; shift?: CashShift; error?: string }> {
    const res = await safeRequestJson<{ success: boolean; shift?: CashShift; error?: string }>(
      '/api/shifts/open',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }
    );
    if (res.ok && res.isJson && res.data) return res.data;
    return { success: true };
  },

  async closeShift(params: {
    shiftId: string;
    userId: string;
    userName: string;
    countedCashBs: number;
    countedCashUSD: number;
    notes?: string;
  }): Promise<{ success: boolean; shift?: CashShift; error?: string }> {
    const res = await safeRequestJson<{ success: boolean; shift?: CashShift; error?: string }>(
      `/api/shifts/${params.shiftId}/close`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }
    );
    if (res.ok && res.isJson && res.data) return res.data;
    return { success: true };
  },

  async addCashMovementToShift(
    shiftId: string,
    params: {
      type: 'ingreso' | 'egreso';
      currency: 'Bs.' | '$';
      amount: number;
      reason: string;
      performedBy: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const res = await safeRequestJson<{ success: boolean; error?: string }>(
      `/api/shifts/${shiftId}/cash-movement`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }
    );
    if (res.ok && res.isJson && res.data) return res.data;
    return { success: true };
  },

  async updateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const res = await safeRequestJson<StoreSettings>('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok && res.isJson && res.data) {
      const st = getBrowserLocalState();
      scheduleBrowserSupabasePush({
        ...st,
        settings: { ...st.settings, ...res.data },
      });
      return res.data;
    }
    const st = getBrowserLocalState();
    const merged = { ...st.settings, ...settings };
    scheduleBrowserSupabasePush({
      ...st,
      settings: merged,
    });
    return merged;
  },

  async updateUserPin(
    userId: string,
    pin: string
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const res = await safeRequestJson<{ success: boolean; user?: UserAccount; error?: string }>(
      `/api/users/${userId}/pin`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      }
    );
    const st = getBrowserLocalState();
    scheduleBrowserSupabasePush({
      ...st,
      users: st.users.map((u) => (u.id === userId ? { ...u, pin } : u)),
    });
    if (res.ok && res.isJson && res.data) return res.data;
    return { success: true };
  },

  async resetDatabase(): Promise<FullAppState> {
    await wipeBrowserSupabaseDatabase();
    const res = await safeRequestJson<FullAppState>('/api/reset', { method: 'POST' });
    if (res.ok && res.isJson && res.data) {
      saveBrowserLocalState(res.data);
      return res.data;
    }
    const st = getBrowserLocalState();
    const cleanState: FullAppState = {
      ...st,
      products: [],
      customers: [],
      credits: [],
      payables: [],
      sales: [],
      movements: [],
      shifts: [],
      currentShift: null,
    };
    saveBrowserLocalState(cleanState);
    return cleanState;
  },

  async getDbInfo(): Promise<{
    provider: string;
    dbPath: string;
    dataDir: string;
    exists: boolean;
    sizeBytes: number;
    counts?: { products: number; sales: number; customers: number };
    platform: string;
  }> {
    const res = await safeRequestJson<any>('/api/system/db-info');
    if (res.ok && res.isJson && res.data) return res.data;
    const st = getBrowserLocalState();
    const supa = getBrowserSupabaseConfig();
    return {
      provider: supa.isConnected ? 'supabase_cloud' : 'browser_storage',
      dbPath: supa.isConnected ? supa.url : 'Almacenamiento Navegador / Supabase Cloud',
      dataDir: '',
      exists: true,
      sizeBytes: 0,
      counts: {
        products: st.products.length,
        sales: st.sales.length,
        customers: st.customers.length,
      },
      platform: 'web',
    };
  },

  async openDbFolder(): Promise<{ success: boolean; openedPath?: string; error?: string }> {
    const res = await safeRequestJson<{ success: boolean; openedPath?: string; error?: string }>(
      '/api/system/open-db-folder',
      { method: 'POST' }
    );
    if (res.ok && res.isJson && res.data) return res.data;
    return {
      success: false,
      error: 'El sistema está operando en modo web; utiliza el respaldo JSON o el panel de Supabase.',
    };
  },

  async restoreBackup(
    backupData: any
  ): Promise<{ success: boolean; state?: FullAppState; error?: string }> {
    const res = await safeRequestJson<{ success: boolean; state?: FullAppState; error?: string }>(
      '/api/backup/restore',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData),
      }
    );
    if (res.ok && res.isJson && res.data) {
      if (res.data.state) {
        scheduleBrowserSupabasePush(res.data.state);
      }
      return res.data;
    }
    const restoredState = saveBrowserLocalState({
      products: backupData.products || [],
      categories: backupData.categories || undefined,
      customers: backupData.customers || [],
      credits: backupData.credits || [],
      payables: backupData.payables || [],
      sales: backupData.sales || [],
      movements: backupData.movements || [],
      shifts: backupData.shifts || [],
      settings: backupData.settings || undefined,
    });
    if (isBrowserSupabaseActive()) {
      await pushBrowserStateToSupabase(restoredState);
    }
    return { success: true, state: restoredState };
  },

  async getOnlineStatus(): Promise<{
    status: string;
    provider?: string;
    mode: string;
    database: string;
    dbSizeKB: number | null;
    timestamp: number;
    uptimeSeconds: number;
  }> {
    const res = await safeRequestJson<any>('/api/system/online-status');
    if (res.ok && res.isJson && res.data) return res.data;
    const supa = getBrowserSupabaseConfig();
    return {
      status: 'online',
      provider: supa.isConnected ? 'supabase' : 'web',
      mode: supa.isConnected ? 'Supabase PostgreSQL' : 'Web Local',
      database: supa.isConnected ? 'Supabase Cloud' : 'Local',
      dbSizeKB: null,
      timestamp: Date.now(),
      uptimeSeconds: 0,
    };
  },

  getDbDownloadUrl(): string {
    return '/api/system/download-db';
  },

  async getLiveBcvRate(): Promise<{
    success: boolean;
    rate?: number;
    officialDate?: string;
    source?: string;
    currentRate?: number;
    lastUpdated?: string;
    autoUpdateEnabled?: boolean;
    error?: string;
  }> {
    const res = await safeRequestJson<any>('/api/bcv/rate');
    if (res.ok && res.isJson && res.data) return res.data;
    try {
      const dRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (dRes.ok) {
        const json = await dRes.json();
        const val = Number(json?.promedio);
        if (val > 0) {
          return {
            success: true,
            rate: Math.round(val * 100) / 100,
            officialDate: json.fechaActualizacion || new Date().toISOString(),
            source: 'BCV Oficial (DolarApi)',
          };
        }
      }
    } catch (_) {}
    return { success: false, error: 'No se pudo consultar la tasa BCV en este momento.' };
  },

  async syncBcvRate(): Promise<{
    success: boolean;
    rate?: number;
    officialDate?: string;
    source?: string;
    updatedSettings?: StoreSettings;
    error?: string;
  }> {
    const res = await safeRequestJson<any>('/api/bcv/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok && res.isJson && res.data) return res.data;

    const live = await this.getLiveBcvRate();
    if (live.success && live.rate) {
      const updatedSettings = await this.updateSettings({
        bcvRate: live.rate,
        bcvLastUpdated: new Date().toISOString(),
        bcvOfficialDate: live.officialDate,
        bcvSource: live.source,
      });
      return {
        success: true,
        rate: live.rate,
        officialDate: live.officialDate,
        source: live.source,
        updatedSettings,
      };
    }
    return {
      success: false,
      error: live.error || 'No se pudo sincronizar la tasa oficial del BCV.',
    };
  },

  // ============================================================================
  // SUPABASE CLOUD (POSTGRESQL) API — Works both with Express & Direct Browser
  // ============================================================================
  async getSupabaseConfig(): Promise<{
    enabled: boolean;
    isConnected: boolean;
    url: string;
    anonKey: string;
    connectedAt?: string;
    lastSyncAt?: string;
  }> {
    const browserCfg = getBrowserSupabaseConfig();
    const res = await safeRequestJson<{
      enabled: boolean;
      isConnected: boolean;
      url: string;
      anonKey: string;
      connectedAt?: string;
      lastSyncAt?: string;
    }>('/api/system/supabase-config');

    if (res.ok && res.isJson && res.data && res.data.url && res.data.anonKey) {
      saveBrowserSupabaseConfig(res.data);
      return res.data;
    }

    return browserCfg;
  },

  async connectSupabase(
    url: string,
    anonKey: string
  ): Promise<{
    success: boolean;
    latencyMs?: number;
    tablesMissing?: boolean;
    message?: string;
    error?: string;
    config?: {
      enabled: boolean;
      isConnected: boolean;
      url: string;
      anonKey: string;
      connectedAt?: string;
      lastSyncAt?: string;
    };
    state?: FullAppState;
  }> {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    const cleanKey = (anonKey || '').trim();

    // 1. Test & connect directly from the browser using @supabase/supabase-js
    const browserTest = await testAndConnectBrowserSupabase(cleanUrl, cleanKey);

    // 2. Also notify backend server if available (ignored safely on static hosts like Vercel)
    const serverRes = await safeRequestJson<any>('/api/system/supabase-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey }),
    });

    if (!browserTest.success) {
      if (serverRes.ok && serverRes.isJson && serverRes.data?.success) {
        if (serverRes.data.config) {
          saveBrowserSupabaseConfig(serverRes.data.config);
        }
        return serverRes.data;
      }
      return browserTest;
    }

    // 3. Synchronize data between browser/local and Supabase PostgreSQL
    let syncedState: FullAppState | undefined = serverRes.data?.state;
    try {
      const localState = syncedState || getBrowserLocalState();
      const remotePull = await pullBrowserStateFromSupabase(cleanUrl, cleanKey);
      if (remotePull.success && remotePull.state) {
        const remoteHasData =
          remotePull.state.products.length > 0 ||
          remotePull.state.sales.length > 0 ||
          remotePull.state.credits.length > 0;
        const localHasData =
          localState.products.length > 0 ||
          localState.sales.length > 0 ||
          localState.credits.length > 0;

        if (!remoteHasData && localHasData) {
          await pushBrowserStateToSupabase(localState, cleanUrl, cleanKey);
          syncedState = localState;
        } else if (remoteHasData) {
          syncedState = remotePull.state;
          saveBrowserLocalState(syncedState);
          await safeRequestJson('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncedState),
          });
        } else {
          await pushBrowserStateToSupabase(localState, cleanUrl, cleanKey);
          syncedState = localState;
        }
      }
    } catch (err) {
      console.warn('[Supabase Connect] Initial sync warning:', err);
    }

    return {
      ...browserTest,
      state: syncedState,
    };
  },

  async disconnectSupabase(): Promise<{ success: boolean; message?: string }> {
    const browserRes = disconnectBrowserSupabase();
    await safeRequestJson('/api/system/supabase-disconnect', { method: 'POST' });
    return browserRes;
  },

  async pushToSupabase(
    url?: string,
    anonKey?: string,
    currentStateOverride?: FullAppState
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    lastSyncAt?: string;
    counts?: {
      products: number;
      sales: number;
      customers: number;
      credits: number;
      shifts: number;
    };
  }> {
    let stateToPush = currentStateOverride;
    if (!stateToPush) {
      const serverState = await safeRequestJson<FullAppState>('/api/state');
      stateToPush =
        serverState.ok && serverState.isJson && serverState.data
          ? serverState.data
          : getBrowserLocalState();
    }

    const browserPush = await pushBrowserStateToSupabase(stateToPush, url, anonKey);

    // Also trigger server push if Express backend is running
    await safeRequestJson('/api/system/supabase-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, anonKey }),
    });

    return browserPush;
  },

  async pullFromSupabase(
    url?: string,
    anonKey?: string
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    state?: FullAppState;
    lastSyncAt?: string;
  }> {
    const browserPull = await pullBrowserStateFromSupabase(url, anonKey);
    if (browserPull.success && browserPull.state) {
      await safeRequestJson('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(browserPull.state),
      });
    }
    return browserPull;
  },
};
