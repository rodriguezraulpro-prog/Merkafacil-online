import fs from 'fs';
import path from 'path';
import { createClient, Client } from '@libsql/client';
import { 
  Product, 
  Sale, 
  StockMovement, 
  StoreSettings, 
  Customer, 
  UserAccount, 
  CashShift, 
  CashDrawerMovement,
  CreditRecord,
  CreditPayment,
  PayableRecord,
  PayablePayment,
  PaymentMethod,
  PaymentSplit
} from '../src/types';

// Ensure data directory exists for local fallback
export const dataDir = process.env.MERKAFACIL_DATA_DIR 
  ? process.env.MERKAFACIL_DATA_DIR 
  : path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const dbPath = path.join(dataDir, 'bodega.db');

// Primary LibSQL database client (Local SQLite: bodega.db)
export const db: Client = createClient({
  url: `file:${dbPath}`,
});

export const DEFAULT_CATEGORIES = [
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

export const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Merkafacil',
  rif: '',
  phone: '+58 412-4623396',
  address: '',
  bcvRate: 54.50,
  bcvLastUpdated: new Date().toISOString(),
  receiptFooter: '¡Gracias por su compra en Merkafacil! Vuelva pronto.',
  adminPassword: 'admin123',
  requireSupervisorPasswordForChanges: false,
  autoPrintReceipt: true,
  enableIgtf: false,
  igtfRate: 3,
  showNonFiscalNotice: true,
  autoUpdateBcv: true,
  bcvOfficialDate: '',
  bcvSource: 'BCV Oficial',
};

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'Administrador (Dueño)',
    role: 'admin',
    pin: '1234',
  },
];

export async function initDatabase(client: Client = db) {
  try {
    try {
      await client.execute('PRAGMA journal_mode = WAL;');
      await client.execute('PRAGMA synchronous = NORMAL;');
    } catch (e) {
      // Ignored on some file systems
    }
    await client.execute('PRAGMA foreign_keys = ON;');
  } catch (e) {
    // Continue
  }

  // Create tables in sequence
  await client.batch([
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      costPriceUSD REAL NOT NULL DEFAULT 0,
      salePriceUSD REAL NOT NULL DEFAULT 0,
      stock REAL NOT NULL DEFAULT 0,
      minStock REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'unidad',
      description TEXT,
      createdAt TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY
    );`,
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      idDocType TEXT NOT NULL,
      idDocNumber TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      creditLimitUSD REAL,
      notes TEXT,
      createdAt TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS credits (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      customerName TEXT NOT NULL,
      customerIdDoc TEXT,
      customerPhone TEXT,
      customerAddress TEXT,
      saleId TEXT,
      saleNumber TEXT,
      date TEXT NOT NULL,
      originalAmountUSD REAL NOT NULL,
      originalAmountBs REAL NOT NULL,
      bcvRate REAL NOT NULL,
      currentBalanceUSD REAL NOT NULL,
      status TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      payments TEXT NOT NULL DEFAULT '[]'
    );`,
    `CREATE TABLE IF NOT EXISTS payables (
      id TEXT PRIMARY KEY,
      supplierName TEXT NOT NULL,
      supplierDoc TEXT,
      supplierPhone TEXT,
      invoiceNumber TEXT,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      dueDate TEXT,
      originalAmountUSD REAL NOT NULL,
      originalAmountBs REAL NOT NULL,
      bcvRate REAL NOT NULL,
      currentBalanceUSD REAL NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      payments TEXT NOT NULL DEFAULT '[]'
    );`,
    `CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      saleNumber TEXT NOT NULL,
      date TEXT NOT NULL,
      items TEXT NOT NULL,
      bcvRate REAL NOT NULL,
      subtotalUSD REAL NOT NULL,
      discountUSD REAL NOT NULL DEFAULT 0,
      totalUSD REAL NOT NULL,
      totalCostUSD REAL NOT NULL DEFAULT 0,
      profitUSD REAL NOT NULL DEFAULT 0,
      subtotalBs REAL NOT NULL,
      discountBs REAL NOT NULL DEFAULT 0,
      totalBs REAL NOT NULL,
      profitBs REAL NOT NULL DEFAULT 0,
      paymentMethod TEXT NOT NULL,
      paymentCurrency TEXT NOT NULL,
      paymentReference TEXT,
      paymentSplits TEXT,
      amountPaid REAL NOT NULL DEFAULT 0,
      changeBs REAL NOT NULL DEFAULT 0,
      changeUSD REAL NOT NULL DEFAULT 0,
      customerName TEXT,
      customerIdDoc TEXT,
      customerPhone TEXT,
      customerAddress TEXT,
      cashierName TEXT,
      shiftId TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'completada',
      cancelledReason TEXT,
      cancelledAt TEXT,
      cancelledBy TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      productName TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      previousStock REAL NOT NULL,
      newStock REAL NOT NULL,
      reason TEXT NOT NULL,
      date TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      shiftNumber INTEGER NOT NULL,
      openedAt TEXT NOT NULL,
      closedAt TEXT,
      openedByUserId TEXT NOT NULL,
      openedByUserName TEXT NOT NULL,
      closedByUserId TEXT,
      closedByUserName TEXT,
      initialCashBs REAL NOT NULL,
      initialCashUSD REAL NOT NULL,
      cashEntries TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'abierta',
      expectedCashBs REAL,
      expectedCashUSD REAL,
      countedCashBs REAL,
      countedCashUSD REAL,
      differenceBs REAL,
      differenceUSD REAL,
      totalSalesCount INTEGER,
      totalSalesBs REAL,
      totalSalesUSD REAL,
      paymentSummary TEXT,
      notes TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`
  ], 'write');

  // Seed default categories if none exist
  const catCountRes = await client.execute('SELECT COUNT(*) as count FROM categories');
  const catCount = Number(catCountRes.rows[0]?.count) || 0;
  if (catCount === 0) {
    const catStatements = DEFAULT_CATEGORIES.map(cat => ({
      sql: 'INSERT OR IGNORE INTO categories (name) VALUES (?)',
      args: [cat]
    }));
    await client.batch(catStatements, 'write');
  }

  // Seed default admin user if none exist
  const userCountRes = await client.execute('SELECT COUNT(*) as count FROM users');
  const userCount = Number(userCountRes.rows[0]?.count) || 0;
  if (userCount === 0) {
    const userStatements = DEFAULT_USERS.map(u => ({
      sql: 'INSERT OR IGNORE INTO users (id, username, name, role, pin) VALUES (?, ?, ?, ?, ?)',
      args: [u.id, u.username, u.name, u.role, u.pin || null]
    }));
    await client.batch(userStatements, 'write');
  }

  // Seed default settings if none exist
  const settingsRow = await client.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['current'] });
  if (settingsRow.rows.length === 0) {
    await client.execute({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
      args: ['current', JSON.stringify(DEFAULT_SETTINGS)]
    });
  }

  // Schema migrations for taxType & fiscal columns
  try {
    await client.execute("ALTER TABLE products ADD COLUMN taxType TEXT NOT NULL DEFAULT 'exento';");
  } catch (e) {
    // Column already exists
  }

  const salesColumns = [
    "ALTER TABLE sales ADD COLUMN exemptAmountUSD REAL NOT NULL DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN exemptAmountBs REAL NOT NULL DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN taxableAmountUSD REAL NOT NULL DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN taxableAmountBs REAL NOT NULL DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN vatAmountUSD REAL NOT NULL DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN vatAmountBs REAL NOT NULL DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN igtfAmountUSD REAL NOT NULL DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN igtfAmountBs REAL NOT NULL DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN cancelledReason TEXT;",
    "ALTER TABLE sales ADD COLUMN cancelledAt TEXT;",
    "ALTER TABLE sales ADD COLUMN cancelledBy TEXT;",
  ];
  for (const colSql of salesColumns) {
    try {
      await client.execute(colSql);
    } catch (e) {
      // Column already exists
    }
  }

  console.log('Database initialized successfully. Mode: Local SQLite (bodega.db)');
}

// Read settings
export async function getSettings(): Promise<StoreSettings> {
  const row = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['current'] });
  if (row.rows.length > 0) {
    try {
      const parsed = JSON.parse(String(row.rows[0].value));
      if (!parsed.name || parsed.name === 'Bodega y Minimarket') {
        parsed.name = 'Merkafacil';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      console.error('Error parsing settings', e);
    }
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await db.execute({
    sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    args: ['current', JSON.stringify(updated)]
  });
  return updated;
}

// Categories
export async function getCategories(): Promise<string[]> {
  const res = await db.execute('SELECT name FROM categories ORDER BY name ASC');
  return res.rows.map(r => String(r.name));
}

export async function addCategory(name: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: 'El nombre de la categoría no puede estar vacío.' };
  try {
    await db.execute({ sql: 'INSERT INTO categories (name) VALUES (?)', args: [trimmed] });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Ya existe una categoría con este nombre.' };
  }
}

