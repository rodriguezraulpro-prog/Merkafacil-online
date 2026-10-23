import express from 'express';
import path from 'path';
import fs from 'fs';
import { 
  initDatabase, 
  getFullState, 
  getProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  adjustStock, 
  restockProduct,
  getCategories, 
  addCategory, 
  updateCategory, 
  deleteCategory,
  getCustomers, 
  saveCustomer, 
  updateCustomerCreditLimit,
  getCredits, 
  createCredit, 
  addCreditPayment, 
  deleteCredit,
  getPayables,
  createPayable,
  addPayablePayment,
  deletePayable,
  getSales, 
  createSale, 
  cancelSale,
  getMovements,
  getShifts,
  getCurrentShift,
  openShift,
  closeShift,
  addCashMovementToShift,
  getUsers,
  updateUserPin,
  getSettings,
  saveSettings,
  resetDatabaseToZero,
  restoreFullBackup,
  dbPath,
  dataDir
} from './server/db.ts';
import {
  getSupabaseConfig,
  isSupabaseActive,
  testAndSaveSupabaseConfig,
  disconnectSupabase,
  pushStateToSupabase,
  pullStateFromSupabase,
  deleteFromSupabaseTable,
  wipeSupabaseDatabase
} from './server/supabase.ts';

let syncTimeout: NodeJS.Timeout | null = null;
function triggerSupabaseBackgroundSync() {
  if (!isSupabaseActive()) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const state = await getFullState();
      await pushStateToSupabase(state);
    } catch (err) {
      console.warn('[Supabase AutoSync] Error syncing state:', err);
    }
  }, 600);
}

