import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Product,
  Sale,
  StockMovement,
  StoreSettings,
  Customer,
  UserAccount,
  CashShift,
  CreditRecord,
  PayableRecord,
} from '../src/types';
import { dataDir, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_USERS } from './db';

export const supabaseConfigFile = path.join(dataDir, 'supabase-config.json');

export interface SupabaseConfigData {
  enabled: boolean;
  url: string;
  anonKey: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

let currentConfig: SupabaseConfigData = {
  enabled: false,
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
};

// Load persisted config from disk if available
if (fs.existsSync(supabaseConfigFile)) {
  try {
    const saved = JSON.parse(fs.readFileSync(supabaseConfigFile, 'utf-8'));
    if (saved && typeof saved === 'object') {
      currentConfig = {
        enabled: Boolean(saved.enabled && saved.url && saved.anonKey),
        url: saved.url !== undefined ? saved.url : currentConfig.url,
        anonKey: saved.anonKey !== undefined ? saved.anonKey : currentConfig.anonKey,
        connectedAt: saved.connectedAt || currentConfig.connectedAt,
        lastSyncAt: saved.lastSyncAt || currentConfig.lastSyncAt,
      };
    }
  } catch (err) {
    console.error('[Supabase] Error reading supabase-config.json:', err);
  }
} else if (currentConfig.url && currentConfig.anonKey) {
  currentConfig.enabled = true;
}

let supabaseClient: SupabaseClient | null = null;

function createSupabaseInstance(url: string, anonKey: string): SupabaseClient {
  return createClient(url.trim(), anonKey.trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

if (currentConfig.enabled && currentConfig.url && currentConfig.anonKey) {
  try {
    supabaseClient = createSupabaseInstance(currentConfig.url, currentConfig.anonKey);
  } catch (err) {
    console.error('[Supabase] Error initializing client:', err);
  }
}

export function getSupabaseConfig(): SupabaseConfigData {
  return { ...currentConfig };
}

export function isSupabaseActive(): boolean {
  return Boolean(currentConfig.enabled && currentConfig.url && currentConfig.anonKey && supabaseClient);
}

function persistConfig() {
  try {
    fs.writeFileSync(supabaseConfigFile, JSON.stringify(currentConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Supabase] Error saving supabase-config.json:', err);
  }
}

export async function testAndSaveSupabaseConfig(
  url: string,
  anonKey: string,
  saveAndActivate: boolean = true
): Promise<{
  success: boolean;
  latencyMs?: number;
  tablesMissing?: boolean;
  message?: string;
  error?: string;
}> {
  const cleanUrl = (url || '').trim().replace(/\/+$/, '');
  const cleanKey = (anonKey || '').trim();

  if (!cleanUrl || !cleanUrl.startsWith('http')) {
    return {
      success: false,
      error: 'Ingresa una URL de proyecto Supabase válida (ejemplo: https://xxxx.supabase.co).',
    };
  }

  if (!cleanKey || cleanKey.length < 20) {
    return {
      success: false,
      error: 'Ingresa una clave SUPABASE ANON PUBLIC KEY válida.',
    };
  }

  try {
    const start = Date.now();
    const client = createSupabaseInstance(cleanUrl, cleanKey);

    const { error } = await client.from('settings').select('key').limit(1);
    const latencyMs = Date.now() - start;

    if (error) {
      const code = (error as any).code || '';
      const msg = error.message || '';
      if (
        code === '42P01' ||
        code === 'PGRST205' ||
        msg.includes('does not exist') ||
        msg.includes('Could not find the table') ||
        msg.includes('schema cache')
      ) {
        return {
          success: false,
          tablesMissing: true,
          latencyMs,
          error:
            'Conectado al servidor de Supabase, pero las tablas aún no existen. Copia el "Script SQL Base" a la derecha, pégalo en el SQL Editor de Supabase y presiona "Run".',
        };
      }

      if (msg.includes('JWT') || msg.includes('Invalid API key') || code === 'PGRST301') {
        return {
          success: false,
          error: 'La clave ANON PUBLIC KEY es inválida o no corresponde a este proyecto de Supabase.',
        };
      }

      return {
        success: false,
        error: `Error de Supabase (${code || 'API'}): ${msg}`,
      };
    }

    if (saveAndActivate) {
      currentConfig = {
        enabled: true,
        url: cleanUrl,
        anonKey: cleanKey,
        connectedAt: currentConfig.connectedAt || new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
      };
      supabaseClient = client;
      persistConfig();
    }

    return {
      success: true,
      latencyMs,
      message: `¡Conexión establecida exitosamente con Supabase PostgreSQL (${latencyMs}ms)! Nube activa y conectada.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'No se pudo conectar con el servidor de Supabase. Verifica tu URL e internet.',
    };
  }
}

export function disconnectSupabase(): { success: boolean; message: string } {
  currentConfig = {
    enabled: false,
    url: '',
    anonKey: '',
  };
  supabaseClient = null;
  persistConfig();
  return {
    success: true,
    message: 'Nube de Supabase desconectada. El sistema ahora opera únicamente con la base de datos local.',
  };
}

// Helper to chunk arrays for batch upserts
function chunkArray<T>(arr: T[], size: number = 200): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Push full local state to Supabase PostgreSQL
export async function pushStateToSupabase(
  state: {
    products: Product[];
    categories: string[];
    customers: Customer[];
    credits: CreditRecord[];
    payables?: PayableRecord[];
    sales: Sale[];
    movements: StockMovement[];
    shifts: CashShift[];
    users: UserAccount[];
    settings: StoreSettings;
  },
  customUrl?: string,
  customKey?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  counts?: {
    products: number;
    sales: number;
    customers: number;
    credits: number;
    shifts: number;
  };
}> {
  const client =
    customUrl && customKey
      ? createSupabaseInstance(customUrl, customKey)
      : supabaseClient;

  if (!client) {
    return {
      success: false,
      error: 'No hay una conexión activa a Supabase. Guarda y prueba tus credenciales primero.',
    };
  }

  try {
    // 1. Settings
    const { error: settingsErr } = await client.from('settings').upsert(
      {
        key: 'current',
        value: state.settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (settingsErr) throw new Error(`Tabla settings: ${settingsErr.message}`);

    // 2. Users
    if (state.users && state.users.length > 0) {
      const userRows = state.users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        pin: u.pin || null,
        updated_at: new Date().toISOString(),
      }));
      const { error: usersErr } = await client.from('users').upsert(userRows, { onConflict: 'id' });
      if (usersErr) throw new Error(`Tabla users: ${usersErr.message}`);
    }

    // 3. Categories
    if (state.categories && state.categories.length > 0) {
      const catRows = state.categories.map((name) => ({ name }));
      const { error: catErr } = await client.from('categories').upsert(catRows, { onConflict: 'name' });
      if (catErr) throw new Error(`Tabla categories: ${catErr.message}`);
    }

    // 4. Products
    if (state.products && state.products.length > 0) {
      const prodRows = state.products.map((p) => ({
        id: p.id,
        barcode: p.barcode || '',
        name: p.name,
        category: p.category || 'Otros',
        cost_price_usd: Number(p.costPriceUSD) || 0,
        sale_price_usd: Number(p.salePriceUSD) || 0,
        stock: Number(p.stock) || 0,
        min_stock: Number(p.minStock) || 0,
        unit: p.unit || 'unidad',
        tax_type: p.taxType || 'exento',
        description: p.description || null,
        created_at: p.createdAt || new Date().toISOString(),
      }));
      for (const chunk of chunkArray(prodRows, 200)) {
        const { error: prodErr } = await client.from('products').upsert(chunk, { onConflict: 'id' });
        if (prodErr) throw new Error(`Tabla products: ${prodErr.message}`);
      }
    }

    // 5. Customers
    if (state.customers && state.customers.length > 0) {
      const custRows = state.customers.map((c) => ({
        id: c.id,
        id_doc_type: c.idDocType || 'V',
        id_doc_number: c.idDocNumber || '',
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        credit_limit_usd: c.creditLimitUSD != null ? Number(c.creditLimitUSD) : null,
        notes: c.notes || null,
        created_at: c.createdAt || new Date().toISOString(),
      }));
      for (const chunk of chunkArray(custRows, 200)) {
        const { error: custErr } = await client.from('customers').upsert(chunk, { onConflict: 'id' });
        if (custErr) throw new Error(`Tabla customers: ${custErr.message}`);
      }
    }

    // 6. Credits
    if (state.credits && state.credits.length > 0) {
      const credRows = state.credits.map((cr) => ({
        id: cr.id,
        customer_id: cr.customerId,
        customer_name: cr.customerName,
        customer_id_doc: cr.customerIdDoc || null,
        customer_phone: cr.customerPhone || null,
        customer_address: cr.customerAddress || null,
        sale_id: cr.saleId || null,
        sale_number: cr.saleNumber || null,
        date: cr.date,
        original_amount_usd: Number(cr.originalAmountUSD) || 0,
        original_amount_bs: Number(cr.originalAmountBs) || 0,
        bcv_rate: Number(cr.bcvRate) || 1,
        current_balance_usd: Number(cr.currentBalanceUSD) || 0,
        status: cr.status || 'pendiente',
        description: cr.description || null,
        notes: cr.notes || null,
        payments: cr.payments || [],
      }));
      for (const chunk of chunkArray(credRows, 200)) {
        const { error: credErr } = await client.from('credits').upsert(chunk, { onConflict: 'id' });
        if (credErr) throw new Error(`Tabla credits: ${credErr.message}`);
      }
    }

    // 7. Payables
    if (state.payables && state.payables.length > 0) {
      const payRows = state.payables.map((py) => ({
        id: py.id,
        supplier_name: py.supplierName,
        supplier_doc: py.supplierDoc || null,
        supplier_phone: py.supplierPhone || null,
        invoice_number: py.invoiceNumber || null,
        description: py.description,
        date: py.date,
        due_date: py.dueDate || null,
        original_amount_usd: Number(py.originalAmountUSD) || 0,
        original_amount_bs: Number(py.originalAmountBs) || 0,
        bcv_rate: Number(py.bcvRate) || 1,
        current_balance_usd: Number(py.currentBalanceUSD) || 0,
        status: py.status || 'pendiente',
        notes: py.notes || null,
        payments: py.payments || [],
      }));
      for (const chunk of chunkArray(payRows, 200)) {
        const { error: payErr } = await client.from('payables').upsert(chunk, { onConflict: 'id' });
        if (payErr) throw new Error(`Tabla payables: ${payErr.message}`);
      }
    }

    // 8. Sales
    if (state.sales && state.sales.length > 0) {
      const saleRows = state.sales.map((s) => ({
        id: s.id,
        sale_number: s.saleNumber,
        date: s.date,
        items: s.items || [],
        bcv_rate: Number(s.bcvRate) || 1,
        subtotal_usd: Number(s.subtotalUSD) || 0,
        discount_usd: Number(s.discountUSD) || 0,
        total_usd: Number(s.totalUSD) || 0,
        total_cost_usd: Number(s.totalCostUSD) || 0,
        profit_usd: Number(s.profitUSD) || 0,
        subtotal_bs: Number(s.subtotalBs) || 0,
        discount_bs: Number(s.discountBs) || 0,
        total_bs: Number(s.totalBs) || 0,
        profit_bs: Number(s.profitBs) || 0,
        exempt_amount_usd: Number(s.exemptAmountUSD) || 0,
        exempt_amount_bs: Number(s.exemptAmountBs) || 0,
        taxable_amount_usd: Number(s.taxableAmountUSD) || 0,
        taxable_amount_bs: Number(s.taxableAmountBs) || 0,
        vat_amount_usd: Number(s.vatAmountUSD) || 0,
        vat_amount_bs: Number(s.vatAmountBs) || 0,
        igtf_amount_usd: Number(s.igtfAmountUSD) || 0,
        igtf_amount_bs: Number(s.igtfAmountBs) || 0,
        payment_method: s.paymentMethod,
        payment_currency: s.paymentCurrency,
        payment_reference: s.paymentReference || null,
        payment_splits: s.paymentSplits || [],
        amount_paid: Number(s.amountPaid) || 0,
        change_bs: Number(s.changeBs) || 0,
        change_usd: Number(s.changeUSD) || 0,
        customer_name: s.customerName || null,
        customer_id_doc: s.customerIdDoc || null,
        customer_phone: s.customerPhone || null,
        customer_address: s.customerAddress || null,
        cashier_name: s.cashierName || null,
        shift_id: s.shiftId || null,
        notes: s.notes || null,
        status: s.status || 'completada',
        cancelled_reason: s.cancelledReason || null,
        cancelled_at: s.cancelledAt || null,
        cancelled_by: s.cancelledBy || null,
      }));
      for (const chunk of chunkArray(saleRows, 150)) {
        const { error: saleErr } = await client.from('sales').upsert(chunk, { onConflict: 'id' });
        if (saleErr) throw new Error(`Tabla sales: ${saleErr.message}`);
      }
    }

    // 9. Movements
    if (state.movements && state.movements.length > 0) {
      const movRows = state.movements.map((m) => ({
        id: m.id,
        product_id: m.productId,
        product_name: m.productName,
        type: m.type,
        quantity: Number(m.quantity) || 0,
        previous_stock: Number(m.previousStock) || 0,
        new_stock: Number(m.newStock) || 0,
        reason: m.reason,
        date: m.date,
      }));
      for (const chunk of chunkArray(movRows, 200)) {
        const { error: movErr } = await client.from('movements').upsert(chunk, { onConflict: 'id' });
        if (movErr) throw new Error(`Tabla movements: ${movErr.message}`);
      }
    }

    // 10. Shifts
    if (state.shifts && state.shifts.length > 0) {
      const shiftRows = state.shifts.map((sh) => ({
        id: sh.id,
        shift_number: Number(sh.shiftNumber) || 1,
        opened_at: sh.openedAt,
        closed_at: sh.closedAt || null,
        opened_by_user_id: sh.openedByUserId,
        opened_by_user_name: sh.openedByUserName,
        closed_by_user_id: sh.closedByUserId || null,
        closed_by_user_name: sh.closedByUserName || null,
        initial_cash_bs: Number(sh.initialCashBs) || 0,
        initial_cash_usd: Number(sh.initialCashUSD) || 0,
        cash_entries: sh.cashEntries || [],
        status: sh.status || 'abierta',
        expected_cash_bs: sh.expectedCashBs != null ? Number(sh.expectedCashBs) : null,
        expected_cash_usd: sh.expectedCashUSD != null ? Number(sh.expectedCashUSD) : null,
        counted_cash_bs: sh.countedCashBs != null ? Number(sh.countedCashBs) : null,
        counted_cash_usd: sh.countedCashUSD != null ? Number(sh.countedCashUSD) : null,
        difference_bs: sh.differenceBs != null ? Number(sh.differenceBs) : null,
        difference_usd: sh.differenceUSD != null ? Number(sh.differenceUSD) : null,
        total_sales_count: sh.totalSalesCount != null ? Number(sh.totalSalesCount) : null,
        total_sales_bs: sh.totalSalesBs != null ? Number(sh.totalSalesBs) : null,
        total_sales_usd: sh.totalSalesUSD != null ? Number(sh.totalSalesUSD) : null,
        payment_summary: sh.paymentSummary || null,
        notes: sh.notes || null,
      }));
      for (const chunk of chunkArray(shiftRows, 150)) {
        const { error: shiftErr } = await client.from('shifts').upsert(chunk, { onConflict: 'id' });
        if (shiftErr) throw new Error(`Tabla shifts: ${shiftErr.message}`);
      }
    }

    currentConfig.lastSyncAt = new Date().toISOString();
    persistConfig();

    return {
      success: true,
      counts: {
        products: state.products.length,
        sales: state.sales.length,
        customers: state.customers.length,
        credits: state.credits.length,
        shifts: state.shifts.length,
      },
      message: `¡Sincronización exitosa hacia Supabase! Se subieron ${state.products.length} productos, ${state.sales.length} ventas, ${state.credits.length} créditos, ${state.shifts.length} turnos y la configuración actual.`,
    };
  } catch (err: any) {
    console.error('[Supabase] Error pushing data:', err);
    return {
      success: false,
      error: err.message || 'Error al subir los datos locales a Supabase.',
    };
  }
}

// Pull full state from Supabase PostgreSQL
export async function pullStateFromSupabase(
  customUrl?: string,
  customKey?: string
): Promise<{
  success: boolean;
  state?: {
    products: Product[];
    categories: string[];
    customers: Customer[];
    credits: CreditRecord[];
    payables: PayableRecord[];
    sales: Sale[];
    movements: StockMovement[];
    shifts: CashShift[];
    currentShift: CashShift | null;
    users: UserAccount[];
    settings: StoreSettings;
  };
  error?: string;
  message?: string;
}> {
  const client =
    customUrl && customKey
      ? createSupabaseInstance(customUrl, customKey)
      : supabaseClient;

  if (!client) {
    return {
      success: false,
      error: 'No hay una conexión activa a Supabase. Guarda y prueba tus credenciales primero.',
    };
  }

  try {
    const [
      settingsRes,
      usersRes,
      categoriesRes,
      productsRes,
      customersRes,
      creditsRes,
      payablesRes,
      salesRes,
      movementsRes,
      shiftsRes,
    ] = await Promise.all([
      client.from('settings').select('*').eq('key', 'current').maybeSingle(),
      client.from('users').select('*'),
      client.from('categories').select('*').order('name', { ascending: true }),
      client.from('products').select('*').order('name', { ascending: true }),
      client.from('customers').select('*').order('name', { ascending: true }),
      client.from('credits').select('*').order('date', { ascending: false }),
      client.from('payables').select('*').order('date', { ascending: false }),
      client.from('sales').select('*').order('date', { ascending: false }),
      client.from('movements').select('*').order('date', { ascending: false }).limit(500),
      client.from('shifts').select('*').order('opened_at', { ascending: false }),
    ]);

    if (productsRes.error) throw new Error(`Error leyendo products: ${productsRes.error.message}`);
    if (salesRes.error) throw new Error(`Error leyendo sales: ${salesRes.error.message}`);

    const settings: StoreSettings = {
      ...DEFAULT_SETTINGS,
      ...(settingsRes.data?.value && typeof settingsRes.data.value === 'object'
        ? settingsRes.data.value
        : {}),
    };

    const users: UserAccount[] =
      usersRes.data && usersRes.data.length > 0
        ? usersRes.data.map((r: any) => ({
            id: String(r.id),
            username: String(r.username),
            name: String(r.name),
            role: (r.role as any) || 'admin',
            pin: r.pin ? String(r.pin) : undefined,
          }))
        : DEFAULT_USERS;

    const categories: string[] =
      categoriesRes.data && categoriesRes.data.length > 0
        ? categoriesRes.data.map((r: any) => String(r.name))
        : DEFAULT_CATEGORIES;

    const products: Product[] = (productsRes.data || []).map((r: any) => ({
      id: String(r.id),
      barcode: String(r.barcode || ''),
      name: String(r.name),
      category: String(r.category || 'Otros'),
      costPriceUSD: Number(r.cost_price_usd) || 0,
      salePriceUSD: Number(r.sale_price_usd) || 0,
      stock: Number(r.stock) || 0,
      minStock: Number(r.min_stock) || 0,
      unit: (r.unit as any) || 'unidad',
      taxType: (r.tax_type as any) || 'exento',
      description: r.description ? String(r.description) : undefined,
      createdAt: String(r.created_at || new Date().toISOString()),
    }));

    const customers: Customer[] = (customersRes.data || []).map((r: any) => ({
      id: String(r.id),
      idDocType: (r.id_doc_type as any) || 'V',
      idDocNumber: String(r.id_doc_number || ''),
      name: String(r.name),
      phone: r.phone ? String(r.phone) : undefined,
      email: r.email ? String(r.email) : undefined,
      address: r.address ? String(r.address) : undefined,
      creditLimitUSD: r.credit_limit_usd != null ? Number(r.credit_limit_usd) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: String(r.created_at || new Date().toISOString()),
    }));

    const credits: CreditRecord[] = (creditsRes.data || []).map((r: any) => ({
      id: String(r.id),
      customerId: String(r.customer_id),
      customerName: String(r.customer_name),
      customerIdDoc: r.customer_id_doc ? String(r.customer_id_doc) : undefined,
      customerPhone: r.customer_phone ? String(r.customer_phone) : undefined,
      customerAddress: r.customer_address ? String(r.customer_address) : undefined,
      saleId: r.sale_id ? String(r.sale_id) : undefined,
      saleNumber: r.sale_number ? String(r.sale_number) : undefined,
      date: String(r.date),
      originalAmountUSD: Number(r.original_amount_usd) || 0,
      originalAmountBs: Number(r.original_amount_bs) || 0,
      bcvRate: Number(r.bcv_rate) || 1,
      currentBalanceUSD: Number(r.current_balance_usd) || 0,
      status: (r.status as any) || 'pendiente',
      description: r.description ? String(r.description) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      payments: Array.isArray(r.payments) ? r.payments : [],
    }));

    const payables: PayableRecord[] = (payablesRes.data || []).map((r: any) => ({
      id: String(r.id),
      supplierName: String(r.supplier_name),
      supplierDoc: r.supplier_doc ? String(r.supplier_doc) : undefined,
      supplierPhone: r.supplier_phone ? String(r.supplier_phone) : undefined,
      invoiceNumber: r.invoice_number ? String(r.invoice_number) : undefined,
      description: String(r.description || ''),
      date: String(r.date),
      dueDate: r.due_date ? String(r.due_date) : undefined,
      originalAmountUSD: Number(r.original_amount_usd) || 0,
      originalAmountBs: Number(r.original_amount_bs) || 0,
      bcvRate: Number(r.bcv_rate) || 1,
      currentBalanceUSD: Number(r.current_balance_usd) || 0,
      status: (r.status as any) || 'pendiente',
      notes: r.notes ? String(r.notes) : undefined,
      payments: Array.isArray(r.payments) ? r.payments : [],
    }));

    const sales: Sale[] = (salesRes.data || []).map((r: any) => ({
      id: String(r.id),
      saleNumber: String(r.sale_number),
      date: String(r.date),
      items: Array.isArray(r.items) ? r.items : [],
      bcvRate: Number(r.bcv_rate) || 1,
      subtotalUSD: Number(r.subtotal_usd) || 0,
      discountUSD: Number(r.discount_usd) || 0,
      totalUSD: Number(r.total_usd) || 0,
      totalCostUSD: Number(r.total_cost_usd) || 0,
      profitUSD: Number(r.profit_usd) || 0,
      subtotalBs: Number(r.subtotal_bs) || 0,
      discountBs: Number(r.discount_bs) || 0,
      totalBs: Number(r.total_bs) || 0,
      profitBs: Number(r.profit_bs) || 0,
      exemptAmountUSD: r.exempt_amount_usd != null ? Number(r.exempt_amount_usd) : undefined,
      exemptAmountBs: r.exempt_amount_bs != null ? Number(r.exempt_amount_bs) : undefined,
      taxableAmountUSD: r.taxable_amount_usd != null ? Number(r.taxable_amount_usd) : undefined,
      taxableAmountBs: r.taxable_amount_bs != null ? Number(r.taxable_amount_bs) : undefined,
      vatAmountUSD: r.vat_amount_usd != null ? Number(r.vat_amount_usd) : undefined,
      vatAmountBs: r.vat_amount_bs != null ? Number(r.vat_amount_bs) : undefined,
      igtfAmountUSD: r.igtf_amount_usd != null ? Number(r.igtf_amount_usd) : undefined,
      igtfAmountBs: r.igtf_amount_bs != null ? Number(r.igtf_amount_bs) : undefined,
      paymentMethod: r.payment_method as any,
      paymentCurrency: r.payment_currency as any,
      paymentReference: r.payment_reference ? String(r.payment_reference) : undefined,
      paymentSplits: Array.isArray(r.payment_splits) && r.payment_splits.length > 0 ? r.payment_splits : undefined,
      amountPaid: Number(r.amount_paid) || 0,
      changeBs: Number(r.change_bs) || 0,
      changeUSD: Number(r.change_usd) || 0,
      customerName: r.customer_name ? String(r.customer_name) : undefined,
      customerIdDoc: r.customer_id_doc ? String(r.customer_id_doc) : undefined,
      customerPhone: r.customer_phone ? String(r.customer_phone) : undefined,
      customerAddress: r.customer_address ? String(r.customer_address) : undefined,
      cashierName: r.cashier_name ? String(r.cashier_name) : undefined,
      shiftId: r.shift_id ? String(r.shift_id) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      status: (r.status as any) || 'completada',
      cancelledReason: r.cancelled_reason ? String(r.cancelled_reason) : undefined,
      cancelledAt: r.cancelled_at ? String(r.cancelled_at) : undefined,
      cancelledBy: r.cancelled_by ? String(r.cancelled_by) : undefined,
    }));

    const movements: StockMovement[] = (movementsRes.data || []).map((r: any) => ({
      id: String(r.id),
      productId: String(r.product_id),
      productName: String(r.product_name),
      type: r.type as any,
      quantity: Number(r.quantity) || 0,
      previousStock: Number(r.previous_stock) || 0,
      newStock: Number(r.new_stock) || 0,
      reason: String(r.reason || ''),
      date: String(r.date),
    }));

    const shifts: CashShift[] = (shiftsRes.data || []).map((r: any) => ({
      id: String(r.id),
      shiftNumber: Number(r.shift_number) || 1,
      openedAt: String(r.opened_at),
      closedAt: r.closed_at ? String(r.closed_at) : undefined,
      openedByUserId: String(r.opened_by_user_id),
      openedByUserName: String(r.opened_by_user_name),
      closedByUserId: r.closed_by_user_id ? String(r.closed_by_user_id) : undefined,
      closedByUserName: r.closed_by_user_name ? String(r.closed_by_user_name) : undefined,
      initialCashBs: Number(r.initial_cash_bs) || 0,
      initialCashUSD: Number(r.initial_cash_usd) || 0,
      cashEntries: Array.isArray(r.cash_entries) ? r.cash_entries : [],
      status: (r.status as any) || 'abierta',
      expectedCashBs: r.expected_cash_bs != null ? Number(r.expected_cash_bs) : undefined,
      expectedCashUSD: r.expected_cash_usd != null ? Number(r.expected_cash_usd) : undefined,
      countedCashBs: r.counted_cash_bs != null ? Number(r.counted_cash_bs) : undefined,
      countedCashUSD: r.counted_cash_usd != null ? Number(r.counted_cash_usd) : undefined,
      differenceBs: r.difference_bs != null ? Number(r.difference_bs) : undefined,
      differenceUSD: r.difference_usd != null ? Number(r.difference_usd) : undefined,
      totalSalesCount: r.total_sales_count != null ? Number(r.total_sales_count) : undefined,
      totalSalesBs: r.total_sales_bs != null ? Number(r.total_sales_bs) : undefined,
      totalSalesUSD: r.total_sales_usd != null ? Number(r.total_sales_usd) : undefined,
      paymentSummary: r.payment_summary && typeof r.payment_summary === 'object' ? r.payment_summary : undefined,
      notes: r.notes ? String(r.notes) : undefined,
    }));

    const currentShift = shifts.find((s) => s.status === 'abierta') || null;

    currentConfig.lastSyncAt = new Date().toISOString();
    persistConfig();

    return {
      success: true,
      state: {
        products,
        categories,
        customers,
        credits,
        payables,
        sales,
        movements,
        shifts,
        currentShift,
        users,
        settings,
      },
      message: `¡Datos descargados desde Supabase! Se sincronizaron ${products.length} productos, ${sales.length} ventas, ${credits.length} créditos y ${shifts.length} turnos.`,
    };
  } catch (err: any) {
    console.error('[Supabase] Error pulling data:', err);
    return {
      success: false,
      error: err.message || 'Error al descargar los datos desde Supabase.',
    };
  }
}

// Delete single record from a Supabase table when deleted locally
export async function deleteFromSupabaseTable(
  table: 'products' | 'categories' | 'credits' | 'payables',
  column: string,
  value: string
) {
  if (!isSupabaseActive() || !supabaseClient) return;
  try {
    await supabaseClient.from(table).delete().eq(column, value);
    currentConfig.lastSyncAt = new Date().toISOString();
  } catch (err) {
    console.warn(`[Supabase] Failed to delete from ${table}:`, err);
  }
}

// Wipe all records in Supabase when user resets database to zero
export async function wipeSupabaseDatabase() {
  if (!isSupabaseActive() || !supabaseClient) return;
  try {
    await Promise.all([
      supabaseClient.from('products').delete().neq('id', '__none__'),
      supabaseClient.from('sales').delete().neq('id', '__none__'),
      supabaseClient.from('movements').delete().neq('id', '__none__'),
      supabaseClient.from('customers').delete().neq('id', '__none__'),
      supabaseClient.from('credits').delete().neq('id', '__none__'),
      supabaseClient.from('payables').delete().neq('id', '__none__'),
      supabaseClient.from('shifts').delete().neq('id', '__none__'),
    ]);
    currentConfig.lastSyncAt = new Date().toISOString();
  } catch (err) {
    console.warn('[Supabase] Error wiping tables on reset:', err);
  }
}
