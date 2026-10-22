export type Category = string;

export type UnitType = 'unidad' | 'kg' | 'litro' | 'paquete' | 'lata' | 'bolsa';

export type TaxType = 'exento' | 'gravado'; // (E) Exento de IVA o (G) Gravado al 16% IVA

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: Category;
  costPriceUSD: number; // Costo base en Dólares ($)
  salePriceUSD: number; // Precio de venta base en Dólares ($)
  stock: number; // Stock disponible actual
  minStock: number; // Stock mínimo para alerta
  unit: UnitType;
  taxType?: TaxType; // 'exento' (E) o 'gravado' (G)
  description?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPriceUSD: number;
  subtotalUSD: number;
}

export type PaymentMethod = 
  | 'pago_movil' 
  | 'punto_debito' 
  | 'efectivo_bs' 
  | 'efectivo_usd' 
  | 'fiado' 
  | 'transferencia'
  | 'mixto';

export interface PaymentSplit {
  method: Exclude<PaymentMethod, 'mixto'>;
  currency: 'Bs.' | '$';
  amount: number; // Monto en la moneda seleccionada
  amountBs: number; // Equivalente en Bolívares
  amountUSD: number; // Equivalente en Dólares
  reference?: string; // Número de referencia o lote (obligatorio para punto y pago móvil)
  notes?: string; // ej: "Tarjeta Banesco", "Tarjeta Mercantil"
}

export interface Customer {
  id: string;
  idDocType: 'V' | 'E' | 'J' | 'G'; // V- Venezolano, E- Extranjero, J- Jurídico, G- Gubernamental
  idDocNumber: string; // ej: "18294721"
  name: string; // ej: "Carlos Mendoza"
  phone?: string;
  email?: string;
  address?: string;
  creditLimitUSD?: number; // Límite de crédito opcional en $
  notes?: string;
  createdAt: string;
}

export interface CreditPayment {
  id: string;
  creditRecordId: string;
  customerId: string;
  date: string; // ISO string
  amountUSD: number;
  amountBs: number;
  bcvRate: number;
  paymentMethod: PaymentMethod;
  currency: 'Bs.' | '$';
  paymentReference?: string;
  notes?: string;
  receivedByUserName?: string;
  shiftId?: string;
}

export interface CreditRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerIdDoc?: string; // ej: "V-18294721"
  customerPhone?: string;
  customerAddress?: string;
  saleId?: string;
  saleNumber?: string;
  date: string; // ISO string
  originalAmountUSD: number;
  originalAmountBs: number;
  bcvRate: number;
  currentBalanceUSD: number;
  status: 'pendiente' | 'parcial' | 'pagado';
  description?: string;
  notes?: string;
  payments: CreditPayment[];
}

export interface PayablePayment {
  id: string;
  payableId: string;
  date: string; // ISO string
  amountUSD: number;
  amountBs: number;
  bcvRate: number;
  paymentMethod: PaymentMethod;
  currency: 'Bs.' | '$';
  paymentReference?: string;
  notes?: string;
  paidByUserName?: string;
}

export interface PayableRecord {
  id: string;
  supplierName: string;
  supplierDoc?: string;
  supplierPhone?: string;
  invoiceNumber?: string;
  description: string;
  date: string; // ISO string
  dueDate?: string;
  originalAmountUSD: number;
  originalAmountBs: number;
  bcvRate: number;
  currentBalanceUSD: number;
  status: 'pendiente' | 'parcial' | 'pagado';
  notes?: string;
  payments: PayablePayment[];
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceUSD: number;
  costPriceUSD: number;
  subtotalUSD: number;
  unitPriceBs: number;
  subtotalBs: number;
  unit: UnitType;
  taxType?: TaxType; // 'exento' (E) o 'gravado' (G)
}