async function startServer() {
  // Initialize database tables (local SQLite file)
  await initDatabase();

  // If Supabase is active on startup, auto-hydrate if local DB is empty
  if (isSupabaseActive()) {
    try {
      const localProds = await getProducts();
      const localSales = await getSales();
      if (localProds.length === 0 && localSales.length === 0) {
        const pulled = await pullStateFromSupabase();
        if (pulled.success && pulled.state && (pulled.state.products.length > 0 || pulled.state.sales.length > 0)) {
          await restoreFullBackup(pulled.state);
          console.log('[Supabase] Base de datos local hidratada automáticamente desde Supabase PostgreSQL.');
        }
      }
    } catch (e) {
      console.warn('[Supabase] Auto-hydrate check warning:', e);
    }
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Middleware to auto-sync mutations to Supabase when connected
  app.use((req, res, next) => {
    if (
      ['POST', 'PUT', 'DELETE'].includes(req.method) &&
      req.path.startsWith('/api/') &&
      !req.path.startsWith('/api/system/supabase') &&
      !req.path.startsWith('/api/reset')
    ) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300 && isSupabaseActive()) {
          triggerSupabaseBackgroundSync();
        }
      });
    }
    next();
  });

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      provider: 'local_sqlite', 
      database: 'bodega.db', 
      timestamp: new Date().toISOString() 
    });
  });

  // State snapshot (hydrates full frontend from DB in 1 request)
  app.get('/api/state', async (req, res) => {
    try {
      if (isSupabaseActive()) {
        try {
          const pulled = await pullStateFromSupabase();
          if (pulled.success && pulled.state) {
            await restoreFullBackup(pulled.state);
            return res.json(pulled.state);
          }
        } catch (supabaseErr) {
          console.warn('[Supabase] Error pulling state on /api/state, falling back to SQLite:', supabaseErr);
        }
      }
      const state = await getFullState();
      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al obtener estado' });
    }
  });

  // Products
  app.get('/api/products', async (req, res) => {
    try {
      res.json(await getProducts());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const product = await addProduct(req.body);
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const product = await updateProduct({ ...req.body, id: req.params.id });
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      const result = await deleteProduct(req.params.id);
      deleteFromSupabaseTable('products', 'id', req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/products/:id/adjust', async (req, res) => {
    const result = await adjustStock(req.params.id, req.body.newStock, req.body.reason);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  });

  app.post('/api/products/:id/restock', async (req, res) => {
    const result = await restockProduct(req.params.id, req.body.quantityToAdd, req.body.reason);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  });

  // Categories
  app.get('/api/categories', async (req, res) => {
    try {
      res.json(await getCategories());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/categories', async (req, res) => {
    const result = await addCategory(req.body.name);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.put('/api/categories/:oldName', async (req, res) => {
    const result = await updateCategory(req.params.oldName, req.body.newName);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.delete('/api/categories/:name', async (req, res) => {
    try {
      const result = await deleteCategory(req.params.name);
      deleteFromSupabaseTable('categories', 'name', req.params.name);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customers
  app.get('/api/customers', async (req, res) => {
    try {
      res.json(await getCustomers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers', async (req, res) => {
    try {
      const customer = await saveCustomer(req.body);
      res.json(customer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/customers/:id/credit-limit', async (req, res) => {
    try {
      await updateCustomerCreditLimit(req.params.id, req.body.creditLimitUSD);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Credits & Fiados
  app.get('/api/credits', async (req, res) => {
    try {
      res.json(await getCredits());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/credits', async (req, res) => {
    try {
      const credit = await createCredit(req.body);
      res.json(credit);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/credits/:id/payment', async (req, res) => {
    const result = await addCreditPayment(req.params.id, req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.delete('/api/credits/:id', async (req, res) => {
    try {
      const result = await deleteCredit(req.params.id);
      deleteFromSupabaseTable('credits', 'id', req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Payables & Cuentas por Pagar (Proveedores)
  app.get('/api/payables', async (req, res) => {
    try {
      res.json(await getPayables());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/payables', async (req, res) => {
    try {
      const payable = await createPayable(req.body);
      res.json(payable);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/payables/:id/payment', async (req, res) => {
    const result = await addPayablePayment(req.params.id, req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.delete('/api/payables/:id', async (req, res) => {
    try {
      const result = await deletePayable(req.params.id);
      deleteFromSupabaseTable('payables', 'id', req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sales
  app.get('/api/sales', async (req, res) => {
    try {
      res.json(await getSales());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sales', async (req, res) => {
    const result = await createSale(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.post('/api/sales/:id/cancel', async (req, res) => {
    const { reason, cancelledBy } = req.body || {};
    const result = await cancelSale(req.params.id, reason, cancelledBy);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Movements
  app.get('/api/movements', async (req, res) => {
    try {
      res.json(await getMovements());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Shifts
  app.get('/api/shifts', async (req, res) => {
    try {
      res.json(await getShifts());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/shifts/current', async (req, res) => {
    try {
      res.json(await getCurrentShift());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/shifts/open', async (req, res) => {
    const result = await openShift(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.post('/api/shifts/:id/close', async (req, res) => {
    const result = await closeShift({ shiftId: req.params.id, ...req.body });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.post('/api/shifts/:id/cash-movement', async (req, res) => {
    const result = await addCashMovementToShift(req.params.id, req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Users
  app.get('/api/users', async (req, res) => {
    try {
      res.json(await getUsers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/users/:id/pin', async (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'El PIN no puede estar vacío.' });
    }
    const result = await updateUserPin(req.params.id, pin);
    res.json(result);
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    try {
      res.json(await getSettings());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

// Helper to fetch live official BCV rate from online sources
async function fetchLiveBcvRate(): Promise<{ rate: number; date?: string; source: string } | null> {
  const sources = [
    {
      url: 'https://ve.dolarapi.com/v1/dolares/oficial',
      parse: (data: any) => {
        const val = Number(data?.promedio || data?.venta || data?.compra);
        if (!isNaN(val) && val > 0) {
          return {
            rate: Math.round(val * 100) / 100,
            date: data.fechaActualizacion || new Date().toISOString(),
            source: 'Banco Central de Venezuela (DolarApi Oficial)'
          };
        }
        return null;
      }
    },
    {
      url: 'https://ve.dolarapi.com/v1/dolares',
      parse: (data: any) => {
        if (Array.isArray(data)) {
          const oficial = data.find((d: any) => d?.fuente === 'oficial' || d?.nombre?.toLowerCase()?.includes('oficial') || d?.nombre?.toLowerCase()?.includes('dólar'));
          if (oficial) {
            const val = Number(oficial.promedio || oficial.venta || oficial.compra);
            if (!isNaN(val) && val > 0) {
              return {
                rate: Math.round(val * 100) / 100,
                date: oficial.fechaActualizacion || new Date().toISOString(),
                source: 'BCV Oficial'
              };
            }
          }
        }
        return null;
      }
    }
  ];

  for (const src of sources) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(src.url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'Merkafacil-POS/2.0' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        const parsed = src.parse(json);
        if (parsed && parsed.rate > 0) {
          return parsed;
        }
      }
    } catch (err: any) {
      console.warn('[BCV Sync] Error:', err.message || err);
    }
  }
  return null;
}

  app.put('/api/settings', async (req, res) => {
    try {
      res.json(await saveSettings(req.body));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Consultar y actualizar tasa BCV Oficial desde internet
  app.get('/api/bcv/rate', async (req, res) => {
    try {
      const live = await fetchLiveBcvRate();
      const currentSettings = await getSettings();
      if (live) {
        return res.json({
          success: true,
          rate: live.rate,
          officialDate: live.date,
          source: live.source,
          currentRate: currentSettings.bcvRate,
          lastUpdated: currentSettings.bcvLastUpdated,
          autoUpdateEnabled: currentSettings.autoUpdateBcv !== false,
        });
      } else {
        return res.json({
          success: false,
          error: 'No se pudo obtener la tasa oficial en este momento. Verifique la conexión a internet.',
          currentRate: currentSettings.bcvRate,
          lastUpdated: currentSettings.bcvLastUpdated,
          autoUpdateEnabled: currentSettings.autoUpdateBcv !== false,
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/bcv/sync', async (req, res) => {
    try {
      const live = await fetchLiveBcvRate();
      if (!live || !live.rate || live.rate <= 0) {
        return res.status(502).json({
          success: false,
          error: 'No se pudo conectar con el servicio oficial de tasas BCV en internet. Intente nuevamente en unos minutos.'
        });
      }

      const now = new Date().toISOString();
      const updatedSettings = await saveSettings({
        bcvRate: live.rate,
        bcvLastUpdated: now,
        bcvOfficialDate: live.date || now,
        bcvSource: live.source || 'BCV Oficial',
      });

      console.log();
      res.json({
        success: true,
        rate: live.rate,
        officialDate: live.date,
        source: live.source,
        updatedSettings,
      });
    } catch (err: any) {
      console.error('[BCV Sync] Error sincronizando tasa:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset to ZERO demo data
  app.post('/api/reset', async (req, res) => {
    const result = await resetDatabaseToZero();
    if (!result.success) {
      return res.status(500).json(result);
    }
    if (isSupabaseActive()) {
      await wipeSupabaseDatabase();
    }
    res.json(await getFullState());
  });

  // Restore complete backup into DB
  app.post('/api/backup/restore', async (req, res) => {
    try {
      const result = await restoreFullBackup(req.body);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json({ success: true, state: await getFullState() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Online Server Health & Latency check
  app.get('/api/system/online-status', (req, res) => {
    try {
      const exists = fs.existsSync(dbPath);
      const sizeBytes = exists ? fs.statSync(dbPath).size : 0;
      res.json({
        status: 'online',
        provider: 'local_sqlite',
        mode: 'Local SQLite',
        database: 'bodega.db',
        dbSizeKB: Math.round(sizeBytes / 1024),
        timestamp: Date.now(),
        uptimeSeconds: Math.round(process.uptime()),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // System Database Info
  app.get('/api/system/db-info', async (req, res) => {
    try {
      const exists = fs.existsSync(dbPath);
      let sizeBytes = 0;
      if (exists) {
        sizeBytes = fs.statSync(dbPath).size;
      }

      const [prods, sales, customers] = await Promise.all([
        getProducts().catch(() => []),
        getSales().catch(() => []),
        getCustomers().catch(() => []),
      ]);

      res.json({
        provider: 'local_sqlite',
        dbPath,
        dataDir,
        exists,
        sizeBytes,
        counts: {
          products: prods.length,
          sales: sales.length,
          customers: customers.length,
        },
        platform: process.platform
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================================
  // SUPABASE CLOUD (POSTGRESQL) ENDPOINTS
  // ============================================================================
  app.get('/api/system/supabase-config', (req, res) => {
    const cfg = getSupabaseConfig();
    res.json({
      enabled: cfg.enabled,
      isConnected: isSupabaseActive(),
      url: cfg.url,
      anonKey: cfg.anonKey,
      connectedAt: cfg.connectedAt,
      lastSyncAt: cfg.lastSyncAt,
    });
  });

  app.post('/api/system/supabase-connect', async (req, res) => {
    const { url, anonKey } = req.body || {};
    const result = await testAndSaveSupabaseConfig(url, anonKey, true);
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Check if remote already has data or if local has data to sync automatically
    try {
      const localState = await getFullState();
      const remotePull = await pullStateFromSupabase();
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
          await pushStateToSupabase(localState);
        } else if (remoteHasData && !localHasData) {
          await restoreFullBackup(remotePull.state);
        }
      }
    } catch (e) {
      console.warn('[Supabase Connect] Auto-sync check warning:', e);
    }

    const cfg = getSupabaseConfig();
    res.json({
      ...result,
      config: {
        enabled: cfg.enabled,
        isConnected: isSupabaseActive(),
        url: cfg.url,
        anonKey: cfg.anonKey,
        connectedAt: cfg.connectedAt,
        lastSyncAt: cfg.lastSyncAt,
      },
      state: await getFullState(),
    });
  });

  app.post('/api/system/supabase-disconnect', (req, res) => {
    const result = disconnectSupabase();
    res.json(result);
  });

  app.post('/api/system/supabase-push', async (req, res) => {
    try {
      const { url, anonKey } = req.body || {};
      const state = await getFullState();
      const result = await pushStateToSupabase(state, url, anonKey);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json({
        ...result,
        lastSyncAt: getSupabaseConfig().lastSyncAt,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/system/supabase-pull', async (req, res) => {
    try {
      const { url, anonKey } = req.body || {};
      const pullRes = await pullStateFromSupabase(url, anonKey);
      if (!pullRes.success || !pullRes.state) {
        return res.status(400).json(pullRes);
      }
      await restoreFullBackup(pullRes.state);
      const updatedState = await getFullState();
      res.json({
        success: true,
        message: pullRes.message,
        state: updatedState,
        lastSyncAt: getSupabaseConfig().lastSyncAt,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Download raw SQLite database file directly in browser
  app.get('/api/system/download-db', async (req, res) => {
    try {
      if (!fs.existsSync(dbPath)) {
        return res.status(404).send('Base de datos no encontrada');
      }
      res.download(dbPath, 'bodega.db', (err) => {
        if (err && !res.headersSent) {
          res.status(500).send('Error al descargar archivo');
        }
      });
    } catch (err: any) {
      res.status(500).send(err.message || 'Error al descargar base de datos');
    }
  });

  // Open database folder in native file explorer
  app.post('/api/system/open-db-folder', async (req, res) => {
    try {
      const { exec } = await import('child_process');
      const folderToOpen = fs.existsSync(dbPath) ? path.dirname(dbPath) : dataDir;

      if (process.platform === 'win32') {
        if (fs.existsSync(dbPath)) {
          exec(`explorer.exe /select,"${dbPath}"`);
        } else {
          exec(`explorer.exe "${folderToOpen}"`);
        }
      } else if (process.platform === 'darwin') {
        exec(`open "${folderToOpen}"`);
      } else {
        exec(`xdg-open "${folderToOpen}"`);
      }
      res.json({ success: true, openedPath: folderToOpen });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development & static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
        ? path.join(__dirname, 'dist')
        : path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('index.html no encontrado');
      }
    });
  }

  // Auto-sync BCV rate in background periodically if autoUpdateBcv is enabled
  async function performAutoBcvSync() {
    try {
      const s = await getSettings();
      if (s.autoUpdateBcv === false) return; // Disallow if user disabled it

      // Check if already updated recently (last 4 hours)
      if (s.bcvLastUpdated) {
        const lastUpdated = new Date(s.bcvLastUpdated).getTime();
        const fourHours = 4 * 60 * 60 * 1000;
        if (Date.now() - lastUpdated < fourHours && s.bcvRate > 0) {
          return; // Still fresh
        }
      }

      const live = await fetchLiveBcvRate();
      if (live && live.rate > 0) {
        if (Math.abs(live.rate - s.bcvRate) > 0.001) {
          const now = new Date().toISOString();
          await saveSettings({
            bcvRate: live.rate,
            bcvLastUpdated: now,
            bcvOfficialDate: live.date || now,
            bcvSource: live.source,
          });
          console.log(`[BCV AutoSync] Tasa sincronizada automáticamente a Bs. ${live.rate}`);
        }
      }
    } catch (err: any) {
      console.warn("[BCV AutoSync] Error en sincronización:", err.message);
    }
  }

  // Run initial check shortly after startup and every 30 minutes
  setTimeout(performAutoBcvSync, 4000);
  setInterval(performAutoBcvSync, 30 * 60 * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bodega Server running at http://0.0.0.0:${PORT} [Mode: Local SQLite]`);
  });
}

startServer();
