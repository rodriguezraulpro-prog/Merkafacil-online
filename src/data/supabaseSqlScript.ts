export const SUPABASE_SQL_SCRIPT = `-- ============================================================================
-- SCRIPT MAESTRO DE BASE DE DATOS: MERKAFACIL POS & INVENTARIO (SUPABASE)
-- Motor: PostgreSQL (Supabase Cloud)
-- Instrucciones: Copia todo este código, pégalo en el "SQL Editor" de tu
-- proyecto en Supabase y presiona el botón "Run".
-- ============================================================================

-- 1. TABLA DE CONFIGURACIÓN GENERAL Y TASA BCV
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE USUARIOS Y CAJEROS
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  pin TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE CATEGORÍAS DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.categories (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE PRODUCTOS E INVENTARIO
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  barcode TEXT DEFAULT '',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Otros',
  cost_price_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
  sale_price_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
  stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unidad',
  tax_type TEXT NOT NULL DEFAULT 'exento',
  description TEXT,
  created_at TEXT NOT NULL
);

-- 5. TABLA DE CLIENTES (DIRECTORIO Y CRÉDITO)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  id_doc_type TEXT NOT NULL DEFAULT 'V',
  id_doc_number TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  credit_limit_usd NUMERIC(12, 2),
  notes TEXT,
  created_at TEXT NOT NULL
);

-- 6. TABLA DE LIBRETA DE CRÉDITOS (CUENTAS POR COBRAR / FIADOS)
CREATE TABLE IF NOT EXISTS public.credits (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id_doc TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  sale_id TEXT,
  sale_number TEXT,
  date TEXT NOT NULL,
  original_amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  original_amount_bs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bcv_rate NUMERIC(12, 4) NOT NULL DEFAULT 1,
  current_balance_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente',
  description TEXT,
  notes TEXT,
  payments JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 7. TABLA DE CUENTAS POR PAGAR A PROVEEDORES
CREATE TABLE IF NOT EXISTS public.payables (
  id TEXT PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  supplier_doc TEXT,
  supplier_phone TEXT,
  invoice_number TEXT,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT,
  original_amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  original_amount_bs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bcv_rate NUMERIC(12, 4) NOT NULL DEFAULT 1,
  current_balance_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  payments JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 8. TABLA DE VENTAS Y FACTURACIÓN POS
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  sale_number TEXT NOT NULL,
  date TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  bcv_rate NUMERIC(12, 4) NOT NULL DEFAULT 1,
  subtotal_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  profit_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal_bs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_bs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_bs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  profit_bs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  exempt_amount_usd NUMERIC(12, 2) DEFAULT 0,
  exempt_amount_bs NUMERIC(14, 2) DEFAULT 0,
  taxable_amount_usd NUMERIC(12, 2) DEFAULT 0,
  taxable_amount_bs NUMERIC(14, 2) DEFAULT 0,
  vat_amount_usd NUMERIC(12, 2) DEFAULT 0,
  vat_amount_bs NUMERIC(14, 2) DEFAULT 0,
  igtf_amount_usd NUMERIC(12, 2) DEFAULT 0,
  igtf_amount_bs NUMERIC(14, 2) DEFAULT 0,
  payment_method TEXT NOT NULL,
  payment_currency TEXT NOT NULL,
  payment_reference TEXT,
  payment_splits JSONB DEFAULT '[]'::jsonb,
  amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  change_bs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  change_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  customer_name TEXT,
  customer_id_doc TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  cashier_name TEXT,
  shift_id TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completada',
  cancelled_reason TEXT,
  cancelled_at TEXT,
  cancelled_by TEXT
);

-- 9. TABLA DE KARDEX / MOVIMIENTOS DE INVENTARIO
CREATE TABLE IF NOT EXISTS public.movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
  previous_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  new_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  date TEXT NOT NULL
);

-- 10. TABLA DE TURNOS Y ARQUEOS DE CAJA (CORTE Z)
CREATE TABLE IF NOT EXISTS public.shifts (
  id TEXT PRIMARY KEY,
  shift_number INTEGER NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  opened_by_user_id TEXT NOT NULL,
  opened_by_user_name TEXT NOT NULL,
  closed_by_user_id TEXT,
  closed_by_user_name TEXT,
  initial_cash_bs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  initial_cash_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cash_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'abierta',
  expected_cash_bs NUMERIC(14, 2),
  expected_cash_usd NUMERIC(12, 2),
  counted_cash_bs NUMERIC(14, 2),
  counted_cash_usd NUMERIC(12, 2),
  difference_bs NUMERIC(14, 2),
  difference_usd NUMERIC(12, 2),
  total_sales_count INTEGER,
  total_sales_bs NUMERIC(14, 2),
  total_sales_usd NUMERIC(12, 2),
  payment_summary JSONB,
  notes TEXT
);

-- ============================================================================
-- ÍNDICES DE RENDIMIENTO PARA BÚSQUEDAS RÁPIDAS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_credits_customer ON public.credits(customer_id);
CREATE INDEX IF NOT EXISTS idx_credits_status ON public.credits(status);
CREATE INDEX IF NOT EXISTS idx_movements_date ON public.movements(date DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS) PARA ACCESO API
-- ============================================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso Publico Merkafacil settings" ON public.settings;
CREATE POLICY "Acceso Publico Merkafacil settings" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Publico Merkafacil users" ON public.users;
CREATE POLICY "Acceso Publico Merkafacil users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Publico Merkafacil categories" ON public.categories;
CREATE POLICY "Acceso Publico Merkafacil categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Publico Merkafacil products" ON public.products;
CREATE POLICY "Acceso Publico Merkafacil products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Publico Merkafacil customers" ON public.customers;
CREATE POLICY "Acceso Publico Merkafacil customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Publico Merkafacil credits" ON public.credits;
CREATE POLICY "Acceso Publico Merkafacil credits" ON public.credits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Publico Merkafacil payables" ON public.payables;
CREATE POLICY "Acceso Publico Merkafacil payables" ON public.payables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Publico Merkafacil sales" ON public.sales;
CREATE POLICY "Acceso Publico Merkafacil sales" ON public.sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Publico Merkafacil movements" ON public.movements;
CREATE POLICY "Acceso Publico Merkafacil movements" ON public.movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso Publico Merkafacil shifts" ON public.shifts;
CREATE POLICY "Acceso Publico Merkafacil shifts" ON public.shifts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Datos iniciales por defecto
INSERT INTO public.categories (name) VALUES
  ('Abarrotes'), ('Bebidas'), ('Lácteos y Huevos'), ('Snacks y Dulces'),
  ('Limpieza y Hogar'), ('Panadería'), ('Frutas y Verduras'), ('Cuidado Personal'), ('Otros')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.users (id, username, name, role, pin) VALUES
  ('user-admin', 'admin', 'Administrador (Dueño)', 'admin', '1234')
ON CONFLICT (id) DO NOTHING;
`;