export async function updateCategory(oldName: string, newName: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = newName.trim();
  if (!trimmed) return { success: false, error: 'El nuevo nombre no puede estar vacío.' };
  try {
    await db.batch([
      { sql: 'UPDATE categories SET name = ? WHERE name = ?', args: [trimmed, oldName] },
      { sql: 'UPDATE products SET category = ? WHERE category = ?', args: [trimmed, oldName] }
    ], 'write');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Error al actualizar categoría: ya existe o es inválida.' };
  }
}

export async function deleteCategory(name: string): Promise<{ success: boolean; affectedProducts: number }> {
  const fallback = 'Otros';
  try {
    const countRes = await db.execute({ sql: 'SELECT COUNT(*) as count FROM products WHERE category = ?', args: [name] });
    const affected = Number(countRes.rows[0]?.count) || 0;

    await db.batch([
      { sql: 'INSERT OR IGNORE INTO categories (name) VALUES (?)', args: [fallback] },
      { sql: 'UPDATE products SET category = ? WHERE category = ?', args: [fallback, name] },
      { sql: 'DELETE FROM categories WHERE name = ?', args: [name] }
    ], 'write');

    return { success: true, affectedProducts: affected };
  } catch (err) {
    return { success: false, affectedProducts: 0 };
  }
}

// Products
export async function getProducts(): Promise<Product[]> {
  const res = await db.execute('SELECT * FROM products ORDER BY name ASC');
  return res.rows.map(r => ({
    id: String(r.id),
    barcode: String(r.barcode || ''),
    name: String(r.name),
    category: String(r.category),
    costPriceUSD: Number(r.costPriceUSD) || 0,
    salePriceUSD: Number(r.salePriceUSD) || 0,
    stock: Number(r.stock) || 0,
    minStock: Number(r.minStock) || 0,
    unit: (String(r.unit || 'unidad') as any),
    taxType: (String(r.taxType || 'exento') as any),
    description: r.description ? String(r.description) : undefined,
    createdAt: String(r.createdAt),
  }));
}

export async function addProduct(prod: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const newProduct: Product = {
    ...prod,
    taxType: prod.taxType || 'exento',
    id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  const statements: Array<{ sql: string; args: any[] }> = [
    {
      sql: `INSERT INTO products (id, barcode, name, category, costPriceUSD, salePriceUSD, stock, minStock, unit, description, taxType, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newProduct.id,
        newProduct.barcode || '',
        newProduct.name,
        newProduct.category,
        newProduct.costPriceUSD,
        newProduct.salePriceUSD,
        newProduct.stock,
        newProduct.minStock,
        newProduct.unit,
        newProduct.description || null,
        newProduct.taxType || 'exento',
        newProduct.createdAt
      ]
    }
  ];

  // If initial stock > 0, record movement
  if (newProduct.stock > 0) {
    const movementId = `mov-${Date.now()}-${newProduct.id}`;
    statements.push({
      sql: `INSERT INTO movements (id, productId, productName, type, quantity, previousStock, newStock, reason, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        movementId,
        newProduct.id,
        newProduct.name,
        'entrada',
        newProduct.stock,
        0,
        newProduct.stock,
        'Carga inicial de inventario',
        newProduct.createdAt
      ]
    });
  }

  await db.batch(statements, 'write');
  return newProduct;
}

export async function updateProduct(prod: Product): Promise<Product> {
  await db.execute({
    sql: `UPDATE products 
          SET barcode = ?, name = ?, category = ?, costPriceUSD = ?, salePriceUSD = ?, stock = ?, minStock = ?, unit = ?, description = ?, taxType = ?
          WHERE id = ?`,
    args: [
      prod.barcode || '',
      prod.name,
      prod.category,
      prod.costPriceUSD,
      prod.salePriceUSD,
      prod.stock,
      prod.minStock,
      prod.unit,
      prod.description || null,
      prod.taxType || 'exento',
      prod.id
    ]
  });
  return prod;
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  await db.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] });
  return { success: true };
}

export async function adjustStock(productId: string, newStock: number, reason: string): Promise<{ product?: Product; movement?: StockMovement; error?: string }> {
  const prodRes = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [productId] });
  const prod = prodRes.rows[0];
  if (!prod) return { error: 'Producto no encontrado' };

  const previousStock = Number(prod.stock) || 0;
  const safeNewStock = Math.max(0, newStock);
  const diff = safeNewStock - previousStock;
  const timestamp = new Date().toISOString();

  const movement: StockMovement = {
    id: `mov-${Date.now()}-${productId}`,
    productId,
    productName: String(prod.name),
    type: 'ajuste_merma',
    quantity: diff,
    previousStock,
    newStock: safeNewStock,
    reason: reason.trim() || 'Ajuste de inventario físico / merma',
    date: timestamp,
  };

  try {
    await db.batch([
      { sql: 'UPDATE products SET stock = ? WHERE id = ?', args: [safeNewStock, productId] },
      {
        sql: `INSERT INTO movements (id, productId, productName, type, quantity, previousStock, newStock, reason, date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          movement.id,
          movement.productId,
          movement.productName,
          movement.type,
          movement.quantity,
          movement.previousStock,
          movement.newStock,
          movement.reason,
          movement.date
        ]
      }
    ], 'write');

    const updatedRes = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [productId] });
    const updated = updatedRes.rows[0];
    return {
      product: {
        id: String(updated.id),
        barcode: String(updated.barcode || ''),
        name: String(updated.name),
        category: String(updated.category),
        costPriceUSD: Number(updated.costPriceUSD),
        salePriceUSD: Number(updated.salePriceUSD),
        stock: Number(updated.stock),
        minStock: Number(updated.minStock),
        unit: (String(updated.unit) as any),
        description: updated.description ? String(updated.description) : undefined,
        createdAt: String(updated.createdAt),
      },
      movement,
    };
  } catch (err: any) {
    return { error: err.message || 'Error al ajustar stock' };
  }
}

export async function restockProduct(productId: string, quantityToAdd: number, reason?: string): Promise<{ product?: Product; movement?: StockMovement; error?: string }> {
  const prodRes = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [productId] });
  const prod = prodRes.rows[0];
  if (!prod) return { error: 'Producto no encontrado' };

  const previousStock = Number(prod.stock) || 0;
  const newStock = previousStock + quantityToAdd;
  const timestamp = new Date().toISOString();

  const movement: StockMovement = {
    id: `mov-${Date.now()}-${productId}`,
    productId,
    productName: String(prod.name),
    type: 'entrada',
    quantity: quantityToAdd,
    previousStock,
    newStock,
    reason: reason?.trim() || 'Reabastecimiento de mercancía',
    date: timestamp,
  };

  try {
    await db.batch([
      { sql: 'UPDATE products SET stock = ? WHERE id = ?', args: [newStock, productId] },
      {
        sql: `INSERT INTO movements (id, productId, productName, type, quantity, previousStock, newStock, reason, date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          movement.id,
          movement.productId,
          movement.productName,
          movement.type,
          movement.quantity,
          movement.previousStock,
          movement.newStock,
          movement.reason,
          movement.date
        ]
      }
    ], 'write');

    const updatedRes = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [productId] });
    const updated = updatedRes.rows[0];
    return {
      product: {
        id: String(updated.id),
        barcode: String(updated.barcode || ''),
        name: String(updated.name),
        category: String(updated.category),
        costPriceUSD: Number(updated.costPriceUSD),
        salePriceUSD: Number(updated.salePriceUSD),
        stock: Number(updated.stock),
        minStock: Number(updated.minStock),
        unit: (String(updated.unit) as any),
        description: updated.description ? String(updated.description) : undefined,
        createdAt: String(updated.createdAt),
      },
      movement,
    };
  } catch (err: any) {
    return { error: err.message || 'Error al reabastecer stock' };
  }
}

