const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Server management
  getServers: () => ipcRenderer.invoke('get-servers'),
  addServer: (server) => ipcRenderer.invoke('add-server', server),
  updateServer: (id, server) => ipcRenderer.invoke('update-server', id, server),
  deleteServer: (id) => ipcRenderer.invoke('delete-server', id),

  // SSH operations
  connectSSH: (server) => ipcRenderer.invoke('connect-ssh', server),
  sendCommand: (serverId, command) => ipcRenderer.invoke('send-command', serverId, command),
  sendTerminalInput: (serverId, data) => ipcRenderer.invoke('terminal-input', serverId, data),
  disconnectSSH: (serverId) => ipcRenderer.invoke('disconnect-ssh', serverId),
  isConnected: (serverId) => ipcRenderer.invoke('is-connected', serverId),

  // SFTP operations
  sftpList: (serverId, path) => ipcRenderer.invoke('sftp-list', serverId, path),
  sftpRead: (serverId, path) => ipcRenderer.invoke('sftp-read', serverId, path),
  sftpWrite: (serverId, path, content) => ipcRenderer.invoke('sftp-write', serverId, path, content),
  sftpUpload: (serverId, localPath, remotePath) => ipcRenderer.invoke('sftp-upload', serverId, localPath, remotePath),
  sftpUploadFolder: (serverId, localDir, remoteDir) => ipcRenderer.invoke('sftp-upload-folder', serverId, localDir, remoteDir),
  sftpDownload: (serverId, remotePath, localPath) => ipcRenderer.invoke('sftp-download', serverId, remotePath, localPath),
  sftpDelete: (serverId, path, isDir) => ipcRenderer.invoke('sftp-delete', serverId, path, isDir),
  sftpCreateDir: (serverId, path) => ipcRenderer.invoke('sftp-create-dir', serverId, path),
  sftpCreateFile: (serverId, path) => ipcRenderer.invoke('sftp-create-file', serverId, path),
  sftpRename: (serverId, oldPath, newPath) => ipcRenderer.invoke('sftp-rename', serverId, oldPath, newPath),

  // Native Dialogs
  showOpenDialog: () => ipcRenderer.invoke('dialog-show-open'),
  showSaveDialog: (defaultName) => ipcRenderer.invoke('dialog-show-save', defaultName),

  // Local File System
  localFsList: (path) => ipcRenderer.invoke('local-fs-list', path),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // Terminal events
  onTerminalOutput: (callback) => {
    ipcRenderer.on('terminal-output', (event, serverId, data) => callback(serverId, data));
  },
  onTerminalDisconnected: (callback) => {
    ipcRenderer.on('terminal-disconnected', (event, serverId) => callback(serverId));
  },
  onTerminalReconnecting: (callback) => {
    ipcRenderer.on('terminal-reconnecting', (event, serverId, attempt, maxRetries) => callback(serverId, attempt, maxRetries));
  },
  onTerminalReconnected: (callback) => {
    ipcRenderer.on('terminal-reconnected', (event, serverId) => callback(serverId));
  },
  onTerminalReconnectFailed: (callback) => {
    ipcRenderer.on('terminal-reconnect-failed', (event, serverId) => callback(serverId));
  },
  onQueueStatus: (callback) => {
    ipcRenderer.on('queue-status', (event, serverId, queueLength) => callback(serverId, queueLength));
  },

  // Reconnection management
  setReconnectPreference: (serverId, enabled, retries) => ipcRenderer.invoke('set-reconnect-preference', serverId, enabled, retries),
  manualReconnect: (serverId) => ipcRenderer.invoke('manual-reconnect', serverId),
  getQueueStatus: (serverId) => ipcRenderer.invoke('get-queue-status', serverId),
});
