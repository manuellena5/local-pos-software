import { app, BrowserWindow } from 'electron';
import path from 'path';

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

  if (!app.isPackaged) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  // In dev, the server runs via `npm run dev:server` (system Node.js).
  // Dynamic import prevents better-sqlite3 from loading into Electron's
  // Node.js (ABI mismatch) during development.
  if (app.isPackaged) {
    const { startServer } = await import('../server/server');
    startServer(SERVER_PORT);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