// Customers
export async function getCustomers(): Promise<Customer[]> {
  const res = await db.execute('SELECT * FROM customers ORDER BY name ASC');
  return res.rows.map(r => ({
    id: String(r.id),
    idDocType: r.idDocType as any,
    idDocNumber: String(r.idDocNumber),
    name: String(r.name),
    phone: r.phone ? String(r.phone) : undefined,
    email: r.email ? String(r.email) : undefined,
    address: r.address ? String(r.address) : undefined,
    creditLimitUSD: r.creditLimitUSD != null ? Number(r.creditLimitUSD) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    createdAt: String(r.createdAt),
  }));
}

export async function saveCustomer(customer: { idDocType: 'V' | 'E' | 'J' | 'G'; idDocNumber: string; name: string; phone?: string; address?: string; creditLimitUSD?: number }): Promise<Customer> {
  const cleanDoc = customer.idDocNumber.trim();
  const existingRes = await db.execute({
    sql: 'SELECT * FROM customers WHERE idDocType = ? AND idDocNumber = ?',
    args: [customer.idDocType, cleanDoc]
  });
  const existing = existingRes.rows[0];

  if (existing) {
    await db.execute({
      sql: `UPDATE customers 
            SET name = ?, phone = ?, address = ?, creditLimitUSD = ?
            WHERE id = ?`,
      args: [
        customer.name.trim(),
        customer.phone?.trim() || null,
        customer.address?.trim() || null,
        customer.creditLimitUSD ?? (existing.creditLimitUSD != null ? Number(existing.creditLimitUSD) : null),
        existing.id
      ]
    });
    return {
      id: String(existing.id),
      idDocType: existing.idDocType as any,
      idDocNumber: String(existing.idDocNumber),
      name: customer.name.trim(),
      phone: customer.phone?.trim() || undefined,
      address: customer.address?.trim() || undefined,
      creditLimitUSD: customer.creditLimitUSD ?? (existing.creditLimitUSD != null ? Number(existing.creditLimitUSD) : undefined),
      createdAt: String(existing.createdAt),
    };
  } else {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      idDocType: customer.idDocType,
      idDocNumber: cleanDoc,
      name: customer.name.trim(),
      phone: customer.phone?.trim() || undefined,
      address: customer.address?.trim() || undefined,
      creditLimitUSD: customer.creditLimitUSD,
      createdAt: new Date().toISOString(),
    };
    await db.execute({
      sql: `INSERT INTO customers (id, idDocType, idDocNumber, name, phone, address, creditLimitUSD, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newCustomer.id,
        newCustomer.idDocType,
        newCustomer.idDocNumber,
        newCustomer.name,
        newCustomer.phone || null,
        newCustomer.address || null,
        newCustomer.creditLimitUSD ?? null,
        newCustomer.createdAt
      ]
    });
    return newCustomer;
  }
}

export async function updateCustomerCreditLimit(customerId: string, limitUSD?: number): Promise<void> {
  await db.execute({
    sql: 'UPDATE customers SET creditLimitUSD = ? WHERE id = ?',
    args: [limitUSD ?? null, customerId]
  });
}

// Credits & Fiados
export async function getCredits(): Promise<CreditRecord[]> {
  const res = await db.execute('SELECT * FROM credits ORDER BY date DESC');
  return res.rows.map(r => ({
    id: String(r.id),
    customerId: String(r.customerId),
    customerName: String(r.customerName),
    customerIdDoc: r.customerIdDoc ? String(r.customerIdDoc) : undefined,
    customerPhone: r.customerPhone ? String(r.customerPhone) : undefined,
    customerAddress: r.customerAddress ? String(r.customerAddress) : undefined,
    saleId: r.saleId ? String(r.saleId) : undefined,
    saleNumber: r.saleNumber ? String(r.saleNumber) : undefined,
    date: String(r.date),
    originalAmountUSD: Number(r.originalAmountUSD) || 0,
    originalAmountBs: Number(r.originalAmountBs) || 0,
    bcvRate: Number(r.bcvRate) || 1,
    currentBalanceUSD: Number(r.currentBalanceUSD) || 0,
    status: r.status as any,
    description: r.description ? String(r.description) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    payments: JSON.parse(String(r.payments || '[]')),
  }));
}

export async function createCredit(data: {
  customerId: string;
  customerName: string;
  customerIdDoc?: string;
  customerPhone?: string;
  customerAddress?: string;
  originalAmountUSD: number;
  description: string;
  notes?: string;
  saleId?: string;
  saleNumber?: string;
  bcvRate?: number;
}): Promise<CreditRecord> {
  const settings = await getSettings();
  const rate = data.bcvRate || settings.bcvRate;
  const originalAmountUSD = Number(data.originalAmountUSD);
  const originalAmountBs = originalAmountUSD * rate;

  const newCredit: CreditRecord = {
    id: `cred-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    customerId: data.customerId,
    customerName: data.customerName,
    customerIdDoc: data.customerIdDoc,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
    saleId: data.saleId,
    saleNumber: data.saleNumber,
    date: new Date().toISOString(),
    originalAmountUSD,
    originalAmountBs,
    bcvRate: rate,
    currentBalanceUSD: originalAmountUSD,
    status: 'pendiente',
    description: data.description,
    notes: data.notes,
    payments: [],
  };

  await db.execute({
    sql: `INSERT INTO credits (id, customerId, customerName, customerIdDoc, customerPhone, customerAddress, saleId, saleNumber, date, originalAmountUSD, originalAmountBs, bcvRate, currentBalanceUSD, status, description, notes, payments)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newCredit.id,
      newCredit.customerId,
      newCredit.customerName,
      newCredit.customerIdDoc || null,
      newCredit.customerPhone || null,
      newCredit.customerAddress || null,
      newCredit.saleId || null,
      newCredit.saleNumber || null,
      newCredit.date,
      newCredit.originalAmountUSD,
      newCredit.originalAmountBs,
      newCredit.bcvRate,
      newCredit.currentBalanceUSD,
      newCredit.status,
      newCredit.description || null,
      newCredit.notes || null,
      JSON.stringify(newCredit.payments)
    ]
  });

  return newCredit;
}

export async function addCreditPayment(
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
  const rowRes = await db.execute({ sql: 'SELECT * FROM credits WHERE id = ?', args: [creditRecordId] });
  const row = rowRes.rows[0];
  if (!row) return { success: false, error: 'Registro de crédito no encontrado' };

  const settings = await getSettings();
  const rate = settings.bcvRate;
  const currentBalanceUSD = Number(row.currentBalanceUSD);

  let paidUSD = 0;
  let paidBs = 0;

  if (paymentData.currency === '$') {
    paidUSD = paymentData.amountPaid;
    paidBs = paidUSD * rate;
  } else {
    paidBs = paymentData.amountPaid;
    paidUSD = paidBs / rate;
  }

  const newBalance = Math.max(0, currentBalanceUSD - paidUSD);
  const newStatus: 'pendiente' | 'parcial' | 'pagado' = newBalance <= 0.01 ? 'pagado' : 'parcial';

  const newPayment: CreditPayment = {
    id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    creditRecordId,
    customerId: String(row.customerId),
    date: new Date().toISOString(),
    amountUSD: paidUSD,
    amountBs: paidBs,
    bcvRate: rate,
    paymentMethod: paymentData.paymentMethod,
    currency: paymentData.currency,
    paymentReference: paymentData.paymentReference,
    notes: paymentData.notes,
    receivedByUserName: paymentData.receivedByUserName,
    shiftId: paymentData.shiftId,
  };

  const currentPayments: CreditPayment[] = JSON.parse(String(row.payments || '[]'));
  currentPayments.push(newPayment);

  const statements: Array<{ sql: string; args: any[] }> = [
    {
      sql: `UPDATE credits 
            SET currentBalanceUSD = ?, status = ?, payments = ?
            WHERE id = ?`,
      args: [newBalance, newStatus, JSON.stringify(currentPayments), creditRecordId]
    }
  ];

  // If registered in active cash shift and is cash payment
  if (paymentData.registerInCashDrawer && paymentData.shiftId && (paymentData.paymentMethod === 'efectivo_bs' || paymentData.paymentMethod === 'efectivo_usd')) {
    const shiftRes = await db.execute({
      sql: 'SELECT * FROM shifts WHERE id = ? AND status = ?',
      args: [paymentData.shiftId, 'abierta']
    });
    const shiftRow = shiftRes.rows[0];
    if (shiftRow) {
      const currentEntries: CashDrawerMovement[] = JSON.parse(String(shiftRow.cashEntries || '[]'));
      currentEntries.push({
        id: `cdm-${Date.now()}`,
        type: 'ingreso',
        currency: paymentData.currency,
        amount: paymentData.amountPaid,
        reason: `Abono de crédito - ${row.customerName}`,
        timestamp: new Date().toISOString(),
        performedBy: paymentData.receivedByUserName || 'Cajero',
      });
      statements.push({
        sql: 'UPDATE shifts SET cashEntries = ? WHERE id = ?',
        args: [JSON.stringify(currentEntries), paymentData.shiftId]
      });
    }
  }

  try {
    await db.batch(statements, 'write');

    const updatedCredit: CreditRecord = {
      id: String(row.id),
      customerId: String(row.customerId),
      customerName: String(row.customerName),
      customerIdDoc: row.customerIdDoc ? String(row.customerIdDoc) : undefined,
      customerPhone: row.customerPhone ? String(row.customerPhone) : undefined,
      customerAddress: row.customerAddress ? String(row.customerAddress) : undefined,
      saleId: row.saleId ? String(row.saleId) : undefined,
      saleNumber: row.saleNumber ? String(row.saleNumber) : undefined,
      date: String(row.date),
      originalAmountUSD: Number(row.originalAmountUSD),
      originalAmountBs: Number(row.originalAmountBs),
      bcvRate: Number(row.bcvRate),
      currentBalanceUSD: newBalance,
      status: newStatus,
      description: row.description ? String(row.description) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      payments: currentPayments,
    };

    return { success: true, payment: newPayment, credit: updatedCredit };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al procesar pago de crédito' };
  }
}

export async function deleteCredit(id: string): Promise<{ success: boolean }> {
  await db.execute({ sql: 'DELETE FROM credits WHERE id = ?', args: [id] });
  return { success: true };
}

// Payables & Cuentas por Pagar (Proveedores)
export async function getPayables(): Promise<PayableRecord[]> {
  const res = await db.execute('SELECT * FROM payables ORDER BY date DESC');
  return res.rows.map(r => ({
    id: String(r.id),
    supplierName: String(r.supplierName),
    supplierDoc: r.supplierDoc ? String(r.supplierDoc) : undefined,
    supplierPhone: r.supplierPhone ? String(r.supplierPhone) : undefined,
    invoiceNumber: r.invoiceNumber ? String(r.invoiceNumber) : undefined,
    description: String(r.description),
    date: String(r.date),
    dueDate: r.dueDate ? String(r.dueDate) : undefined,
    originalAmountUSD: Number(r.originalAmountUSD) || 0,
    originalAmountBs: Number(r.originalAmountBs) || 0,
    bcvRate: Number(r.bcvRate) || 1,
    currentBalanceUSD: Number(r.currentBalanceUSD) || 0,
    status: r.status as any,
    notes: r.notes ? String(r.notes) : undefined,
    payments: JSON.parse(String(r.payments || '[]')),
  }));
}

export async function createPayable(data: {
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
  const settings = await getSettings();
  const rate = data.bcvRate || settings.bcvRate;
  const originalAmountUSD = Number(data.originalAmountUSD);
  const originalAmountBs = originalAmountUSD * rate;

  const newPayable: PayableRecord = {
    id: `payb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    supplierName: data.supplierName.trim(),
    supplierDoc: data.supplierDoc?.trim() || undefined,
    supplierPhone: data.supplierPhone?.trim() || undefined,
    invoiceNumber: data.invoiceNumber?.trim() || undefined,
    description: data.description.trim(),
    date: new Date().toISOString(),
    dueDate: data.dueDate?.trim() || undefined,
    originalAmountUSD,
    originalAmountBs,
    bcvRate: rate,
    currentBalanceUSD: originalAmountUSD,
    status: 'pendiente',
    notes: data.notes?.trim() || undefined,
    payments: [],
  };

  await db.execute({
    sql: `INSERT INTO payables (id, supplierName, supplierDoc, supplierPhone, invoiceNumber, description, date, dueDate, originalAmountUSD, originalAmountBs, bcvRate, currentBalanceUSD, status, notes, payments)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newPayable.id,
      newPayable.supplierName,
      newPayable.supplierDoc || null,
      newPayable.supplierPhone || null,
      newPayable.invoiceNumber || null,
      newPayable.description,
      newPayable.date,
      newPayable.dueDate || null,
      newPayable.originalAmountUSD,
      newPayable.originalAmountBs,
      newPayable.bcvRate,
      newPayable.currentBalanceUSD,
      newPayable.status,
      newPayable.notes || null,
      JSON.stringify(newPayable.payments)
    ]
  });

  return newPayable;
}

export async function addPayablePayment(
  payableId: string,
  paymentData: {
    amountPaid: number;
    currency: 'Bs.' | '$';
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    notes?: string;
    paidByUserName?: string;
  }
): Promise<{ success: boolean; error?: string; payment?: PayablePayment; payable?: PayableRecord }> {
  const rowRes = await db.execute({ sql: 'SELECT * FROM payables WHERE id = ?', args: [payableId] });
  const row = rowRes.rows[0];
  if (!row) return { success: false, error: 'Cuenta por pagar no encontrada' };

  const settings = await getSettings();
  const rate = settings.bcvRate;
  const currentBalanceUSD = Number(row.currentBalanceUSD);

  let paidUSD = 0;
  let paidBs = 0;

  if (paymentData.currency === '$') {
    paidUSD = paymentData.amountPaid;
    paidBs = paidUSD * rate;
  } else {
    paidBs = paymentData.amountPaid;
    paidUSD = paidBs / rate;
  }

  const newBalance = Math.max(0, currentBalanceUSD - paidUSD);
  const newStatus: 'pendiente' | 'parcial' | 'pagado' = newBalance <= 0.01 ? 'pagado' : 'parcial';

  const newPayment: PayablePayment = {
    id: `paybp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    payableId,
    date: new Date().toISOString(),
    amountUSD: paidUSD,
    amountBs: paidBs,
    bcvRate: rate,
    paymentMethod: paymentData.paymentMethod,
    currency: paymentData.currency,
    paymentReference: paymentData.paymentReference?.trim(),
    notes: paymentData.notes?.trim(),
    paidByUserName: paymentData.paidByUserName,
  };

  const currentPayments: PayablePayment[] = JSON.parse(String(row.payments || '[]'));
  currentPayments.push(newPayment);

  await db.execute({
    sql: `UPDATE payables 
          SET currentBalanceUSD = ?, status = ?, payments = ?
          WHERE id = ?`,
    args: [newBalance, newStatus, JSON.stringify(currentPayments), payableId]
  });

  const updatedPayable: PayableRecord = {
    id: String(row.id),
    supplierName: String(row.supplierName),
    supplierDoc: row.supplierDoc ? String(row.supplierDoc) : undefined,
    supplierPhone: row.supplierPhone ? String(row.supplierPhone) : undefined,
    invoiceNumber: row.invoiceNumber ? String(row.invoiceNumber) : undefined,
    description: String(row.description),
    date: String(row.date),
    dueDate: row.dueDate ? String(row.dueDate) : undefined,
    originalAmountUSD: Number(row.originalAmountUSD),
    originalAmountBs: Number(row.originalAmountBs),
    bcvRate: Number(row.bcvRate),
    currentBalanceUSD: newBalance,
    status: newStatus,
    notes: row.notes ? String(row.notes) : undefined,
    payments: currentPayments,
  };

  return { success: true, payment: newPayment, payable: updatedPayable };
}

export async function deletePayable(id: string): Promise<{ success: boolean }> {
  await db.execute({ sql: 'DELETE FROM payables WHERE id = ?', args: [id] });
  return { success: true };
}

// Sales
export async function getSales(): Promise<Sale[]> {
  const res = await db.execute('SELECT * FROM sales ORDER BY date DESC');
  return res.rows.map(r => ({
    id: String(r.id),
    saleNumber: String(r.saleNumber),
    date: String(r.date),
    items: JSON.parse(String(r.items || '[]')),
    bcvRate: Number(r.bcvRate) || 1,
    subtotalUSD: Number(r.subtotalUSD) || 0,
    discountUSD: Number(r.discountUSD) || 0,
    totalUSD: Number(r.totalUSD) || 0,
    totalCostUSD: Number(r.totalCostUSD) || 0,
    profitUSD: Number(r.profitUSD) || 0,
    subtotalBs: Number(r.subtotalBs) || 0,
    discountBs: Number(r.discountBs) || 0,
    totalBs: Number(r.totalBs) || 0,
    profitBs: Number(r.profitBs) || 0,
    exemptAmountUSD: r.exemptAmountUSD !== undefined && r.exemptAmountUSD !== null ? Number(r.exemptAmountUSD) : undefined,
    exemptAmountBs: r.exemptAmountBs !== undefined && r.exemptAmountBs !== null ? Number(r.exemptAmountBs) : undefined,
    taxableAmountUSD: r.taxableAmountUSD !== undefined && r.taxableAmountUSD !== null ? Number(r.taxableAmountUSD) : undefined,
    taxableAmountBs: r.taxableAmountBs !== undefined && r.taxableAmountBs !== null ? Number(r.taxableAmountBs) : undefined,
    vatAmountUSD: r.vatAmountUSD !== undefined && r.vatAmountUSD !== null ? Number(r.vatAmountUSD) : undefined,
    vatAmountBs: r.vatAmountBs !== undefined && r.vatAmountBs !== null ? Number(r.vatAmountBs) : undefined,
    igtfAmountUSD: r.igtfAmountUSD !== undefined && r.igtfAmountUSD !== null ? Number(r.igtfAmountUSD) : undefined,
    igtfAmountBs: r.igtfAmountBs !== undefined && r.igtfAmountBs !== null ? Number(r.igtfAmountBs) : undefined,
    paymentMethod: r.paymentMethod as any,
    paymentCurrency: r.paymentCurrency as any,
    paymentReference: r.paymentReference ? String(r.paymentReference) : undefined,
    paymentSplits: r.paymentSplits ? JSON.parse(String(r.paymentSplits)) : undefined,
    amountPaid: Number(r.amountPaid) || 0,
    changeBs: Number(r.changeBs) || 0,
    changeUSD: Number(r.changeUSD) || 0,
    customerName: r.customerName ? String(r.customerName) : undefined,
    customerIdDoc: r.customerIdDoc ? String(r.customerIdDoc) : undefined,
    customerPhone: r.customerPhone ? String(r.customerPhone) : undefined,
    customerAddress: r.customerAddress ? String(r.customerAddress) : undefined,
    cashierName: r.cashierName ? String(r.cashierName) : undefined,
    shiftId: r.shiftId ? String(r.shiftId) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    status: r.status as any,
  }));
}

export async function createSale(sale: Sale): Promise<{ success: boolean; sale?: Sale; error?: string }> {
  try {
    const statements: Array<{ sql: string; args: any[] }> = [
      {
        sql: `INSERT INTO sales (
          id, saleNumber, date, items, bcvRate, subtotalUSD, discountUSD, totalUSD,
          totalCostUSD, profitUSD, subtotalBs, discountBs, totalBs, profitBs,
          exemptAmountUSD, exemptAmountBs, taxableAmountUSD, taxableAmountBs,
          vatAmountUSD, vatAmountBs, igtfAmountUSD, igtfAmountBs,
          paymentMethod, paymentCurrency, paymentReference, paymentSplits,
          amountPaid, changeBs, changeUSD, customerName, customerIdDoc,
          customerPhone, customerAddress, cashierName, shiftId, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sale.id,
          sale.saleNumber,
          sale.date,
          JSON.stringify(sale.items),
          sale.bcvRate,
          sale.subtotalUSD,
          sale.discountUSD,
          sale.totalUSD,
          sale.totalCostUSD,
          sale.profitUSD,
          sale.subtotalBs,
          sale.discountBs,
          sale.totalBs,
          sale.profitBs,
          sale.exemptAmountUSD || 0,
          sale.exemptAmountBs || 0,
          sale.taxableAmountUSD || 0,
          sale.taxableAmountBs || 0,
          sale.vatAmountUSD || 0,
          sale.vatAmountBs || 0,
          sale.igtfAmountUSD || 0,
          sale.igtfAmountBs || 0,
          sale.paymentMethod,
          sale.paymentCurrency,
          sale.paymentReference || null,
          sale.paymentSplits ? JSON.stringify(sale.paymentSplits) : null,
          sale.amountPaid,
          sale.changeBs,
          sale.changeUSD,
          sale.customerName || null,
          sale.customerIdDoc || null,
          sale.customerPhone || null,
          sale.customerAddress || null,
          sale.cashierName || null,
          sale.shiftId || null,
          sale.notes || null,
          sale.status
        ]
      }
    ];

    // 2. Decrement product stock & record stock movements
    for (const item of sale.items) {
      const prodRes = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [item.productId] });
      const prod = prodRes.rows[0];
      if (prod) {
        const prevStock = Number(prod.stock) || 0;
        const newStock = Math.max(0, prevStock - item.quantity);
        statements.push({
          sql: 'UPDATE products SET stock = ? WHERE id = ?',
          args: [newStock, item.productId]
        });

        const movementId = `mov-${Date.now()}-${item.productId}-${Math.random().toString(36).substr(2, 4)}`;
        statements.push({
          sql: `INSERT INTO movements (id, productId, productName, type, quantity, previousStock, newStock, reason, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            movementId,
            item.productId,
            item.productName,
            'salida_venta',
            -item.quantity,
            prevStock,
            newStock,
            `Venta ${sale.saleNumber}`,
            sale.date
          ]
        });
      }
    }

    // 3. If paymentMethod is fiado, register credit
    const isFiado = sale.paymentMethod === 'fiado';
    const fiadoSplit = sale.paymentSplits?.find(s => s.method === 'fiado');
    if (isFiado || fiadoSplit) {
      const fiadoAmountUSD = isFiado ? sale.totalUSD : (fiadoSplit?.amountUSD || 0);
      const fiadoAmountBs = isFiado ? sale.totalBs : (fiadoSplit?.amountBs || 0);

      let customerId = `cust-${Date.now()}`;
      if (sale.customerIdDoc) {
        const docParts = sale.customerIdDoc.split('-');
        const docType = (docParts[0] || 'V') as any;
        const docNum = docParts[1] || sale.customerIdDoc;
        const custRes = await db.execute({
          sql: 'SELECT id FROM customers WHERE idDocType = ? AND idDocNumber = ?',
          args: [docType, docNum]
        });
        const cust = custRes.rows[0];
        if (cust) {
          customerId = String(cust.id);
        } else {
          statements.push({
            sql: `INSERT INTO customers (id, idDocType, idDocNumber, name, phone, address, createdAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [customerId, docType, docNum, sale.customerName || 'Cliente a Crédito', sale.customerPhone || null, sale.customerAddress || null, sale.date]
          });
        }
      }

      const creditId = `cred-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const desc = sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ');
      statements.push({
        sql: `INSERT INTO credits (id, customerId, customerName, customerIdDoc, customerPhone, customerAddress, saleId, saleNumber, date, originalAmountUSD, originalAmountBs, bcvRate, currentBalanceUSD, status, description, notes, payments)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          creditId,
          customerId,
          sale.customerName || 'Cliente a Crédito',
          sale.customerIdDoc || null,
          sale.customerPhone || null,
          sale.customerAddress || null,
          sale.id,
          sale.saleNumber,
          sale.date,
          fiadoAmountUSD,
          fiadoAmountBs,
          sale.bcvRate,
          fiadoAmountUSD,
          'pendiente',
          desc,
          sale.notes || `Crédito originado desde venta ${sale.saleNumber}`,
          '[]'
        ]
      });
    }

    await db.batch(statements, 'write');
    return { success: true, sale };
  } catch (err: any) {
    console.error('Error creating sale in DB', err);
    return { success: false, error: err.message || 'Error al registrar venta en Base de Datos' };
  }
}

export async function cancelSale(saleId: string, reason?: string, cancelledBy?: string): Promise<{ success: boolean; error?: string }> {
  const saleRes = await db.execute({ sql: 'SELECT * FROM sales WHERE id = ?', args: [saleId] });
  const sale = saleRes.rows[0];
  if (!sale) return { success: false, error: 'Venta no encontrada' };
  if (sale.status === 'anulada') return { success: false, error: 'La venta ya se encuentra anulada' };

  try {
    const now = new Date().toISOString();
    const finalReason = reason?.trim() || 'Anulación solicitada por el usuario';
    const finalCancelledBy = cancelledBy?.trim() || 'Administrador';

    const statements: Array<{ sql: string; args: any[] }> = [
      { 
        sql: 'UPDATE sales SET status = ?, cancelledReason = ?, cancelledAt = ?, cancelledBy = ? WHERE id = ?', 
        args: ['anulada', finalReason, now, finalCancelledBy, saleId] 
      }
    ];

    const items = JSON.parse(String(sale.items || '[]'));
    for (const item of items) {
      const prodRes = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [item.productId] });
      const prod = prodRes.rows[0];
      if (prod) {
        const prevStock = Number(prod.stock) || 0;
        const newStock = prevStock + item.quantity;
        statements.push({
          sql: 'UPDATE products SET stock = ? WHERE id = ?',
          args: [newStock, item.productId]
        });

        const movementId = `mov-${Date.now()}-${item.productId}-${Math.random().toString(36).substr(2, 4)}`;
        statements.push({
          sql: `INSERT INTO movements (id, productId, productName, type, quantity, previousStock, newStock, reason, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            movementId,
            item.productId,
            item.productName,
            'devolucion_anulada',
            item.quantity,
            prevStock,
            newStock,
            `Anulación de Venta ${sale.saleNumber}: ${finalReason}`,
            now
          ]
        });
      }
    }

    // Delete credit created for this sale
    statements.push({ sql: 'DELETE FROM credits WHERE saleId = ?', args: [saleId] });

    await db.batch(statements, 'write');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al anular venta' };
  }
}

// Movements
export async function getMovements(): Promise<StockMovement[]> {
  const res = await db.execute('SELECT * FROM movements ORDER BY date DESC LIMIT 500');
  return res.rows.map(r => ({
    id: String(r.id),
    productId: String(r.productId),
    productName: String(r.productName),
    type: r.type as any,
    quantity: Number(r.quantity) || 0,
    previousStock: Number(r.previousStock) || 0,
    newStock: Number(r.newStock) || 0,
    reason: String(r.reason),
    date: String(r.date),
  }));
}

// Shifts
export async function getShifts(): Promise<CashShift[]> {
  const res = await db.execute('SELECT * FROM shifts ORDER BY openedAt DESC');
  return res.rows.map(r => ({
    id: String(r.id),
    shiftNumber: Number(r.shiftNumber),
    openedAt: String(r.openedAt),
    closedAt: r.closedAt ? String(r.closedAt) : undefined,
    openedByUserId: String(r.openedByUserId),
    openedByUserName: String(r.openedByUserName),
    closedByUserId: r.closedByUserId ? String(r.closedByUserId) : undefined,
    closedByUserName: r.closedByUserName ? String(r.closedByUserName) : undefined,
    initialCashBs: Number(r.initialCashBs) || 0,
    initialCashUSD: Number(r.initialCashUSD) || 0,
    cashEntries: JSON.parse(String(r.cashEntries || '[]')),
    status: r.status as any,
    expectedCashBs: r.expectedCashBs != null ? Number(r.expectedCashBs) : undefined,
    expectedCashUSD: r.expectedCashUSD != null ? Number(r.expectedCashUSD) : undefined,
    countedCashBs: r.countedCashBs != null ? Number(r.countedCashBs) : undefined,
    countedCashUSD: r.countedCashUSD != null ? Number(r.countedCashUSD) : undefined,
    differenceBs: r.differenceBs != null ? Number(r.differenceBs) : undefined,
    differenceUSD: r.differenceUSD != null ? Number(r.differenceUSD) : undefined,
    totalSalesCount: r.totalSalesCount != null ? Number(r.totalSalesCount) : undefined,
    totalSalesBs: r.totalSalesBs != null ? Number(r.totalSalesBs) : undefined,
    totalSalesUSD: r.totalSalesUSD != null ? Number(r.totalSalesUSD) : undefined,
    paymentSummary: r.paymentSummary ? JSON.parse(String(r.paymentSummary)) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
  }));
}

export async function getCurrentShift(): Promise<CashShift | null> {
  const res = await db.execute("SELECT * FROM shifts WHERE status = 'abierta' ORDER BY openedAt DESC LIMIT 1");
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    shiftNumber: Number(row.shiftNumber),
    openedAt: String(row.openedAt),
    closedAt: row.closedAt ? String(row.closedAt) : undefined,
    openedByUserId: String(row.openedByUserId),
    openedByUserName: String(row.openedByUserName),
    closedByUserId: row.closedByUserId ? String(row.closedByUserId) : undefined,
    closedByUserName: row.closedByUserName ? String(row.closedByUserName) : undefined,
    initialCashBs: Number(row.initialCashBs) || 0,
    initialCashUSD: Number(row.initialCashUSD) || 0,
    cashEntries: JSON.parse(String(row.cashEntries || '[]')),
    status: row.status as any,
    expectedCashBs: row.expectedCashBs != null ? Number(row.expectedCashBs) : undefined,
    expectedCashUSD: row.expectedCashUSD != null ? Number(row.expectedCashUSD) : undefined,
    countedCashBs: row.countedCashBs != null ? Number(row.countedCashBs) : undefined,
    countedCashUSD: row.countedCashUSD != null ? Number(row.countedCashUSD) : undefined,
    differenceBs: row.differenceBs != null ? Number(row.differenceBs) : undefined,
    differenceUSD: row.differenceUSD != null ? Number(row.differenceUSD) : undefined,
    totalSalesCount: row.totalSalesCount != null ? Number(row.totalSalesCount) : undefined,
    totalSalesBs: row.totalSalesBs != null ? Number(row.totalSalesBs) : undefined,
    totalSalesUSD: row.totalSalesUSD != null ? Number(row.totalSalesUSD) : undefined,
    paymentSummary: row.paymentSummary ? JSON.parse(String(row.paymentSummary)) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
  };
}

export async function openShift(params: {
  userId: string;
  userName: string;
  initialCashBs: number;
  initialCashUSD: number;
  notes?: string;
}): Promise<{ success: boolean; shift?: CashShift; error?: string }> {
  const existing = await getCurrentShift();
  if (existing) {
    return { success: false, error: 'Ya existe un turno de caja abierto en el sistema.' };
  }

  const countRes = await db.execute('SELECT COUNT(*) as count FROM shifts');
  const shiftCount = Number(countRes.rows[0]?.count) || 0;
  const newShift: CashShift = {
    id: `shift-${Date.now()}`,
    shiftNumber: shiftCount + 1,
    openedAt: new Date().toISOString(),
    openedByUserId: params.userId,
    openedByUserName: params.userName,
    initialCashBs: params.initialCashBs,
    initialCashUSD: params.initialCashUSD,
    cashEntries: [],
    status: 'abierta',
    notes: params.notes,
  };

  await db.execute({
    sql: `INSERT INTO shifts (id, shiftNumber, openedAt, openedByUserId, openedByUserName, initialCashBs, initialCashUSD, cashEntries, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newShift.id,
      newShift.shiftNumber,
      newShift.openedAt,
      newShift.openedByUserId,
      newShift.openedByUserName,
      newShift.initialCashBs,
      newShift.initialCashUSD,
      '[]',
      newShift.status,
      newShift.notes || null
    ]
  });

  return { success: true, shift: newShift };
}

export async function closeShift(params: {
  shiftId: string;
  userId: string;
  userName: string;
  countedCashBs: number;
  countedCashUSD: number;
  notes?: string;
}): Promise<{ success: boolean; shift?: CashShift; error?: string }> {
  const shiftRes = await db.execute({ sql: 'SELECT * FROM shifts WHERE id = ?', args: [params.shiftId] });
  const row = shiftRes.rows[0];
  if (!row) return { success: false, error: 'Turno de caja no encontrado' };

  const cashEntries: CashDrawerMovement[] = JSON.parse(String(row.cashEntries || '[]'));

  // Calculate movements
  const netMovementsBs = cashEntries.reduce((sum, e) => {
    if (e.currency === 'Bs.') return e.type === 'ingreso' ? sum + e.amount : sum - e.amount;
    return sum;
  }, 0);

  const netMovementsUSD = cashEntries.reduce((sum, e) => {
    if (e.currency === '$') return e.type === 'ingreso' ? sum + e.amount : sum - e.amount;
    return sum;
  }, 0);

  // Sales in this shift
  const salesRowsRes = await db.execute({
    sql: "SELECT * FROM sales WHERE shiftId = ? AND status = 'completada'",
    args: [params.shiftId]
  });
  const sales = salesRowsRes.rows.map(r => {
    const raw = r as any;
    return {
      ...raw,
      items: JSON.parse(String(raw.items || '[]')),
      paymentSplits: raw.paymentSplits ? JSON.parse(String(raw.paymentSplits)) : undefined,
    } as any;
  });

  let efectivoBsSales = 0;
  let efectivoUSDSales = 0;
  let pagoMovilBsSales = 0;
  let puntoDebitoBsSales = 0;
  let transferenciaBsSales = 0;
  let fiadoBsSales = 0;
  let fiadoUSDSales = 0;

  for (const s of sales) {
    if (s.paymentSplits && s.paymentSplits.length > 0) {
      for (const split of s.paymentSplits) {
        if (split.method === 'efectivo_bs') efectivoBsSales += split.amountBs;
        else if (split.method === 'efectivo_usd') efectivoUSDSales += split.amountUSD;
        else if (split.method === 'pago_movil') pagoMovilBsSales += split.amountBs;
        else if (split.method === 'punto_debito') puntoDebitoBsSales += split.amountBs;
        else if (split.method === 'transferencia') transferenciaBsSales += split.amountBs;
        else if (split.method === 'fiado') {
          fiadoBsSales += split.amountBs;
          fiadoUSDSales += split.amountUSD;
        }
      }
    } else {
      if (s.paymentMethod === 'efectivo_bs') efectivoBsSales += (Number(s.amountPaid) - (Number(s.changeBs) || 0));
      else if (s.paymentMethod === 'efectivo_usd') efectivoUSDSales += (Number(s.amountPaid) - (Number(s.changeUSD) || 0));
      else if (s.paymentMethod === 'pago_movil') pagoMovilBsSales += Number(s.totalBs);
      else if (s.paymentMethod === 'punto_debito') puntoDebitoBsSales += Number(s.totalBs);
      else if (s.paymentMethod === 'transferencia') transferenciaBsSales += Number(s.totalBs);
      else if (s.paymentMethod === 'fiado') {
        fiadoBsSales += Number(s.totalBs);
        fiadoUSDSales += Number(s.totalUSD);
      }
    }
  }

  const expectedCashBs = Number(row.initialCashBs) + netMovementsBs + efectivoBsSales;
  const expectedCashUSD = Number(row.initialCashUSD) + netMovementsUSD + efectivoUSDSales;

  const differenceBs = params.countedCashBs - expectedCashBs;
  const differenceUSD = params.countedCashUSD - expectedCashUSD;

  const totalSalesCount = sales.length;
  const totalSalesBs = sales.reduce((sum, s) => sum + Number(s.totalBs), 0);
  const totalSalesUSD = sales.reduce((sum, s) => sum + Number(s.totalUSD), 0);

  const paymentSummary = {
    efectivoBs: efectivoBsSales,
    efectivoUSD: efectivoUSDSales,
    pagoMovilBs: pagoMovilBsSales,
    puntoDebitoBs: puntoDebitoBsSales,
    transferenciaBs: transferenciaBsSales,
    fiadoBs: fiadoBsSales,
    fiadoUSD: fiadoUSDSales,
  };

  const closedAt = new Date().toISOString();

  await db.execute({
    sql: `UPDATE shifts SET 
          closedAt = ?, closedByUserId = ?, closedByUserName = ?,
          status = 'cerrada', expectedCashBs = ?, expectedCashUSD = ?,
          countedCashBs = ?, countedCashUSD = ?, differenceBs = ?, differenceUSD = ?,
          totalSalesCount = ?, totalSalesBs = ?, totalSalesUSD = ?,
          paymentSummary = ?, notes = ?
        WHERE id = ?`,
    args: [
      closedAt,
      params.userId,
      params.userName,
      expectedCashBs,
      expectedCashUSD,
      params.countedCashBs,
      params.countedCashUSD,
      differenceBs,
      differenceUSD,
      totalSalesCount,
      totalSalesBs,
      totalSalesUSD,
      JSON.stringify(paymentSummary),
      params.notes || row.notes || null,
      params.shiftId
    ]
  });

  const closedShift: CashShift = {
    id: String(row.id),
    shiftNumber: Number(row.shiftNumber),
    openedAt: String(row.openedAt),
    closedAt,
    openedByUserId: String(row.openedByUserId),
    openedByUserName: String(row.openedByUserName),
    closedByUserId: params.userId,
    closedByUserName: params.userName,
    initialCashBs: Number(row.initialCashBs),
    initialCashUSD: Number(row.initialCashUSD),
    cashEntries,
    status: 'cerrada',
    expectedCashBs,
    expectedCashUSD,
    countedCashBs: params.countedCashBs,
    countedCashUSD: params.countedCashUSD,
    differenceBs,
    differenceUSD,
    totalSalesCount,
    totalSalesBs,
    totalSalesUSD,
    paymentSummary,
    notes: params.notes || (row.notes ? String(row.notes) : undefined),
  };

  return { success: true, shift: closedShift };
}

export async function addCashMovementToShift(shiftId: string, movement: { type: 'ingreso' | 'egreso'; currency: 'Bs.' | '$'; amount: number; reason: string; performedBy: string }): Promise<{ success: boolean; error?: string }> {
  const shiftRes = await db.execute({
    sql: "SELECT * FROM shifts WHERE id = ? AND status = 'abierta'",
    args: [shiftId]
  });
  const row = shiftRes.rows[0];
  if (!row) return { success: false, error: 'Turno no encontrado o ya está cerrado' };

  const entries: CashDrawerMovement[] = JSON.parse(String(row.cashEntries || '[]'));
  entries.push({
    id: `cdm-${Date.now()}`,
    type: movement.type,
    currency: movement.currency,
    amount: movement.amount,
    reason: movement.reason,
    timestamp: new Date().toISOString(),
    performedBy: movement.performedBy,
  });

  await db.execute({
    sql: 'UPDATE shifts SET cashEntries = ? WHERE id = ?',
    args: [JSON.stringify(entries), shiftId]
  });
  return { success: true };
}

// Users
export async function getUsers(): Promise<UserAccount[]> {
  const res = await db.execute('SELECT * FROM users');
  return res.rows.map(r => ({
    id: String(r.id),
    username: String(r.username),
    name: String(r.name),
    role: r.role as any,
    pin: r.pin ? String(r.pin) : undefined,
  }));
}

export async function updateUserPin(userId: string, pin: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    await db.execute({ sql: 'UPDATE users SET pin = ? WHERE id = ?', args: [pin, userId] });
    const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [userId] });
    const updated = userRes.rows[0];
    if (updated) {
      return {
        success: true,
        user: {
          id: String(updated.id),
          username: String(updated.username),
          name: String(updated.name),
          role: updated.role as any,
          pin: updated.pin ? String(updated.pin) : undefined,
        },
      };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Reset everything to ZERO records (clean start)
export async function resetDatabaseToZero(): Promise<{ success: boolean; error?: string }> {
  try {
    const statements: Array<{ sql: string; args?: any[] }> = [
      { sql: 'DELETE FROM products' },
      { sql: 'DELETE FROM sales' },
      { sql: 'DELETE FROM movements' },
      { sql: 'DELETE FROM customers' },
      { sql: 'DELETE FROM credits' },
      { sql: 'DELETE FROM payables' },
      { sql: 'DELETE FROM shifts' },
      { sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', args: ['current', JSON.stringify(DEFAULT_SETTINGS)] }
    ];

    for (const cat of DEFAULT_CATEGORIES) {
      statements.push({ sql: 'INSERT OR IGNORE INTO categories (name) VALUES (?)', args: [cat] });
    }

    for (const u of DEFAULT_USERS) {
      statements.push({
        sql: 'INSERT OR IGNORE INTO users (id, username, name, role, pin) VALUES (?, ?, ?, ?, ?)',
        args: [u.id, u.username, u.name, u.role, u.pin || null]
      });
    }

    await db.batch(statements as any, 'write');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Restore entire backup data into SQLite atomically
export async function restoreFullBackup(data: any): Promise<{ success: boolean; error?: string }> {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Datos de respaldo inválidos o vacíos.' };
  }

  try {
    const statements: Array<{ sql: string; args?: any[] }> = [];

    // 1. Categories
    if (Array.isArray(data.categories)) {
      statements.push({ sql: 'DELETE FROM categories' });
      for (const cat of data.categories) {
        if (typeof cat === 'string' && cat.trim()) {
          statements.push({ sql: 'INSERT OR IGNORE INTO categories (name) VALUES (?)', args: [cat.trim()] });
        }
      }
    }

    // 2. Products
    if (Array.isArray(data.products)) {
      statements.push({ sql: 'DELETE FROM products' });
      for (const p of data.products) {
        statements.push({
          sql: `INSERT OR REPLACE INTO products (id, barcode, name, category, costPriceUSD, salePriceUSD, stock, minStock, unit, description, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            p.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            p.barcode || '',
            p.name || 'Producto sin nombre',
            p.category || 'Otros',
            Number(p.costPriceUSD) || 0,
            Number(p.salePriceUSD) || 0,
            Number(p.stock) || 0,
            Number(p.minStock) || 0,
            p.unit || 'unidad',
            p.description || null,
            p.createdAt || new Date().toISOString()
          ]
        });
      }
    }

    // 3. Customers
    if (Array.isArray(data.customers)) {
      statements.push({ sql: 'DELETE FROM customers' });
      for (const c of data.customers) {
        statements.push({
          sql: `INSERT OR REPLACE INTO customers (id, idDocType, idDocNumber, name, phone, email, address, creditLimitUSD, notes, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            c.id || `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            c.idDocType || 'V',
            c.idDocNumber || '',
            c.name || 'Cliente',
            c.phone || null,
            c.email || null,
            c.address || null,
            c.creditLimitUSD != null ? Number(c.creditLimitUSD) : null,
            c.notes || null,
            c.createdAt || new Date().toISOString()
          ]
        });
      }
    }

    // 4. Credits
    if (Array.isArray(data.credits)) {
      statements.push({ sql: 'DELETE FROM credits' });
      for (const cr of data.credits) {
        statements.push({
          sql: `INSERT OR REPLACE INTO credits (id, customerId, customerName, customerIdDoc, customerPhone, customerAddress, saleId, saleNumber, date, originalAmountUSD, originalAmountBs, bcvRate, currentBalanceUSD, status, description, notes, payments)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            cr.id || `cred-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            cr.customerId || 'cust-general',
            cr.customerName || 'Cliente',
            cr.customerIdDoc || null,
            cr.customerPhone || null,
            cr.customerAddress || null,
            cr.saleId || null,
            cr.saleNumber || null,
            cr.date || new Date().toISOString(),
            Number(cr.originalAmountUSD) || 0,
            Number(cr.originalAmountBs) || 0,
            Number(cr.bcvRate) || 1,
            Number(cr.currentBalanceUSD) || 0,
            cr.status || 'pendiente',
            cr.description || null,
            cr.notes || null,
            typeof cr.payments === 'string' ? cr.payments : JSON.stringify(cr.payments || [])
          ]
        });
      }
    }

    // 5. Payables
    if (Array.isArray(data.payables)) {
      statements.push({ sql: 'DELETE FROM payables' });
      for (const py of data.payables) {
        statements.push({
          sql: `INSERT OR REPLACE INTO payables (id, supplierName, supplierDoc, supplierPhone, invoiceNumber, description, date, dueDate, originalAmountUSD, originalAmountBs, bcvRate, currentBalanceUSD, status, notes, payments)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            py.id || `payb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            py.supplierName || 'Proveedor',
            py.supplierDoc || null,
            py.supplierPhone || null,
            py.invoiceNumber || null,
            py.description || 'Cuenta por pagar',
            py.date || new Date().toISOString(),
            py.dueDate || null,
            Number(py.originalAmountUSD) || 0,
            Number(py.originalAmountBs) || 0,
            Number(py.bcvRate) || 1,
            Number(py.currentBalanceUSD) || 0,
            py.status || 'pendiente',
            py.notes || null,
            typeof py.payments === 'string' ? py.payments : JSON.stringify(py.payments || [])
          ]
        });
      }
    }

    // 6. Sales
    if (Array.isArray(data.sales)) {
      statements.push({ sql: 'DELETE FROM sales' });
      for (const s of data.sales) {
        statements.push({
          sql: `INSERT OR REPLACE INTO sales (
            id, saleNumber, date, items, bcvRate, subtotalUSD, discountUSD, totalUSD,
            totalCostUSD, profitUSD, subtotalBs, discountBs, totalBs, profitBs,
            paymentMethod, paymentCurrency, paymentReference, paymentSplits,
            amountPaid, changeBs, changeUSD, customerName, customerIdDoc,
            customerPhone, customerAddress, cashierName, shiftId, notes, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            s.id || `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            s.saleNumber || '000001',
            s.date || new Date().toISOString(),
            typeof s.items === 'string' ? s.items : JSON.stringify(s.items || []),
            Number(s.bcvRate) || 1,
            Number(s.subtotalUSD) || 0,
            Number(s.discountUSD) || 0,
            Number(s.totalUSD) || 0,
            Number(s.totalCostUSD) || 0,
            Number(s.profitUSD) || 0,
            Number(s.subtotalBs) || 0,
            Number(s.discountBs) || 0,
            Number(s.totalBs) || 0,
            Number(s.profitBs) || 0,
            s.paymentMethod || 'efectivo_bs',
            s.paymentCurrency || 'Bs.',
            s.paymentReference || null,
            s.paymentSplits ? (typeof s.paymentSplits === 'string' ? s.paymentSplits : JSON.stringify(s.paymentSplits)) : null,
            Number(s.amountPaid) || 0,
            Number(s.changeBs) || 0,
            Number(s.changeUSD) || 0,
            s.customerName || null,
            s.customerIdDoc || null,
            s.customerPhone || null,
            s.customerAddress || null,
            s.cashierName || null,
            s.shiftId || null,
            s.notes || null,
            s.status || 'completada'
          ]
        });
      }
    }

    // 7. Movements
    if (Array.isArray(data.movements)) {
      statements.push({ sql: 'DELETE FROM movements' });
      for (const m of data.movements) {
        statements.push({
          sql: `INSERT OR REPLACE INTO movements (id, productId, productName, type, quantity, previousStock, newStock, reason, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            m.id || `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            m.productId || '',
            m.productName || 'Producto',
            m.type || 'ajuste_merma',
            Number(m.quantity) || 0,
            Number(m.previousStock) || 0,
            Number(m.newStock) || 0,
            m.reason || 'Movimiento de inventario',
            m.date || new Date().toISOString()
          ]
        });
      }
    }

    // 8. Shifts
    if (Array.isArray(data.shifts)) {
      statements.push({ sql: 'DELETE FROM shifts' });
      for (const sh of data.shifts) {
        statements.push({
          sql: `INSERT OR REPLACE INTO shifts (
            id, shiftNumber, openedAt, closedAt, openedByUserId, openedByUserName,
            closedByUserId, closedByUserName, initialCashBs, initialCashUSD,
            cashEntries, status, expectedCashBs, expectedCashUSD, countedCashBs,
            countedCashUSD, differenceBs, differenceUSD, totalSalesCount,
            totalSalesBs, totalSalesUSD, paymentSummary, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            sh.id || `shift-${Date.now()}`,
            Number(sh.shiftNumber) || 1,
            sh.openedAt || new Date().toISOString(),
            sh.closedAt || null,
            sh.openedByUserId || 'user-admin',
            sh.openedByUserName || 'Administrador',
            sh.closedByUserId || null,
            sh.closedByUserName || null,
            Number(sh.initialCashBs) || 0,
            Number(sh.initialCashUSD) || 0,
            typeof sh.cashEntries === 'string' ? sh.cashEntries : JSON.stringify(sh.cashEntries || []),
            sh.status || 'abierta',
            sh.expectedCashBs != null ? Number(sh.expectedCashBs) : null,
            sh.expectedCashUSD != null ? Number(sh.expectedCashUSD) : null,
            sh.countedCashBs != null ? Number(sh.countedCashBs) : null,
            sh.countedCashUSD != null ? Number(sh.countedCashUSD) : null,
            sh.differenceBs != null ? Number(sh.differenceBs) : null,
            sh.differenceUSD != null ? Number(sh.differenceUSD) : null,
            sh.totalSalesCount != null ? Number(sh.totalSalesCount) : null,
            sh.totalSalesBs != null ? Number(sh.totalSalesBs) : null,
            sh.totalSalesUSD != null ? Number(sh.totalSalesUSD) : null,
            sh.paymentSummary ? (typeof sh.paymentSummary === 'string' ? sh.paymentSummary : JSON.stringify(sh.paymentSummary)) : null,
            sh.notes || null
          ]
        });
      }
    }

    // 9. Settings
    if (data.settings && typeof data.settings === 'object') {
      const current = await getSettings();
      const merged = { ...current, ...data.settings };
      statements.push({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: ['current', JSON.stringify(merged)]
      });
    }

    await db.batch(statements as any, 'write');
    return { success: true };
  } catch (err: any) {
    console.error('Error in restoreFullBackup:', err);
    return { success: false, error: err.message || 'Error al restaurar respaldo en Base de Datos' };
  }
}

// Full State snapshot for instant client sync
export async function getFullState() {
  const [
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
    settings
  ] = await Promise.all([
    getProducts(),
    getCategories(),
    getCustomers(),
    getCredits(),
    getPayables(),
    getSales(),
    getMovements(),
    getShifts(),
    getCurrentShift(),
    getUsers(),
    getSettings(),
  ]);

  return {
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
  };
}



