const { app, BrowserWindow } = require('electron');
const path = require('path');
const Store = require('electron-store').default || require('electron-store');

// Import handlers
const { registerWindowHandlers } = require('./handlers/window-handler');
const { registerServerHandlers } = require('./handlers/server-handler');
const { registerSSHHandlers } = require('./handlers/ssh-handler');
const { registerSFTPHandlers } = require('./handlers/sftp-handler');

// Initialize store and sessions map
const store = new Store();
const sshSessions = new Map(); // Shared state for active SSH sessions

let mainWindow;

function createWindow() {
  console.log('[Main] Creating window...');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
    frame: false,
    titleBarStyle: 'hidden',
  });

  mainWindow.loadFile('renderer/index.html');
  //mainWindow.webContents.openDevTools(); // Open DevTools to see console errors

  mainWindow.on('closed', () => {
    console.log('[Main] Window closed');
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('[Main] Renderer process crashed!');
  });

  // Register all handlers
  registerWindowHandlers(mainWindow);
  registerServerHandlers(store, sshSessions);
  registerSSHHandlers(sshSessions);
  registerSFTPHandlers(sshSessions);

  console.log('[Main] Window created successfully');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Cleanup all SSH sessions
  sshSessions.forEach(session => {
    if (session.sshClient) {
      session.sshClient.disconnect();
    }
  });
  sshSessions.clear();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
