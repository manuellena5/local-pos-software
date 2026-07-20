import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Nombre de la app para app.getPath('userData') (DB y logs) — package.json
// "name" no puede tener espacios/mayúsculas (reglas de npm), así que se fija
// acá explícitamente en vez de depender de ese campo.
app.setName('Espacio BIP');

const DEV_URL = 'http://localhost:5173';
const SERVER_PORT = Number(process.env.SERVER_PORT) || 3001;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Densidad de UI por defecto: equivalente a "Ctrl + - dos veces" (100%→90%→80%).
  win.webContents.setZoomFactor(0.8);

  if (!app.isPackaged) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '../../build/index.html'));
  }
}

/**
 * Registra el error de arranque en un archivo plano (sin depender de
 * electron-log, por si el problema es justamente al cargar ese módulo) y
 * muestra un cuadro de diálogo. Sin esto, una excepción acá deja la app sin
 * ventana y sin ningún mensaje — parece que "no pasa nada" al hacer doble clic.
 */
function reportStartupError(err: unknown): void {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  try {
    const logPath = path.join(app.getPath('userData'), 'startup-error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}]\n${message}\n\n`);
  } catch {
    // best effort — si ni esto funciona, al menos queda el diálogo
  }
  dialog.showErrorBox(
    'Espacio BIP no pudo iniciar',
    `${message}\n\nEste error quedó guardado en:\n${path.join(app.getPath('userData'), 'startup-error.log')}`,
  );
}

app.whenReady().then(async () => {
  // In dev, the server runs via `npm run dev:server` (system Node.js).
  // Dynamic import prevents better-sqlite3 from loading into Electron's
  // Node.js (ABI mismatch) during development.
  if (app.isPackaged) {
    try {
      // .env empaquetado (extraResources) — AFIP_ENVIRONMENT, SEED_DEMO,
      // credenciales Supabase de test. Se carga ANTES de importar server.ts
      // porque todo lo que lee estas env vars lo hace en el momento de uso,
      // no al cargar el módulo.
      dotenv.config({ path: path.join(process.resourcesPath, '.env') });

      process.env.LOCALPOS_DB_PATH = path.join(app.getPath('userData'), 'localpos.db');
      process.env.LOCALPOS_MIGRATIONS_PATH = path.join(process.resourcesPath, 'migrations');
      process.env.LOCALPOS_SEED_CSV_PATH = path.join(process.resourcesPath, 'seed', 'productos.csv');

      const { startServer } = await import('../server/server');
      startServer(SERVER_PORT);
    } catch (err) {
      reportStartupError(err);
    }
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(reportStartupError);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
