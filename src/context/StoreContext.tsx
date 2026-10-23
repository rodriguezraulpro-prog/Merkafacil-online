import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Product, 
  Sale, 
  StockMovement, 
  StoreSettings, 
  CartItem, 
  ActiveTab, 
  PaymentMethod, 
  PaymentSplit, 
  Customer, 
  UserAccount, 
  CashShift, 
  CashDrawerMovement,
  CreditRecord,
  CreditPayment,
  PayableRecord,
  PayablePayment,
  ConfirmedSaleNotice
} from '../types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_SALES, 
  INITIAL_MOVEMENTS, 
  INITIAL_SETTINGS, 
  INITIAL_CATEGORIES, 
  INITIAL_CUSTOMERS, 
  INITIAL_USERS,
  INITIAL_CREDITS 
} from '../data/initialData';
import { api } from '../services/api';
import {
  subscribeToSupabaseRealtime,
  isBrowserSupabaseActive,
  getBrowserSupabaseConfig,
} from '../services/supabaseBrowser';

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  settings: StoreSettings;
  categories: string[];
  customers: Customer[];
  cart: CartItem[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedReceiptSale: Sale | null;
  setSelectedReceiptSale: (sale: Sale | null) => void;
  pendingReceiptSale: Sale | null;
  setPendingReceiptSale: (sale: Sale | null) => void;
  confirmedSaleNotice: ConfirmedSaleNotice | null;
  setConfirmedSaleNotice: (notice: ConfirmedSaleNotice | null) => void;
  dismissConfirmedSaleNotice: () => void;
  
  // Security & Users
  users: UserAccount[];
  currentUser: UserAccount | null;
  login: (userId: string, pinOrPassword?: string) => { success: boolean; error?: string };
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  verifyAdminPassword: (password: string) => boolean;
  updateUserPin: (userId: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  changePasswordOrPin: (params: {
    currentPasswordOrPin: string;
    newPassword?: string;
    newPin?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetCredentialsWithMasterSupportKey: (masterKey: string) => Promise<{ success: boolean; error?: string }>;

  // Settings Module Protection
  isSettingsUnlocked: boolean;
  isSettingsAuthModalOpen: boolean;
  setIsSettingsAuthModalOpen: (open: boolean) => void;
  unlockSettings: (password: string) => { success: boolean; error?: string };
  lockSettings: () => void;

  // Supervisor Authorization Modal
  isSupervisorAuthOpen: boolean;
  supervisorActionInfo: { title: string; description?: string; actionType?: string } | null;
  requestSupervisorAuth: (config: { title: string; description?: string; actionType?: string; onAuthorized: () => void }) => void;
  confirmSupervisorAuth: (password: string) => boolean;
  closeSupervisorAuth: () => void;

  // Shift & Cash Drawer Management
  shifts: CashShift[];
  currentShift: CashShift | null;
  isShiftModalOpen: boolean;
  setIsShiftModalOpen: (open: boolean) => void;
  openShift: (params: { initialCashBs: number; initialCashUSD: number; notes?: string }) => { success: boolean; error?: string };
  closeShift: (params: { countedCashBs: number; countedCashUSD: number; notes?: string }) => { success: boolean; shift?: CashShift; error?: string };
  addCashMovement: (params: { type: 'ingreso' | 'egreso'; currency: 'Bs.' | '$'; amount: number; reason: string }) => { success: boolean; error?: string };
  currentShiftCashBs: number;
  currentShiftCashUSD: number;
  selectedReceiptShift: CashShift | null;
  setSelectedReceiptShift: (shift: CashShift | null) => void;
  
  // BCV Rate and Currency helpers
  bcvRate: number;
  updateBcvRate: (newRate: number) => void;
  syncBcvRateOnline: () => Promise<{ success: boolean; rate?: number; error?: string; message?: string }>;
  isSyncingBcv: boolean;
  bcvSyncStatus: { lastChecked?: string; error?: string } | null;
  formatUSD: (amount: number) => string;
  formatBs: (amount: number) => string;
  usdToBs: (amountUSD: number) => number;
  bsToUSD: (amountBs: number) => number;

  // Cart Actions
  addToCart: (product: Product, quantity?: number) => boolean;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotalUSD: number;
  cartTotalBs: number;
  cartItemCount: number;

  // Customer Actions
  findCustomerByIdDoc: (docNumber: string, docType?: string) => Customer | undefined;
  addOrUpdateCustomer: (customer: { idDocType: 'V' | 'E' | 'J' | 'G'; idDocNumber: string; name: string; phone?: string; address?: string }) => Customer;

  // Credits & Fiados Management
  credits: CreditRecord[];
  addCreditRecord: (creditData: {
    customerId: string;
    customerName: string;
    customerIdDoc?: string;
    customerPhone?: string;
    customerAddress?: string;
    originalAmountUSD: number;
    description: string;
    notes?: string;
  }) => CreditRecord;
  addCreditPayment: (creditRecordId: string, paymentData: {
    amountPaid: number;
    currency: 'Bs.' | '$';
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    notes?: string;
    registerInCashDrawer?: boolean;
  }) => { success: boolean; error?: string; payment?: CreditPayment };
  deleteCreditRecord: (id: string) => void;
  updateCustomerCreditLimit: (customerId: string, limitUSD?: number) => void;
  getCustomerDebtSummary: (customerIdOrDoc: string) => { totalDebtUSD: number; totalDebtBs: number; activeCreditsCount: number };
  totalPendingDebtUSD: number;
  totalPendingDebtBs: number;
  totalDebtorsCount: number;

  // Payables & Cuentas por Pagar (Proveedores)
  payables: PayableRecord[];
  addPayableRecord: (payableData: {
    supplierName: string;
    supplierDoc?: string;
    supplierPhone?: string;
    invoiceNumber?: string;
    description: string;
    originalAmountUSD: number;
    dueDate?: string;
    notes?: string;
  }) => PayableRecord;
  addPayablePayment: (
    payableId: string,
    paymentData: {
      amountPaid: number;
      currency: 'Bs.' | '$';
      paymentMethod: PaymentMethod;
      paymentReference?: string;
      notes?: string;
    }
  ) => { success: boolean; error?: string; payment?: PayablePayment };
  deletePayableRecord: (id: string) => void;
  totalPendingPayableUSD: number;
  totalPendingPayableBs: number;
  totalPayablesCount: number;

  // Sales Actions
  completeSale: (params: {
    paymentMethod: PaymentMethod;
    paymentCurrency: 'Bs.' | '$' | 'Mixto';
    amountPaid: number;
    paymentReference?: string;
    paymentSplits?: PaymentSplit[];
    customerName?: string;
    customerIdDoc?: string;
    customerPhone?: string;
    customerAddress?: string;
    notes?: string;
    discountUSD?: number;
    igtfAmountUSD?: number;
    igtfAmountBs?: number;
  }) => { success: boolean; sale?: Sale; error?: string };
  cancelSale: (saleId: string, reason?: string, cancelledBy?: string) => boolean;

  // Inventory Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  restockProduct: (productId: string, quantityToAdd: number, reason?: string) => void;
  adjustStock: (productId: string, newStock: number, reason: string) => void;

  // Category Actions
  addCategory: (name: string) => { success: boolean; error?: string };
  updateCategory: (oldName: string, newName: string) => { success: boolean; error?: string };
  deleteCategory: (name: string) => { success: boolean; affectedProducts: number };

  // Store Settings & Reset
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  resetToSampleData: () => void;

  // Status Metrics
  lowStockCount: number;
  outOfStockCount: number;
  todaySalesCount: number;
  todaySalesTotalBs: number;
  todaySalesTotalUSD: number;

  // Database Connection Info & Online Status
  isDbConnected: boolean;
  isDbLoading: boolean;
  isOnline: boolean;
  serverLatencyMs: number | null;
  refreshState: () => Promise<void>;
  restoreBackupData: (data: any) => Promise<{ success: boolean; error?: string }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Master Support Key Validator for Technical Emergency Recovery
export const isMasterSupportKey = (key: string): boolean => {
  const trimmed = (key || '').trim().toLowerCase();
  return (
    trimmed === 'soporte@merkafacil' ||
    trimmed === 'soporte412462' ||
    trimmed === 'merkafacil2026!' ||
    trimmed === 'soporte2026'
  );
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // DB status & Online connectivity
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [serverLatencyMs, setServerLatencyMs] = useState<number | null>(null);

  // Users & Auth
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);

  // Settings Module Protection State
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [isSettingsAuthModalOpen, setIsSettingsAuthModalOpen] = useState(false);

  // Supervisor Password / Authorization State
  const [isSupervisorAuthOpen, setIsSupervisorAuthOpen] = useState(false);
  const [supervisorActionInfo, setSupervisorActionInfo] = useState<{ title: string; description?: string; actionType?: string } | null>(null);
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);

  // Shifts & Cash Drawer
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedReceiptShift, setSelectedReceiptShift] = useState<CashShift | null>(null);

  // Core Store Data (starts from 0 demo data)
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [credits, setCredits] = useState<CreditRecord[]>(INITIAL_CREDITS);
  const [payables, setPayables] = useState<PayableRecord[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [movements, setMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [pendingReceiptSale, setPendingReceiptSale] = useState<Sale | null>(null);
  const [confirmedSaleNotice, setConfirmedSaleNotice] = useState<ConfirmedSaleNotice | null>(null);
  const [isSyncingBcv, setIsSyncingBcv] = useState(false);
  const [bcvSyncStatus, setBcvSyncStatus] = useState<{ lastChecked?: string; error?: string } | null>(null);

  const dismissConfirmedSaleNotice = useCallback(() => {
    setConfirmedSaleNotice(null);
  }, []);

  // Initial load from SQLite database on the server
  useEffect(() => {
    // Clear legacy localStorage demo keys so client starts clean from SQLite
    const legacyKeys = [
      'bodega_app_products_v2',
      'bodega_app_sales_v2',
      'bodega_app_movements_v2',
      'bodega_app_settings_v2',
      'bodega_app_categories_v2',
      'bodega_app_customers_v2',
      'bodega_app_credits_v2',
      'bodega_app_users_v2',
      'bodega_app_shifts_v2',
      'bodega_app_current_shift_v2',
    ];
    legacyKeys.forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });

    loadStateFromSqlite();
  }, []);

  const loadStateFromSqlite = useCallback(async () => {
    try {
      setIsDbLoading(true);
      const state = await api.getState();
      setProducts(state.products || []);
      setCategories(state.categories || INITIAL_CATEGORIES);
      setCustomers(state.customers || []);
      setCredits(state.credits || []);
      setPayables(state.payables || []);
      setSales(state.sales || []);
      setMovements(state.movements || []);
      setShifts(state.shifts || []);
      setCurrentShift(state.currentShift || null);
      if (state.settings) {
        setSettings(state.settings);
      }
      if (state.users && state.users.length > 0) {
        setUsers(state.users);
        // Verificar si existe una sesión activa y válida en sessionStorage
        try {
          const savedSessionUserId = sessionStorage.getItem('merkafacil_session_user_id');
          if (savedSessionUserId) {
            const matchedUser = state.users.find(u => u.id === savedSessionUserId);
            if (matchedUser) {
              setCurrentUser(matchedUser);
              setIsLoginModalOpen(false);
            } else {
              setCurrentUser(null);
              setIsLoginModalOpen(true);
            }
          } else {
            setCurrentUser(null);
            setIsLoginModalOpen(true);
          }
        } catch (_) {
          setCurrentUser(null);
          setIsLoginModalOpen(true);
        }
      } else {
        setCurrentUser(null);
        setIsLoginModalOpen(true);
      }
      setIsDbConnected(true);
      setIsOnline(true);
    } catch (err) {
      console.warn('Could not load SQLite state, running in local memory mode:', err);
      setIsDbConnected(false);
    } finally {
      setIsDbLoading(false);
    }
  }, []);

  const refreshState = useCallback(async () => {
    await loadStateFromSqlite();
  }, [loadStateFromSqlite]);

  // Silent refresh that updates state in the background without screen flicker
  const silentRefreshState = useCallback(async () => {
    try {
      const state = await api.getState();
      setProducts(state.products || []);
      setCategories(state.categories || INITIAL_CATEGORIES);
      setCustomers(state.customers || []);
      setCredits(state.credits || []);
      setPayables(state.payables || []);
      setSales(state.sales || []);
      setMovements(state.movements || []);
      setShifts(state.shifts || []);
      setCurrentShift(state.currentShift || null);
      if (state.settings) {
        setSettings(prev => ({ ...prev, ...state.settings }));
      }
      if (state.users && state.users.length > 0) {
        setUsers(state.users);
      }
      setIsDbConnected(true);
      setIsOnline(true);
    } catch (err) {
      console.warn('[Sync] Silent refresh warning:', err);
    }
  }, []);

  // Multi-Device Realtime synchronization: Listen to Supabase postgres_changes + polling + focus
  useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null;
    let isMounted = true;

    const setupRealtime = () => {
      if (isBrowserSupabaseActive()) {
        try {
          unsubscribeRealtime = subscribeToSupabaseRealtime((table) => {
            if (!isMounted) return;
            console.log(`[Realtime Sync] Evento recibido en tabla: ${table || 'db'}, actualizando...`);
            silentRefreshState();
          });
        } catch (e) {
          console.warn('[Realtime Sync] Could not subscribe:', e);
        }
      }
    };

    setupRealtime();

    // Polling fallback every 6 seconds to ensure data is always fresh between PC and mobile
    const pollTimer = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
        silentRefreshState();
      }
    }, 6000);

    // Immediate sync when user focuses the window or switches tabs / unlocks phone
    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
        silentRefreshState();
      }
    };

    window.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);

    return () => {
      isMounted = false;
      if (unsubscribeRealtime) unsubscribeRealtime();
      clearInterval(pollTimer);
      window.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, [silentRefreshState]);

  // Heartbeat to monitor online status and latency
  const checkOnlineHeartbeat = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setServerLatencyMs(null);
      return;
    }
    const start = Date.now();
    try {
      await api.getOnlineStatus();
      const latency = Date.now() - start;
      setServerLatencyMs(latency);
      setIsOnline(true);
      setIsDbConnected(true);
    } catch {
      setIsOnline(false);
      setServerLatencyMs(null);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkOnlineHeartbeat();
      loadStateFromSqlite();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setServerLatencyMs(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkOnlineHeartbeat();
    const interval = setInterval(checkOnlineHeartbeat, 25000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkOnlineHeartbeat, loadStateFromSqlite]);

  const restoreBackupData = async (data: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.restoreBackup(data);
      if (!res.success) {
        return { success: false, error: res.error || 'Error al restaurar respaldo en el servidor' };
      }
      if (res.state) {
        setProducts(res.state.products || []);
        setCategories(res.state.categories || INITIAL_CATEGORIES);
        setCustomers(res.state.customers || []);
        setCredits(res.state.credits || []);
        setPayables(res.state.payables || []);
        setSales(res.state.sales || []);
        setMovements(res.state.movements || []);
        setShifts(res.state.shifts || []);
        setCurrentShift(res.state.currentShift || null);
        if (res.state.settings) {
          setSettings(res.state.settings);
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error inesperado al restaurar' };
    }
  };

  // Auth Methods
  const login = (userId: string, pinOrPassword?: string): { success: boolean; error?: string } => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Usuario no encontrado en el sistema.' };

    if (user.role === 'admin') {
      const masterPassword = settings.adminPassword || 'admin123';
      const isSupportKey = isMasterSupportKey(pinOrPassword || '');
      if (!isSupportKey && pinOrPassword && pinOrPassword.trim() !== masterPassword.trim() && pinOrPassword.trim() !== (user.pin || '')) {
        return { success: false, error: 'Contraseña de Administrador incorrecta.' };
      }
    } else if (user.pin && pinOrPassword) {
      if (!isMasterSupportKey(pinOrPassword) && pinOrPassword.trim() !== user.pin.trim()) {
        return { success: false, error: 'PIN de acceso incorrecto.' };
      }
    }

    setCurrentUser(user);
    setIsLoginModalOpen(false);
    try {
      sessionStorage.setItem('merkafacil_session_user_id', user.id);
    } catch (_) {}
    return { success: true };
  };

  const logout = () => {
    setIsSettingsUnlocked(false);
    setIsSettingsAuthModalOpen(false);
    setCurrentUser(null);
    setIsLoginModalOpen(true);
    try {
      sessionStorage.removeItem('merkafacil_session_user_id');
    } catch (_) {}
  };

  const verifyAdminPassword = (password: string): boolean => {
    const trimmed = (password || '').trim();
    if (isMasterSupportKey(trimmed)) return true;
    const masterPassword = settings.adminPassword || 'admin123';
    if (trimmed === masterPassword.trim()) return true;
    if (users.some(u => u.role === 'admin' && ((u.pin && u.pin.trim() === trimmed) || ((u as any).password && (u as any).password.trim() === trimmed)))) {
      return true;
    }
    return false;
  };

  const updateUserPin = async (userId: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanPin = newPin.trim();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, pin: cleanPin } : u));
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, pin: cleanPin } : null);
      }
      const res = await api.updateUserPin(userId, cleanPin);
      return res;
    } catch (err: any) {
      console.error('Error updating user pin', err);
      return { success: false, error: err.message || 'Error al guardar el PIN en la base de datos' };
    }
  };

  const changePasswordOrPin = async (params: {
    currentPasswordOrPin: string;
    newPassword?: string;
    newPin?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const masterPassword = settings.adminPassword || 'admin123';
    const adminUser = users.find(u => u.role === 'admin') || users[0];
    const currentPin = adminUser?.pin || '1234';

    const inputVerify = params.currentPasswordOrPin.trim();
    const isMasterValid = inputVerify === masterPassword.trim();
    const isPinValid = inputVerify === currentPin.trim();

    if (!isMasterValid && !isPinValid) {
      return { success: false, error: 'La contraseña o PIN actual ingresado no coincide con el registrado en el sistema.' };
    }

    if (params.newPassword !== undefined) {
      const trimmedPass = params.newPassword.trim();
      if (!trimmedPass || trimmedPass.length < 4) {
        return { success: false, error: 'La nueva contraseña debe contener al menos 4 caracteres.' };
      }
      const updated = { ...settings, adminPassword: trimmedPass };
      setSettings(updated);
      await api.updateSettings(updated).catch(err => console.error('Error saving updated admin password', err));
    }

    if (params.newPin !== undefined) {
      const trimmedPin = params.newPin.trim();
      if (!/^\d{4,6}$/.test(trimmedPin)) {
        return { success: false, error: 'El nuevo PIN debe tener entre 4 y 6 dígitos numéricos.' };
      }
      if (adminUser) {
        await updateUserPin(adminUser.id, trimmedPin);
      }
    }

    return { success: true };
  };

  const resetCredentialsWithMasterSupportKey = async (masterKey: string): Promise<{ success: boolean; error?: string }> => {
    if (!isMasterSupportKey(masterKey)) {
      return { 
        success: false, 
        error: 'Clave Maestra de Soporte no válida. Verifique el código con el soporte técnico (+58 412-4623396).' 
      };
    }

    try {
      const updatedSettings = { ...settings, adminPassword: 'admin123' };
      setSettings(updatedSettings);
      await api.updateSettings(updatedSettings).catch(err => console.error('Error reset master pass', err));

      const adminUser = users.find(u => u.role === 'admin') || users[0];
      if (adminUser) {
        setUsers(prev => prev.map(u => u.id === adminUser.id ? { ...u, pin: '1234' } : u));
        await api.updateUserPin(adminUser.id, '1234').catch(err => console.error('Error reset master pin', err));
        setCurrentUser({ ...adminUser, pin: '1234' });
      }

      setIsLoginModalOpen(false);
      setIsSettingsUnlocked(true);
      return { success: true };
    } catch (err: any) {
      console.error('Error resetting credentials with master key', err);
      return { success: false, error: err.message || 'Error al restablecer credenciales en la base de datos.' };
    }
  };

  const [pendingProtectedTab, setPendingProtectedTab] = useState<ActiveTab>('ajustes');

  // Settings & Database Module Protection Methods
  const unlockSettings = (password: string): { success: boolean; error?: string } => {
    if (verifyAdminPassword(password)) {
      setIsSettingsUnlocked(true);
      setIsSettingsAuthModalOpen(false);
      setActiveTab(pendingProtectedTab || 'ajustes');
      return { success: true };
    }
    return { success: false, error: 'Contraseña de Administrador incorrecta.' };
  };

  const lockSettings = () => {
    setIsSettingsUnlocked(false);
    setIsSettingsAuthModalOpen(false);
    if (activeTab === 'ajustes' || activeTab === 'supabase') {
      setActiveTab('pos');
    }
  };

  const handleSetActiveTab = (tab: ActiveTab) => {
    const isProtected = tab === 'ajustes' || tab === 'supabase';
    if (isProtected && !isSettingsUnlocked) {
      setPendingProtectedTab(tab);
      setIsSettingsAuthModalOpen(true);
      return;
    }
    if ((activeTab === 'ajustes' || activeTab === 'supabase') && !isProtected) {
      setIsSettingsUnlocked(false);
    }
    setActiveTab(tab);
  };

  // Supervisor Authorization
  const requestSupervisorAuth = (config: {
    title: string;
    description?: string;
    actionType?: string;
    onAuthorized: () => void;
  }) => {
    if (settings.requireSupervisorPasswordForChanges === false) {
      config.onAuthorized();
      return;
    }

    setSupervisorActionInfo({
      title: config.title,
      description: config.description,
      actionType: config.actionType,
    });
    setPendingAuthAction(() => config.onAuthorized);
    setIsSupervisorAuthOpen(true);
  };

  const confirmSupervisorAuth = (password: string): boolean => {
    if (verifyAdminPassword(password)) {
      if (pendingAuthAction) {
        pendingAuthAction();
      }
      setIsSupervisorAuthOpen(false);
      setPendingAuthAction(null);
      setSupervisorActionInfo(null);
      return true;
    }
    return false;
  };

  const closeSupervisorAuth = () => {
    setIsSupervisorAuthOpen(false);
    setPendingAuthAction(null);
    setSupervisorActionInfo(null);
  };

  // Shifts & Cash Drawer Methods
  const openShift = (params: { initialCashBs: number; initialCashUSD: number; notes?: string }): { success: boolean; error?: string } => {
    if (currentShift && currentShift.status === 'abierta') {
      return { success: false, error: 'Ya existe un turno de caja activo.' };
    }

    const nextShiftNum = shifts.length + 1;
    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      shiftNumber: nextShiftNum,
      openedAt: new Date().toISOString(),
      openedByUserId: currentUser?.id || 'user-admin',
      openedByUserName: currentUser?.name || 'Administrador',
      initialCashBs: Number(params.initialCashBs) || 0,
      initialCashUSD: Number(params.initialCashUSD) || 0,
      cashEntries: [],
      status: 'abierta',
      notes: params.notes?.trim() || undefined,
    };

    setCurrentShift(newShift);
    setShifts(prev => [newShift, ...prev]);

    // Persist to SQLite
    api.openShift({
      userId: currentUser?.id || 'user-admin',
      userName: currentUser?.name || 'Administrador',
      initialCashBs: Number(params.initialCashBs) || 0,
      initialCashUSD: Number(params.initialCashUSD) || 0,
      notes: params.notes,
    }).catch(err => console.error('SQLite openShift sync error', err));

    return { success: true };
  };

  const addCashMovement = (params: {
    type: 'ingreso' | 'egreso';
    currency: 'Bs.' | '$';
    amount: number;
    reason: string;
  }): { success: boolean; error?: string } => {
    if (!currentShift || currentShift.status !== 'abierta') {
      return { success: false, error: 'Debe haber un turno de caja abierto para registrar movimientos.' };
    }
    const val = Number(params.amount);
    if (!val || val <= 0) {
      return { success: false, error: 'El monto ingresado debe ser mayor a 0.' };
    }
    if (!params.reason.trim()) {
      return { success: false, error: 'Indique el motivo del ingreso o egreso de caja.' };
    }

    const movement: CashDrawerMovement = {
      id: `cmov-${Date.now()}`,
      type: params.type,
      currency: params.currency,
      amount: val,
      reason: params.reason.trim(),
      timestamp: new Date().toISOString(),
      performedBy: currentUser?.name || 'Cajero de Turno',
    };

    const updated: CashShift = {
      ...currentShift,
      cashEntries: [...currentShift.cashEntries, movement],
    };

    setCurrentShift(updated);
    setShifts(prev => prev.map(s => s.id === updated.id ? updated : s));

    // Persist to SQLite
    api.addCashMovementToShift(currentShift.id, {
      type: params.type,
      currency: params.currency,
      amount: val,
      reason: params.reason.trim(),
      performedBy: currentUser?.name || 'Cajero de Turno',
    }).catch(err => console.error('SQLite addCashMovement sync error', err));

    return { success: true };
  };

  // Real-time live drawer cash balance for current shift
  const currentShiftCashBs = (() => {
    if (!currentShift) return 0;
    const shiftSales = sales.filter(
      s => s.status === 'completada' && (s.shiftId === currentShift.id || s.date >= currentShift.openedAt)
    );
    let cashBs = 0;
    shiftSales.forEach(s => {
      if (s.paymentSplits && s.paymentSplits.length > 0) {
        s.paymentSplits.forEach(sp => {
          if (sp.method === 'efectivo_bs') cashBs += sp.amountBs;
        });
      } else if (s.paymentMethod === 'efectivo_bs') {
        cashBs += s.totalBs;
      }
    });

    let manualBs = 0;
    currentShift.cashEntries?.forEach(e => {
      if (e.currency === 'Bs.') {
        manualBs += (e.type === 'ingreso' ? 1 : -1) * e.amount;
      }
    });

    return currentShift.initialCashBs + cashBs + manualBs;
  })();

  const currentShiftCashUSD = (() => {
    if (!currentShift) return 0;
    const shiftSales = sales.filter(
      s => s.status === 'completada' && (s.shiftId === currentShift.id || s.date >= currentShift.openedAt)
    );
    let cashUSD = 0;
    shiftSales.forEach(s => {
      if (s.paymentSplits && s.paymentSplits.length > 0) {
        s.paymentSplits.forEach(sp => {
          if (sp.method === 'efectivo_usd') cashUSD += sp.amountUSD;
        });
      } else if (s.paymentMethod === 'efectivo_usd') {
        cashUSD += s.totalUSD;
      }
    });

    let manualUSD = 0;
    currentShift.cashEntries?.forEach(e => {
      if (e.currency === '$') {
        manualUSD += (e.type === 'ingreso' ? 1 : -1) * e.amount;
      }
    });

    return currentShift.initialCashUSD + cashUSD + manualUSD;
  })();

  const closeShift = (params: { 
    countedCashBs: number; 
    countedCashUSD: number; 
    notes?: string 
  }): { success: boolean; shift?: CashShift; error?: string } => {
    if (!currentShift || currentShift.status !== 'abierta') {
      return { success: false, error: 'No hay ningún turno de caja abierto para cerrar.' };
    }

    const shiftSales = sales.filter(
      s => s.status === 'completada' && (s.shiftId === currentShift.id || s.date >= currentShift.openedAt)
    );

    let totalSalesBs = 0;
    let totalSalesUSD = 0;
    const paymentSummary = {
      efectivoBs: 0,
      efectivoUSD: 0,
      pagoMovilBs: 0,
      puntoDebitoBs: 0,
      transferenciaBs: 0,
      fiadoBs: 0,
      fiadoUSD: 0,
    };

    shiftSales.forEach(s => {
      totalSalesBs += s.totalBs;
      totalSalesUSD += s.totalUSD;

      if (s.paymentSplits && s.paymentSplits.length > 0) {
        s.paymentSplits.forEach(sp => {
          if (sp.method === 'efectivo_bs') paymentSummary.efectivoBs += sp.amountBs;
          else if (sp.method === 'efectivo_usd') paymentSummary.efectivoUSD += sp.amountUSD;
          else if (sp.method === 'pago_movil') paymentSummary.pagoMovilBs += sp.amountBs;
          else if (sp.method === 'punto_debito') paymentSummary.puntoDebitoBs += sp.amountBs;
          else if (sp.method === 'transferencia') paymentSummary.transferenciaBs += sp.amountBs;
          else if (sp.method === 'fiado') {
            paymentSummary.fiadoBs += sp.amountBs;
            paymentSummary.fiadoUSD += sp.amountUSD;
          }
        });
      } else {
        if (s.paymentMethod === 'efectivo_bs') paymentSummary.efectivoBs += (s.amountPaid - (s.changeBs || 0));
        else if (s.paymentMethod === 'efectivo_usd') paymentSummary.efectivoUSD += (s.amountPaid - (s.changeUSD || 0));
        else if (s.paymentMethod === 'pago_movil') paymentSummary.pagoMovilBs += s.totalBs;
        else if (s.paymentMethod === 'punto_debito') paymentSummary.puntoDebitoBs += s.totalBs;
        else if (s.paymentMethod === 'transferencia') paymentSummary.transferenciaBs += s.totalBs;
        else if (s.paymentMethod === 'fiado') {
          paymentSummary.fiadoBs += s.totalBs;
          paymentSummary.fiadoUSD += s.totalUSD;
        }
      }
    });

    const expectedCashBs = currentShiftCashBs;
    const expectedCashUSD = currentShiftCashUSD;
    const differenceBs = params.countedCashBs - expectedCashBs;
    const differenceUSD = params.countedCashUSD - expectedCashUSD;

    const closedShiftRecord: CashShift = {
      ...currentShift,
      closedAt: new Date().toISOString(),
      closedByUserId: currentUser?.id,
      closedByUserName: currentUser?.name || 'Administrador',
      status: 'cerrada',
      expectedCashBs,
      expectedCashUSD,
      countedCashBs: params.countedCashBs,
      countedCashUSD: params.countedCashUSD,
      differenceBs,
      differenceUSD,
      totalSalesCount: shiftSales.length,
      totalSalesBs,
      totalSalesUSD,
      paymentSummary,
      notes: params.notes?.trim() || currentShift.notes,
    };

    setShifts(prev => prev.map(s => s.id === currentShift.id ? closedShiftRecord : s));
    setCurrentShift(null);
    setSelectedReceiptShift(closedShiftRecord);

    // Persist to SQLite
    api.closeShift({
      shiftId: currentShift.id,
      userId: currentUser?.id || 'user-admin',
      userName: currentUser?.name || 'Administrador',
      countedCashBs: params.countedCashBs,
      countedCashUSD: params.countedCashUSD,
      notes: params.notes,
    }).catch(err => console.error('SQLite closeShift sync error', err));

    return { success: true, shift: closedShiftRecord };
  };

  // Currency helpers
  const bcvRate = settings.bcvRate || 54.50;

  const syncBcvRateOnline = useCallback(async (): Promise<{ success: boolean; rate?: number; error?: string; message?: string }> => {
    setIsSyncingBcv(true);
    setBcvSyncStatus(null);
    try {
      const res = await api.syncBcvRate();
      if (res.success && res.rate) {
        setSettings(prev => ({
          ...prev,
          bcvRate: res.rate!,
          bcvLastUpdated: new Date().toISOString(),
          bcvOfficialDate: res.officialDate,
          bcvSource: res.source,
          ...(res.updatedSettings || {}),
        }));
        setBcvSyncStatus({ lastChecked: new Date().toISOString() });
        setIsSyncingBcv(false);
        return {
          success: true,
          rate: res.rate,
          message: `Tasa BCV actualizada a Bs. ${res.rate.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
        };
      } else {
        const errorMsg = res.error || "No se pudo conectar al servicio BCV por internet";
        setBcvSyncStatus({ error: errorMsg, lastChecked: new Date().toISOString() });
        setIsSyncingBcv(false);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err.message || "Error de conexión al obtener tasa BCV";
      setBcvSyncStatus({ error: errorMsg, lastChecked: new Date().toISOString() });
      setIsSyncingBcv(false);
      return { success: false, error: errorMsg };
    }
  }, []);

  // Auto-sync BCV when app starts if enabled
  useEffect(() => {
    if (settings.autoUpdateBcv !== false && navigator.onLine) {
      const timer = setTimeout(() => {
        syncBcvRateOnline().catch(() => {});
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [settings.autoUpdateBcv, syncBcvRateOnline]);

  const updateBcvRate = (newRate: number) => {
    if (newRate > 0) {
      const bcvLastUpdated = new Date().toISOString();
      setSettings(prev => ({
        ...prev,
        bcvRate: newRate,
        bcvLastUpdated,
      }));
      api.updateSettings({ bcvRate: newRate, bcvLastUpdated }).catch(err =>
        console.error('SQLite updateSettings sync error', err)
      );
    }
  };

  const formatUSD = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }, []);

  const formatBs = useCallback((amount: number): string => {
    return `Bs. ${new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0)}`;
  }, []);

  const usdToBs = useCallback((amountUSD: number): number => {
    return (amountUSD || 0) * bcvRate;
  }, [bcvRate]);

  const bsToUSD = useCallback((amountBs: number): number => {
    return bcvRate > 0 ? (amountBs || 0) / bcvRate : 0;
  }, [bcvRate]);

  // Cart Management
  const addToCart = (product: Product, quantity = 1): boolean => {
    const existing = cart.find(item => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const requestedQty = currentQty + quantity;

    if (requestedQty > product.stock) {
      return false;
    }

    if (existing) {
      setCart(prev =>
        prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: requestedQty,
                subtotalUSD: requestedQty * item.unitPriceUSD,
              }
            : item
        )
      );
    } else {
      setCart(prev => [
        ...prev,
        {
          product,
          quantity,
          unitPriceUSD: product.salePriceUSD,
          subtotalUSD: quantity * product.salePriceUSD,
        },
      ]);
    }
    return true;
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const safeQty = Math.min(quantity, item.product.stock);

    setCart(prev =>
      prev.map(i =>
        i.product.id === productId
          ? {
              ...i,
              quantity: safeQty,
              subtotalUSD: safeQty * i.unitPriceUSD,
            }
          : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotalUSD = cart.reduce((sum, item) => sum + item.subtotalUSD, 0);
  const cartTotalBs = cartTotalUSD * bcvRate;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Customer Management
  const findCustomerByIdDoc = (docNumber: string, docType = 'V'): Customer | undefined => {
    const cleanDoc = docNumber.trim().toUpperCase();
    return customers.find(c => {
      if (c.idDocNumber === cleanDoc) {
        return !docType || c.idDocType === docType;
      }
      const fullDoc = `${c.idDocType}-${c.idDocNumber}`;
      return fullDoc === cleanDoc;
    });
  };

  const addOrUpdateCustomer = (customerData: {
    idDocType: 'V' | 'E' | 'J' | 'G';
    idDocNumber: string;
    name: string;
    phone?: string;
    address?: string;
  }): Customer => {
    const cleanDoc = customerData.idDocNumber.replace(/\D/g, '');
    const existing = customers.find(
      c => c.idDocType === customerData.idDocType && c.idDocNumber === cleanDoc
    );

    if (existing) {
      const updated: Customer = {
        ...existing,
        name: customerData.name.trim(),
        phone: customerData.phone?.trim() || existing.phone,
        address: customerData.address?.trim() || existing.address,
      };
      setCustomers(prev => prev.map(c => (c.id === existing.id ? updated : c)));
      api.saveCustomer(updated).catch(err => console.error('SQLite saveCustomer error', err));
      return updated;
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        idDocType: customerData.idDocType,
        idDocNumber: cleanDoc,
        name: customerData.name.trim(),
        phone: customerData.phone?.trim(),
        address: customerData.address?.trim(),
        createdAt: new Date().toISOString(),
      };
      setCustomers(prev => [...prev, newCustomer]);
      api.saveCustomer(newCustomer).catch(err => console.error('SQLite saveCustomer error', err));
      return newCustomer;
    }
  };

  // Credits & Fiados Management
  const addCreditRecord = (creditData: {
    customerId: string;
    customerName: string;
    customerIdDoc?: string;
    customerPhone?: string;
    customerAddress?: string;
    originalAmountUSD: number;
    description: string;
    notes?: string;
  }): CreditRecord => {
    const rate = bcvRate;
    const amountUSD = Number(creditData.originalAmountUSD) || 0;
    const amountBs = amountUSD * rate;
    const newRecord: CreditRecord = {
      id: `cred-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      customerId: creditData.customerId,
      customerName: creditData.customerName,
      customerIdDoc: creditData.customerIdDoc,
      customerPhone: creditData.customerPhone,
      customerAddress: creditData.customerAddress,
      date: new Date().toISOString(),
      originalAmountUSD: amountUSD,
      originalAmountBs: amountBs,
      bcvRate: rate,
      currentBalanceUSD: amountUSD,
      status: 'pendiente',
      description: creditData.description,
      notes: creditData.notes,
      payments: [],
    };

    setCredits(prev => [newRecord, ...prev]);
    api.createCredit(newRecord).catch(err => console.error('SQLite createCredit error', err));
    return newRecord;
  };

  const addCreditPayment = (
    creditRecordId: string,
    paymentData: {
      amountPaid: number;
      currency: 'Bs.' | '$';
      paymentMethod: PaymentMethod;
      paymentReference?: string;
      notes?: string;
      registerInCashDrawer?: boolean;
    }
  ): { success: boolean; error?: string; payment?: CreditPayment } => {
    const record = credits.find(c => c.id === creditRecordId);
    if (!record) return { success: false, error: 'Registro de crédito no encontrado.' };
    if (record.currentBalanceUSD <= 0) return { success: false, error: 'Esta cuenta ya está totalmente solvente y cancelada.' };

    const rate = bcvRate;
    let amountUSD = 0;
    let amountBs = 0;

    if (paymentData.currency === '$') {
      amountUSD = Number(paymentData.amountPaid) || 0;
      amountBs = amountUSD * rate;
    } else {
      amountBs = Number(paymentData.amountPaid) || 0;
      amountUSD = amountBs / rate;
    }

    if (amountUSD <= 0) {
      return { success: false, error: 'El monto a abonar debe ser mayor a 0.' };
    }

    const newPaymentId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newPayment: CreditPayment = {
      id: newPaymentId,
      creditRecordId,
      customerId: record.customerId,
      date: new Date().toISOString(),
      amountUSD,
      amountBs,
      bcvRate: rate,
      paymentMethod: paymentData.paymentMethod,
      currency: paymentData.currency,
      paymentReference: paymentData.paymentReference?.trim(),
      notes: paymentData.notes?.trim(),
      receivedByUserName: currentUser?.name || 'Administrador Bodega',
      shiftId: currentShift?.id,
    };

    const newBalanceUSD = Math.max(0, Math.round((record.currentBalanceUSD - amountUSD) * 100) / 100);
    const newStatus: 'pendiente' | 'parcial' | 'pagado' = newBalanceUSD <= 0.01 ? 'pagado' : 'parcial';

    setCredits(prev =>
      prev.map(c =>
        c.id === creditRecordId
          ? {
              ...c,
              currentBalanceUSD: newBalanceUSD,
              status: newStatus,
              payments: [newPayment, ...c.payments],
            }
          : c
      )
    );

    // If requested and drawer is open, add cash entry to shift
    if (
      paymentData.registerInCashDrawer &&
      currentShift &&
      (paymentData.paymentMethod === 'efectivo_bs' || paymentData.paymentMethod === 'efectivo_usd')
    ) {
      addCashMovement({
        type: 'ingreso',
        currency: paymentData.currency,
        amount: paymentData.amountPaid,
        reason: `Abono cuenta crédito: ${record.customerName} (${record.saleNumber || 'Crédito'})`,
      });
    }

    // Persist to SQLite
    api.addCreditPayment(creditRecordId, {
      ...paymentData,
      receivedByUserName: currentUser?.name || 'Administrador Bodega',
      shiftId: currentShift?.id,
    }).catch(err => console.error('SQLite addCreditPayment error', err));

    return { success: true, payment: newPayment };
  };

  const deleteCreditRecord = (id: string) => {
    setCredits(prev => prev.filter(c => c.id !== id));
    api.deleteCredit(id).catch(err => console.error('SQLite deleteCredit error', err));
  };

  const updateCustomerCreditLimit = (customerId: string, limitUSD?: number) => {
    setCustomers(prev =>
      prev.map(c => (c.id === customerId ? { ...c, creditLimitUSD: limitUSD } : c))
    );
    api.updateCustomerCreditLimit(customerId, limitUSD).catch(err => console.error('SQLite updateCustomerCreditLimit error', err));
  };

  const getCustomerDebtSummary = (customerIdOrDoc: string) => {
    const cleanDoc = customerIdOrDoc.replace(/\D/g, '');
    const matchingCredits = credits.filter(c => {
      if (c.customerId === customerIdOrDoc) return true;
      if (cleanDoc && c.customerIdDoc && c.customerIdDoc.replace(/\D/g, '') === cleanDoc) return true;
      return false;
    });

    const activeCredits = matchingCredits.filter(c => c.status !== 'pagado' && c.currentBalanceUSD > 0.01);
    const totalDebtUSD = activeCredits.reduce((sum, c) => sum + c.currentBalanceUSD, 0);
    const totalDebtBs = totalDebtUSD * bcvRate;

    return {
      totalDebtUSD,
      totalDebtBs,
      activeCreditsCount: activeCredits.length,
    };
  };

  const totalPendingDebtUSD = credits
    .filter(c => c.status !== 'pagado')
    .reduce((sum, c) => sum + c.currentBalanceUSD, 0);
  const totalPendingDebtBs = totalPendingDebtUSD * bcvRate;
  const totalDebtorsCount = new Set(
    credits.filter(c => c.status !== 'pagado' && c.currentBalanceUSD > 0.01).map(c => c.customerId || c.customerName)
  ).size;

  // Payables & Cuentas por Pagar (Proveedores)
  const addPayableRecord = (data: {
    supplierName: string;
    supplierDoc?: string;
    supplierPhone?: string;
    invoiceNumber?: string;
    description: string;
    originalAmountUSD: number;
    dueDate?: string;
    notes?: string;
  }): PayableRecord => {
    const rate = bcvRate;
    const amountUSD = Number(data.originalAmountUSD) || 0;
    const amountBs = amountUSD * rate;
    const newRecord: PayableRecord = {
      id: `payb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      supplierName: data.supplierName.trim(),
      supplierDoc: data.supplierDoc?.trim(),
      supplierPhone: data.supplierPhone?.trim(),
      invoiceNumber: data.invoiceNumber?.trim(),
      description: data.description.trim(),
      date: new Date().toISOString(),
      dueDate: data.dueDate?.trim(),
      originalAmountUSD: amountUSD,
      originalAmountBs: amountBs,
      bcvRate: rate,
      currentBalanceUSD: amountUSD,
      status: 'pendiente',
      notes: data.notes?.trim(),
      payments: [],
    };

    setPayables(prev => [newRecord, ...prev]);
    api.createPayable(newRecord).catch(err => console.error('SQLite createPayable error', err));
    return newRecord;
  };

  const addPayablePayment = (
    payableId: string,
    paymentData: {
      amountPaid: number;
      currency: 'Bs.' | '$';
      paymentMethod: PaymentMethod;
      paymentReference?: string;
      notes?: string;
    }
  ): { success: boolean; error?: string; payment?: PayablePayment } => {
    const record = payables.find(p => p.id === payableId);
    if (!record) return { success: false, error: 'Cuenta por pagar no encontrada.' };
    if (record.currentBalanceUSD <= 0) return { success: false, error: 'Esta cuenta ya está totalmente cancelada.' };

    const rate = bcvRate;
    let amountUSD = 0;
    let amountBs = 0;

    if (paymentData.currency === '$') {
      amountUSD = Number(paymentData.amountPaid) || 0;
      amountBs = amountUSD * rate;
    } else {
      amountBs = Number(paymentData.amountPaid) || 0;
      amountUSD = amountBs / rate;
    }

    if (amountUSD <= 0) {
      return { success: false, error: 'El monto a pagar debe ser mayor a 0.' };
    }

    const newPaymentId = `paybp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newPayment: PayablePayment = {
      id: newPaymentId,
      payableId,
      date: new Date().toISOString(),
      amountUSD,
      amountBs,
      bcvRate: rate,
      paymentMethod: paymentData.paymentMethod,
      currency: paymentData.currency,
      paymentReference: paymentData.paymentReference?.trim(),
      notes: paymentData.notes?.trim(),
      paidByUserName: currentUser?.name || 'Administrador Bodega',
    };

    const newBalanceUSD = Math.max(0, Math.round((record.currentBalanceUSD - amountUSD) * 100) / 100);
    const newStatus: 'pendiente' | 'parcial' | 'pagado' = newBalanceUSD <= 0.01 ? 'pagado' : 'parcial';

    setPayables(prev =>
      prev.map(p =>
        p.id === payableId
          ? {
              ...p,
              currentBalanceUSD: newBalanceUSD,
              status: newStatus,
              payments: [newPayment, ...p.payments],
            }
          : p
      )
    );

    api.addPayablePayment(payableId, {
      ...paymentData,
      paidByUserName: currentUser?.name || 'Administrador Bodega',
    }).catch(err => console.error('SQLite addPayablePayment error', err));

    return { success: true, payment: newPayment };
  };

  const deletePayableRecord = (id: string) => {
    setPayables(prev => prev.filter(p => p.id !== id));
    api.deletePayable(id).catch(err => console.error('SQLite deletePayable error', err));
  };

  const totalPendingPayableUSD = payables
    .filter(p => p.status !== 'pagado')
    .reduce((sum, p) => sum + p.currentBalanceUSD, 0);
  const totalPendingPayableBs = totalPendingPayableUSD * bcvRate;
  const totalPayablesCount = payables.filter(p => p.status !== 'pagado' && p.currentBalanceUSD > 0.01).length;

  // Complete Sale
  const completeSale = (params: {
    paymentMethod: PaymentMethod;
    paymentCurrency: 'Bs.' | '$' | 'Mixto';
    amountPaid: number;
    paymentReference?: string;
    paymentSplits?: PaymentSplit[];
    customerName?: string;
    customerIdDoc?: string;
    customerPhone?: string;
    customerAddress?: string;
    notes?: string;
    discountUSD?: number;
    igtfAmountUSD?: number;
    igtfAmountBs?: number;
  }): { success: boolean; sale?: Sale; error?: string } => {
    if (cart.length === 0) {
      return { success: false, error: 'El carrito de compras está vacío.' };
    }

    const discountUSD = params.discountUSD || 0;
    const subtotalUSD = cartTotalUSD;
    const totalUSD = Math.max(0, subtotalUSD - discountUSD);
    const subtotalBs = cartTotalBs;
    const discountBs = discountUSD * bcvRate;
    const totalBs = totalUSD * bcvRate;

    const totalCostUSD = cart.reduce(
      (sum, item) => sum + (item.product.costPriceUSD || 0) * item.quantity,
      0
    );
    const profitUSD = totalUSD - totalCostUSD;
    const profitBs = profitUSD * bcvRate;

    const timestamp = new Date().toISOString();
    const nextSaleNumber = `#${String(sales.length + 1).padStart(5, '0')}`;

    let changeBs = 0;
    let changeUSD = 0;
    if (params.paymentCurrency === '$') {
      const overUSD = Math.max(0, params.amountPaid - totalUSD);
      changeUSD = Math.floor(overUSD);
      changeBs = (overUSD - changeUSD) * bcvRate;
    } else if (params.paymentCurrency === 'Bs.') {
      changeBs = Math.max(0, params.amountPaid - totalBs);
    }

    const saleItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPriceUSD: item.unitPriceUSD,
      costPriceUSD: item.product.costPriceUSD || 0,
      subtotalUSD: item.subtotalUSD,
      unitPriceBs: item.unitPriceUSD * bcvRate,
      subtotalBs: item.subtotalUSD * bcvRate,
      unit: item.product.unit,
      taxType: item.product.taxType || 'exento',
    }));

    // Desglose fiscal de IVA según normativa venezolana (SENIAT)
    const exemptAmountUSD = saleItems
      .filter(i => (i.taxType || 'exento') === 'exento')
      .reduce((sum, i) => sum + i.subtotalUSD, 0);
    const exemptAmountBs = exemptAmountUSD * bcvRate;

    const gravadoTotalUSD = saleItems
      .filter(i => i.taxType === 'gravado')
      .reduce((sum, i) => sum + i.subtotalUSD, 0);
    const taxableAmountUSD = gravadoTotalUSD / 1.16;
    const vatAmountUSD = gravadoTotalUSD - taxableAmountUSD;

    const taxableAmountBs = taxableAmountUSD * bcvRate;
    const vatAmountBs = vatAmountUSD * bcvRate;

    // Cálculo de IGTF (3% divisas en efectivo) si aplica
    let calculatedIgtfUSD = params.igtfAmountUSD !== undefined ? params.igtfAmountUSD : 0;
    if (params.igtfAmountUSD === undefined && settings.enableIgtf) {
      const igtfRate = (settings.igtfRate || 3) / 100;
      if (params.paymentMethod === 'efectivo_usd') {
        calculatedIgtfUSD = totalUSD * igtfRate;
      } else if (params.paymentSplits) {
        const usdCash = params.paymentSplits.find(sp => sp.method === 'efectivo_usd');
        if (usdCash) {
          calculatedIgtfUSD = usdCash.amountUSD * igtfRate;
        }
      }
    }
    const calculatedIgtfBs = params.igtfAmountBs !== undefined ? params.igtfAmountBs : (calculatedIgtfUSD * bcvRate);

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      saleNumber: nextSaleNumber,
      date: timestamp,
      items: saleItems,
      bcvRate,
      subtotalUSD,
      discountUSD,
      totalUSD,
      totalCostUSD,
      profitUSD,
      subtotalBs,
      discountBs,
      totalBs,
      profitBs,
      exemptAmountUSD,
      exemptAmountBs,
      taxableAmountUSD,
      taxableAmountBs,
      vatAmountUSD,
      vatAmountBs,
      igtfAmountUSD: calculatedIgtfUSD,
      igtfAmountBs: calculatedIgtfBs,
      paymentMethod: params.paymentMethod,
      paymentCurrency: params.paymentCurrency,
      paymentReference: params.paymentReference?.trim(),
      paymentSplits: params.paymentSplits,
      amountPaid: params.amountPaid,
      changeBs,
      changeUSD,
      customerName: params.customerName?.trim() || 'Cliente Ocasional',
      customerIdDoc: params.customerIdDoc?.trim() || undefined,
      customerPhone: params.customerPhone?.trim() || undefined,
      customerAddress: params.customerAddress?.trim() || undefined,
      cashierName: currentUser?.name || 'Cajero de Turno',
      shiftId: currentShift?.id || undefined,
      notes: params.notes?.trim(),
      status: 'completada',
    };

    // Auto register/update customer in directory
    if (params.customerIdDoc && params.customerName && params.customerName.trim() !== 'Cliente Ocasional') {
      const match = params.customerIdDoc.match(/^([VEJG])-?(\d+)$/i);
      const docType = (match ? match[1].toUpperCase() : 'V') as 'V' | 'E' | 'J' | 'G';
      const docNum = match ? match[2] : params.customerIdDoc.replace(/\D/g, '');
      if (docNum) {
        addOrUpdateCustomer({
          idDocType: docType,
          idDocNumber: docNum,
          name: params.customerName,
          phone: params.customerPhone,
          address: params.customerAddress,
        });
      }
    }

    // Deduct stock from products & log movements
    const newMovements: StockMovement[] = [];
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(c => c.product.id === p.id);
      if (cartItem) {
        const newStock = Math.max(0, Math.round((p.stock - cartItem.quantity) * 1000) / 1000);
        newMovements.push({
          id: `mov-${Date.now()}-${p.id}`,
          productId: p.id,
          productName: p.name,
          type: 'salida_venta',
          quantity: -cartItem.quantity,
          previousStock: p.stock,
          newStock,
          reason: `Venta ${newSale.saleNumber}`,
          date: timestamp,
        });
        return {
          ...p,
          stock: newStock,
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    setSales(prev => [newSale, ...prev]);
    setMovements(prev => [...newMovements, ...prev]);

    // If sale was on credit / fiado, create credit record
    if (params.paymentMethod === 'fiado' || params.paymentSplits?.some(sp => sp.method === 'fiado')) {
      let fiadoAmountUSD = newSale.totalUSD;
      let fiadoAmountBs = newSale.totalBs;
      const fiadoSplit = params.paymentSplits?.find(sp => sp.method === 'fiado');
      const downPaymentSplits = params.paymentSplits?.filter(sp => sp.method !== 'fiado') || [];
      const totalDownPaymentUSD = downPaymentSplits.reduce((sum, sp) => sum + sp.amountUSD, 0);
      const totalDownPaymentBs = downPaymentSplits.reduce((sum, sp) => sum + sp.amountBs, 0);

      if (fiadoSplit) {
        fiadoAmountUSD = fiadoSplit.amountUSD;
        fiadoAmountBs = fiadoSplit.amountBs;
      }

      const existingCust = params.customerIdDoc ? findCustomerByIdDoc(params.customerIdDoc) : undefined;
      const custId = existingCust ? existingCust.id : `cust-${Date.now()}`;
      const creditId = `cred-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      const initialPayments: CreditPayment[] = downPaymentSplits.map((sp, idx) => ({
        id: `pay-${Date.now()}-init-${idx}`,
        creditRecordId: creditId,
        customerId: custId,
        date: newSale.date,
        amountUSD: sp.amountUSD,
        amountBs: sp.amountBs,
        bcvRate: newSale.bcvRate,
        paymentMethod: sp.method,
        currency: sp.currency,
        paymentReference: sp.reference,
        notes: sp.notes || 'Abono inicial al momento de la venta',
        receivedByUserName: newSale.cashierName,
        shiftId: newSale.shiftId,
      }));

      const newCredit: CreditRecord = {
        id: creditId,
        customerId: custId,
        customerName: newSale.customerName || 'Cliente Ocasional',
        customerIdDoc: newSale.customerIdDoc,
        customerPhone: newSale.customerPhone,
        customerAddress: newSale.customerAddress,
        saleId: newSale.id,
        saleNumber: newSale.saleNumber,
        date: newSale.date,
        originalAmountUSD: totalDownPaymentUSD > 0.001 ? newSale.totalUSD : fiadoAmountUSD,
        originalAmountBs: totalDownPaymentBs > 0.01 ? newSale.totalBs : fiadoAmountBs,
        bcvRate: newSale.bcvRate,
        currentBalanceUSD: fiadoAmountUSD,
        status: totalDownPaymentUSD > 0.001 ? 'parcial' : 'pendiente',
        description: newSale.items.map(i => `${i.quantity}x ${i.productName}`).join(', '),
        notes: newSale.notes,
        payments: initialPayments,
      };
      setCredits(prev => [newCredit, ...prev]);
    }

    clearCart();

    const printMode = settings.receiptPrintMode || 'ask';

    if (printMode === 'always') {
      setSelectedReceiptSale(newSale);
    } else if (printMode === 'never') {
      setConfirmedSaleNotice({
        saleId: newSale.id,
        saleNumber: newSale.saleNumber,
        totalBs: newSale.totalBs,
        totalUSD: newSale.totalUSD,
        customerName: newSale.customerName || 'Cliente Ocasional',
        date: newSale.date,
        changeBs: newSale.changeBs,
        changeUSD: newSale.changeUSD,
        paymentMethod: newSale.paymentMethod,
        sale: newSale,
      });
    } else {
      // 'ask': Default! Show the optional confirmation modal with print option
      setPendingReceiptSale(newSale);
    }

    // Persist sale, movements and stock deductions to Supabase & SQLite
    api.createSale(
      newSale,
      newMovements,
      updatedProducts.map(p => ({ id: p.id, stock: p.stock }))
    ).catch(err => console.error('createSale sync error', err));

    return { success: true, sale: newSale };
  };

  // Cancel sale
  const cancelSale = (saleId: string, reason?: string, cancelledBy?: string): boolean => {
    const saleToCancel = sales.find(s => s.id === saleId);
    if (!saleToCancel || saleToCancel.status === 'anulada') {
      return false;
    }

    const timestamp = new Date().toISOString();
    const finalReason = reason?.trim() || 'Anulación solicitada por el usuario';
    const finalCancelledBy = cancelledBy?.trim() || currentUser?.name || 'Administrador';
    const reversalMovements: StockMovement[] = [];

    const updatedProducts = products.map(p => {
      const item = saleToCancel.items.find(i => i.productId === p.id);
      if (item) {
        const newStock = p.stock + item.quantity;
        reversalMovements.push({
          id: `mov-${Date.now()}-${p.id}`,
          productId: p.id,
          productName: p.name,
          type: 'devolucion_anulada',
          quantity: item.quantity,
          previousStock: p.stock,
          newStock,
          reason: `Anulación de venta ${saleToCancel.saleNumber}: ${finalReason}`,
          date: timestamp,
        });
        return {
          ...p,
          stock: newStock,
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    setSales(prev =>
      prev.map(s => (s.id === saleId ? { 
        ...s, 
        status: 'anulada',
        cancelledReason: finalReason,
        cancelledAt: timestamp,
        cancelledBy: finalCancelledBy,
      } : s))
    );
    setMovements(prev => [...reversalMovements, ...prev]);
    setCredits(prev => prev.filter(c => c.saleId !== saleId));

    // Persist cancel to SQLite
    api.cancelSale(saleId, finalReason, finalCancelledBy).catch(err => console.error('SQLite cancelSale sync error', err));

    return true;
  };

  // Add product
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt'>): Product => {
    const id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newProduct: Product = {
      ...productData,
      id,
      createdAt: new Date().toISOString(),
    };

    setProducts(prev => [newProduct, ...prev]);

    if (newProduct.stock > 0) {
      const movement: StockMovement = {
        id: `mov-${Date.now()}-${newProduct.id}`,
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'entrada',
        quantity: newProduct.stock,
        previousStock: 0,
        newStock: newProduct.stock,
        reason: 'Inventario inicial al registrar producto',
        date: new Date().toISOString(),
      };
      setMovements(prev => [movement, ...prev]);
    }

    // Persist to SQLite
    api.createProduct(productData).then(saved => {
      if (saved && saved.id) {
        setProducts(prev => prev.map(p => p.id === id ? saved : p));
      }
    }).catch(err => console.error('SQLite createProduct sync error', err));

    return newProduct;
  };

  // Update product
  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => (p.id === updatedProduct.id ? updatedProduct : p)));
    setCart(prev =>
      prev.map(item =>
        item.product.id === updatedProduct.id
          ? {
              ...item,
              product: updatedProduct,
              unitPriceUSD: updatedProduct.salePriceUSD,
              subtotalUSD: item.quantity * updatedProduct.salePriceUSD,
            }
          : item
      )
    );

    api.updateProduct(updatedProduct).catch(err => console.error('SQLite updateProduct sync error', err));
  };

  // Delete product
  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    removeFromCart(productId);
    api.deleteProduct(productId).catch(err => console.error('SQLite deleteProduct sync error', err));
  };

  // Restock product
  const restockProduct = (productId: string, quantityToAdd: number, reason?: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const previousStock = prod.stock;
    const newStock = previousStock + quantityToAdd;
    const timestamp = new Date().toISOString();

    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, stock: newStock } : p))
    );

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${productId}`,
      productId,
      productName: prod.name,
      type: 'entrada',
      quantity: quantityToAdd,
      previousStock,
      newStock,
      reason: reason?.trim() || 'Reabastecimiento de mercancía',
      date: timestamp,
    };
    setMovements(prev => [movement, ...prev]);

    api.restockProduct(productId, quantityToAdd, reason).catch(err => console.error('SQLite restockProduct sync error', err));
  };

  // Adjust stock
  const adjustStock = (productId: string, newStock: number, reason: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const previousStock = prod.stock;
    const difference = newStock - previousStock;
    const timestamp = new Date().toISOString();

    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p))
    );

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${productId}`,
      productId,
      productName: prod.name,
      type: 'ajuste_merma',
      quantity: difference,
      previousStock,
      newStock: Math.max(0, newStock),
      reason: reason.trim() || 'Ajuste de inventario físico / merma',
      date: timestamp,
    };
    setMovements(prev => [movement, ...prev]);

    api.adjustStock(productId, newStock, reason).catch(err => console.error('SQLite adjustStock sync error', err));
  };

  // Category Actions
  const addCategory = (name: string): { success: boolean; error?: string } => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'El nombre del rubro o categoría no puede estar vacío.' };
    }
    const exists = categories.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: false, error: 'Ya existe una categoría con este nombre.' };
    }
    setCategories(prev => [...prev, trimmed]);
    api.addCategory(trimmed).catch(err => console.error('SQLite addCategory error', err));
    return { success: true };
  };

  const updateCategory = (oldName: string, newName: string): { success: boolean; error?: string } => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { success: false, error: 'El nuevo nombre no puede estar vacío.' };
    }
    if (trimmed.toLowerCase() === oldName.toLowerCase()) {
      setCategories(prev => prev.map(c => c === oldName ? trimmed : c));
      setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: trimmed } : p));
      return { success: true };
    }
    const exists = categories.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: false, error: 'Ya existe otra categoría con este nombre.' };
    }
    setCategories(prev => prev.map(c => c === oldName ? trimmed : c));
    setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: trimmed } : p));
    api.updateCategory(oldName, trimmed).catch(err => console.error('SQLite updateCategory error', err));
    return { success: true };
  };

  const deleteCategory = (name: string): { success: boolean; affectedProducts: number } => {
    if (!categories.includes(name)) {
      return { success: false, affectedProducts: 0 };
    }
    const affected = products.filter(p => p.category === name).length;
    const fallback = categories.find(c => c !== name && c.toLowerCase() === 'otros') 
      || categories.find(c => c !== name) 
      || 'Otros';
    
    setCategories(prev => {
      const filtered = prev.filter(c => c !== name);
      if (filtered.length === 0) return ['Otros'];
      if (!filtered.includes(fallback)) return [...filtered, fallback];
      return filtered;
    });

    if (affected > 0) {
      setProducts(prev => prev.map(p => p.category === name ? { ...p, category: fallback } : p));
    }

    api.deleteCategory(name).catch(err => console.error('SQLite deleteCategory error', err));
    return { success: true, affectedProducts: affected };
  };

  // Settings
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      api.updateSettings(newSettings).then(saved => {
        if (saved) {
          setSettings(current => ({ ...current, ...saved }));
        }
      }).catch(err => console.error('SQLite updateSettings error', err));
      return updated;
    });
  };

  // Reset database to ZERO records
  const resetToSampleData = () => {
    setProducts([]);
    setSales([]);
    setMovements([]);
    setCustomers([]);
    setCredits([]);
    setShifts([]);
    setCurrentShift(null);
    setSelectedReceiptShift(null);
    setCart([]);
    setCategories(INITIAL_CATEGORIES);

    // Call SQLite reset endpoint on server
    api.resetDatabase().then(cleanState => {
      if (cleanState) {
        setProducts(cleanState.products || []);
        setSales(cleanState.sales || []);
        setMovements(cleanState.movements || []);
        setCustomers(cleanState.customers || []);
        setCredits(cleanState.credits || []);
        setShifts(cleanState.shifts || []);
        setCurrentShift(null);
      }
    }).catch(err => console.error('SQLite resetDatabase error', err));
  };

  // Metrics
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayActiveSales = sales.filter(
    s => s.status === 'completada' && s.date.startsWith(todayStr)
  );

  const todaySalesCount = todayActiveSales.length;
  const todaySalesTotalBs = todayActiveSales.reduce((sum, s) => sum + s.totalBs, 0);
  const todaySalesTotalUSD = todayActiveSales.reduce((sum, s) => sum + s.totalUSD, 0);

  return (
    <StoreContext.Provider
      value={{
        products,
        sales,
        movements,
        settings,
        categories,
        customers,
        findCustomerByIdDoc,
        addOrUpdateCustomer,
        // Credits & Fiados
        credits,
        addCreditRecord,
        addCreditPayment,
        deleteCreditRecord,
        updateCustomerCreditLimit,
        getCustomerDebtSummary,
        totalPendingDebtUSD,
        totalPendingDebtBs,
        totalDebtorsCount,
        // Payables & Cuentas por Pagar
        payables,
        addPayableRecord,
        addPayablePayment,
        deletePayableRecord,
        totalPendingPayableUSD,
        totalPendingPayableBs,
        totalPayablesCount,
        cart,
        activeTab,
        setActiveTab: handleSetActiveTab,
        selectedReceiptSale,
        setSelectedReceiptSale,
        pendingReceiptSale,
        setPendingReceiptSale,
        confirmedSaleNotice,
        setConfirmedSaleNotice,
        dismissConfirmedSaleNotice,
        // Security & Users
        users,
        currentUser,
        login,
        logout,
        isLoginModalOpen,
        setIsLoginModalOpen,
        verifyAdminPassword,
        updateUserPin,
        changePasswordOrPin,
        resetCredentialsWithMasterSupportKey,
        // Settings Module Protection
        isSettingsUnlocked,
        isSettingsAuthModalOpen,
        setIsSettingsAuthModalOpen,
        unlockSettings,
        lockSettings,
        // Supervisor auth
        isSupervisorAuthOpen,
        supervisorActionInfo,
        requestSupervisorAuth,
        confirmSupervisorAuth,
        closeSupervisorAuth,
        // Shifts & Drawer
        shifts,
        currentShift,
        isShiftModalOpen,
        setIsShiftModalOpen,
        openShift,
        closeShift,
        addCashMovement,
        currentShiftCashBs,
        currentShiftCashUSD,
        selectedReceiptShift,
        setSelectedReceiptShift,
        // BCV & Currency helpers
        bcvRate,
        updateBcvRate,
        syncBcvRateOnline,
        isSyncingBcv,
        bcvSyncStatus,
        formatUSD,
        formatBs,
        usdToBs,
        bsToUSD,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotalUSD,
        cartTotalBs,
        cartItemCount,
        completeSale,
        cancelSale,
        addProduct,
        updateProduct,
        deleteProduct,
        restockProduct,
        adjustStock,
        addCategory,
        updateCategory,
        deleteCategory,
        updateSettings,
        resetToSampleData,
        lowStockCount,
        outOfStockCount,
        todaySalesCount,
        todaySalesTotalBs,
        todaySalesTotalUSD,
        isDbConnected,
        isDbLoading,
        isOnline,
        serverLatencyMs,
        refreshState,
        restoreBackupData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
