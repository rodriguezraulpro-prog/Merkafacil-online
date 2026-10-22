import { Product, Sale, StoreSettings, StockMovement, Customer, UserAccount, CreditRecord } from '../types';

export const INITIAL_SETTINGS: StoreSettings = {
  name: 'Merkafacil',
  rif: '',
  phone: '+58 412-4623396',
  address: '',
  bcvRate: 54.50, // Tasa de cambio oficial BCV de referencia
  bcvLastUpdated: new Date().toISOString(),
  receiptFooter: '¡Gracias por su compra en Merkafacil! Vuelva pronto.',
  adminPassword: 'admin123', // Contraseña de Administrador / Dueño
  requireSupervisorPasswordForChanges: false,
  receiptPrintMode: 'ask', // Por defecto: Impresión de ticket opcional (Preguntar al cajero al completar la venta)
  autoPrintReceipt: true, // Auto-imprimir ticket al finalizar la venta
  enableIgtf: false, // IGTF 3% configurable
  igtfRate: 3,
  showNonFiscalNotice: true,
  autoUpdateBcv: true, // Actualización automática de tasa BCV por internet activada por defecto
  bcvOfficialDate: '',
  bcvSource: 'BCV Oficial (DolarApi)',
};

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'Administrador (Dueño)',
    role: 'admin',
    pin: '1234',
  },
];

export const INITIAL_CATEGORIES: string[] = [
  'Abarrotes',
  'Bebidas',
  'Lácteos y Huevos',
  'Snacks y Dulces',
  'Limpieza y Hogar',
  'Panadería',
  'Frutas y Verduras',
  'Cuidado Personal',
  'Otros',
];

// Datos iniciales vacíos para comenzar a registrar desde cero (0)
export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_SALES: Sale[] = [];

export const INITIAL_MOVEMENTS: StockMovement[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_CREDITS: CreditRecord[] = [];
