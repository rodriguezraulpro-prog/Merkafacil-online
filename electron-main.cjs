const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Set application name explicitly for consistent %APPDATA%\Merkafacil POS path
app.setName('Merkafacil POS');

// Direct thermal kiosk printing (silent ticket printing) & hardware acceleration
app.commandLine.appendSwitch('kiosk-printing');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let mainWindow = null;
let logFilePath = '';
const PORT = 3000;

function logMessage(...args) {
  const text = args.map(a => (typeof a === 'object' ? (a.stack || JSON.stringify(a)) : a)).join(' ');
  const line = `[${new Date().toISOString()}] ${text}\n`;
  console.log(...args);
  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, line);
    } catch (e) {}
  }
}

// Ensure single instance lock so two copies don't fight over port 3000
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function startLocalServer() {
  const bundlePath = path.join(__dirname, 'dist', 'server-bundle.cjs');
  const standardPath = path.join(__dirname, 'dist', 'server.cjs');

  logMessage('Intentando iniciar servidor local...');
  logMessage('Ruta bundle:', bundlePath, 'Existe:', fs.existsSync(bundlePath));
  logMessage('Ruta standard:', standardPath, 'Existe:', fs.existsSync(standardPath));

  try {
    if (fs.existsSync(bundlePath)) {
      logMessage('Cargando servidor autocontenido (server-bundle.cjs)...');
      require(bundlePath);
      logMessage('Servidor autocontenido cargado con exito.');
      return true;
    }
    if (fs.existsSync(standardPath)) {
      logMessage('Cargando servidor estandar (server.cjs)...');
      require(standardPath);
      logMessage('Servidor estandar cargado con exito.');
      return true;
    }
    throw new Error('No se encontro ningun archivo ejecutable de servidor en dist/');
  } catch (err) {
    logMessage('ERROR al requerir servidor en proceso principal:', err);
    // Intentar fallback con child_process fork en caso de fallo
    try {
      const { fork } = require('child_process');
      const target = fs.existsSync(bundlePath) ? bundlePath : standardPath;
      const child = fork(target, [], {
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: `${PORT}`,
        },
        stdio: 'pipe',
      });
      child.stderr?.on('data', (d) => logMessage('[Fork stderr]:', d.toString()));
      child.stdout?.on('data', (d) => logMessage('[Fork stdout]:', d.toString()));
      return true;
    } catch (forkErr) {
      logMessage('Fallo total de inicio del servidor:', forkErr);
      dialog.showErrorBox(
        'Error crítico en Merkafacil POS',
        `No se pudo iniciar el servidor local ni la base de datos:\n\n${err.stack || err.message}\n\nConsulte el archivo de registro:\n${logFilePath}`
      );
      return false;
    }
  }
}

function waitForServer(onReady, onTimeout, maxAttempts = 60) {
  let attempts = 0;
  const check = () => {
    attempts++;
    const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
      if (res.statusCode === 200) {
        logMessage(`Servidor respondiendo salud HTTP 200 tras ${attempts} intentos.`);
        onReady();
      } else if (attempts < maxAttempts) {
        setTimeout(check, 250);
      } else {
        logMessage('Tiempo de espera de salud del servidor agotado.');
        onTimeout();
      }
    });

    req.on('error', () => {
      if (attempts < maxAttempts) {
        setTimeout(check, 250);
      } else {
        logMessage('Tiempo de espera agotado, error de conexion.');
        onTimeout();
      }
    });
    req.end();
  };

  check();
}

