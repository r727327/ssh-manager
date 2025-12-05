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
  // mainWindow.webContents.openDevTools();

  // Register all handlers
  registerWindowHandlers(mainWindow);
  registerServerHandlers(store, sshSessions);
  registerSSHHandlers(sshSessions);
  registerSFTPHandlers(sshSessions);
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