export interface Sale {
  id: string;
  saleNumber: string; // ej: #0001
  date: string; // ISO String: YYYY-MM-DDTHH:mm:ss
  items: SaleItem[];
  bcvRate: number; // Tasa BCV aplicada en la venta
  subtotalUSD: number;
  discountUSD: number;
  totalUSD: number;
  totalCostUSD: number;
  profitUSD: number;
  subtotalBs: number;
  discountBs: number;
  totalBs: number;
  profitBs: number;
  // Desglose fiscal de IVA e IGTF
  exemptAmountUSD?: number; // Subtotal Exento (E) en $
  exemptAmountBs?: number; // Subtotal Exento (E) en Bs.
  taxableAmountUSD?: number; // Base Imponible Gravada (G 16%) en $
  taxableAmountBs?: number; // Base Imponible Gravada (G 16%) en Bs.
  vatAmountUSD?: number; // Monto IVA (16%) en $
  vatAmountBs?: number; // Monto IVA (16%) en Bs.
  igtfAmountUSD?: number; // Monto IGTF (3% divisas en efectivo) en $
  igtfAmountBs?: number; // Monto IGTF (3% divisas en efectivo) en Bs.
  paymentMethod: PaymentMethod;
  paymentCurrency: 'Bs.' | '$' | 'Mixto';
  paymentReference?: string; // Referencia bancaria / punto de venta
  paymentSplits?: PaymentSplit[]; // Desglose de pagos si fue mixto
  amountPaid: number; // Monto entregado por el cliente en la moneda seleccionada
  changeBs: number; // Vuelto en Bolívares
  changeUSD: number; // Vuelto en Dólares
  customerName?: string;
  customerIdDoc?: string; // ej: "V-18294721"
  customerPhone?: string;
  customerAddress?: string;
  cashierName?: string; // Nombre del cajero que procesó la venta
  shiftId?: string; // ID del turno de caja activo
  notes?: string;
  status: 'completada' | 'anulada';
  cancelledReason?: string; // Motivo obligatorio de la anulación
  cancelledAt?: string; // Fecha y hora ISO de la anulación
  cancelledBy?: string; // Nombre del usuario/supervisor que anuló
}

export type StockMovementType = 'entrada' | 'salida_venta' | 'ajuste_merma' | 'devolucion_anulada';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  date: string;
}

export type UserRole = 'admin' | 'cajero';

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  pin?: string;
}

export interface CashDrawerMovement {
  id: string;
  type: 'ingreso' | 'egreso';
  currency: 'Bs.' | '$';
  amount: number;
  reason: string;
  timestamp: string;
  performedBy: string;
}

export interface CashShift {
  id: string;
  shiftNumber: number;
  openedAt: string; // ISO string
  closedAt?: string; // ISO string
  openedByUserId: string;
  openedByUserName: string;
  closedByUserId?: string;
  closedByUserName?: string;
  initialCashBs: number; // Fondo inicial en Bs.
  initialCashUSD: number; // Fondo inicial en $ USD
  cashEntries: CashDrawerMovement[]; // Egresos o ingresos de efectivo
  status: 'abierta' | 'cerrada';
  expectedCashBs?: number;
  expectedCashUSD?: number;
  countedCashBs?: number;
  countedCashUSD?: number;
  differenceBs?: number;
  differenceUSD?: number;
  totalSalesCount?: number;
  totalSalesBs?: number;
  totalSalesUSD?: number;
  paymentSummary?: {
    efectivoBs: number;
    efectivoUSD: number;
    pagoMovilBs: number;
    puntoDebitoBs: number;
    transferenciaBs: number;
    fiadoBs: number;
    fiadoUSD: number;
  };
  notes?: string;
}

export type ReceiptPrintMode = 'ask' | 'always' | 'never';

export interface ConfirmedSaleNotice {
  saleId: string;
  saleNumber: string;
  totalBs: number;
  totalUSD: number;
  customerName: string;
  date: string;
  changeBs?: number;
  changeUSD?: number;
  paymentMethod?: string;
  sale?: Sale;
}

export interface StoreSettings {
  name: string;
  rif: string; // RIF en Venezuela (ej. J-12345678-9)
  phone: string;
  address: string;
  bcvRate: number; // Tasa oficial del BCV (ej: 45.20 Bs por 1 $)
  bcvLastUpdated: string;
  receiptFooter: string;
  adminPassword?: string; // Contraseña de Administrador (default: 'admin123')
  requireSupervisorPasswordForChanges?: boolean; // Solicitar clave para cambios sensibles
  receiptPrintMode?: ReceiptPrintMode; // Modo de impresión de tickets: 'ask' (Opcional - Preguntar al terminar venta), 'always' (Mostrar directo), 'never' (Solo registrar sin comprobante)
  autoPrintReceipt?: boolean; // Auto-imprimir ticket al finalizar el cobro o abrir comprobante
  // Cumplimiento Legal y Tributario en Venezuela (SENIAT)
  enableIgtf?: boolean; // Habilitar cobro de IGTF (3% en divisas en efectivo)
  igtfRate?: number; // Porcentaje de IGTF (default 3%)
  showNonFiscalNotice?: boolean; // Mostrar aviso de NO FISCALIDAD en tickets (default true)
  // Actualización automática de Tasa BCV Oficial por Internet
  autoUpdateBcv?: boolean; // Si está activo, sincroniza la tasa automáticamente del día
  bcvOfficialDate?: string; // Fecha de valor oficial publicada por el BCV (ej. YYYY-MM-DD)
  bcvSource?: string; // Fuente de la tasa (ej: 'BCV Oficial (dolarapi)')
}

export type ActiveTab = 'pos' | 'inventario' | 'creditos' | 'reportes' | 'movimientos' | 'supabase' | 'ajustes';