function renderErrorScreen(errorText) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            padding: 24px;
            box-sizing: border-box;
          }
          .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 32px;
            max-width: 580px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          }
          h2 { margin: 0 0 12px 0; font-size: 22px; color: #ef4444; }
          p { margin: 0 0 16px 0; color: #cbd5e1; font-size: 14px; line-height: 1.5; }
          .log-path {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 10px;
            font-family: monospace;
            font-size: 11px;
            color: #94a3b8;
            word-break: break-all;
            margin-bottom: 20px;
          }
          button {
            background: #10b981;
            color: #ffffff;
            border: none;
            padding: 10px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }
          button:hover { background: #059669; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>No se pudo conectar al servidor local</h2>
          <p>${errorText || 'El servidor interno de Merkafacil no respondio en el puerto 3000.'}</p>
          <div class="log-path">Archivo de registro: ${logFilePath}</div>
          <button onclick="window.location.href='http://localhost:3000'">Reintentar Conexión</button>
        </div>
      </body>
    </html>
  `)}`).catch(() => {});
}

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, 'public', 'icon.png'))
    ? path.join(__dirname, 'public', 'icon.png')
    : undefined;

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 680,
    title: 'Merkafacil - Punto de Venta & Bodega',
    icon: iconPath,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.maximize();

  // F12 para abrir herramientas de desarrollador si se requiere inspeccionar
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Mostrar pantalla de carga elegante mientras se inicializa el servidor
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
            user-select: none;
          }
          .spinner {
            width: 44px;
            height: 44px;
            border: 4px solid #1e293b;
            border-top: 4px solid #10b981;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          h2 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #10b981; }
          p { margin: 0; color: #94a3b8; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Merkafacil POS</h2>
        <p>Iniciando base de datos SQLite y punto de venta local...</p>
      </body>
    </html>
  `)}`).catch(() => {});

  // Esperar confirmacion del servidor HTTP antes de cargar la interfaz
  waitForServer(
    () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        logMessage('Cargando aplicacion principal en http://localhost:3000...');
        mainWindow.loadURL(`http://localhost:${PORT}`).catch((err) => {
          logMessage('Error al cargar http://localhost:3000:', err);
          renderErrorScreen(`Error de conexion: ${err.message}`);
        });
      }
    },
    () => {
      renderErrorScreen('El servidor local tardó demasiado tiempo en responder.');
    }
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inicializar Electron cuando el entorno esté listo
app.whenReady().then(() => {
  try {
    const userDataPath = app.getPath('userData');
    logFilePath = path.join(userDataPath, 'merkafacil_debug.log');

    // Asegurar directorio persistente para SQLite
    const persistentDataDir = path.join(userDataPath, 'data');
    if (!fs.existsSync(persistentDataDir)) {
      fs.mkdirSync(persistentDataDir, { recursive: true });
    }

    // Si existe una base de datos previa en la carpeta por defecto 'react-example' (del template inicial)
    // y la nueva ruta aún no tiene base de datos, migrarla automáticamente
    try {
      const appData = app.getPath('appData');
      const legacyDir = path.join(appData, 'react-example', 'data');
      const legacyDb = path.join(legacyDir, 'bodega.db');
      const targetDb = path.join(persistentDataDir, 'bodega.db');
      if (fs.existsSync(legacyDb) && !fs.existsSync(targetDb)) {
        logMessage('Migrando base de datos previa desde react-example/data...');
        fs.copyFileSync(legacyDb, targetDb);
        if (fs.existsSync(legacyDb + '-wal')) fs.copyFileSync(legacyDb + '-wal', targetDb + '-wal');
        if (fs.existsSync(legacyDb + '-shm')) fs.copyFileSync(legacyDb + '-shm', targetDb + '-shm');
        logMessage('Migracion completada con exito.');
      }
    } catch (migErr) {
      logMessage('Aviso de migracion legacy:', migErr);
    }

    process.env.MERKAFACIL_DATA_DIR = persistentDataDir;

    logMessage('=== INICIANDO MERKAFACIL POS ===');
    logMessage('Electron:', process.versions.electron, 'Node:', process.versions.node);
    logMessage('UserData:', userDataPath);
    logMessage('DataDir SQLite:', persistentDataDir);
  } catch (e) {
    console.error('Error al configurar rutas:', e);
  }

  process.env.NODE_ENV = 'production';
  process.env.PORT = `${PORT}`;

  startLocalServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
