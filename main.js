const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const Store = require('electron-store').default || require('electron-store');

const store = new Store();
const sshSessions = new Map(); // Store active SSH sessions by server ID

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
    frame: false, // Frameless window
    titleBarStyle: 'hidden',
  });

  win.loadFile('renderer/index.html');
  // win.webContents.openDevTools();

  // Window control handlers
  ipcMain.handle('window-minimize', () => win.minimize());
  ipcMain.handle('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.handle('window-close', () => win.close());
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Cleanup all SSH sessions
  sshSessions.forEach(session => {
    if (session.ssh) {
      session.ssh.dispose();
    }
  });
  sshSessions.clear();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Server CRUD operations
ipcMain.handle('get-servers', async () => {
  return store.get('servers', []);
});

ipcMain.handle('add-server', async (event, server) => {
  const servers = store.get('servers', []);
  const newServer = {
    id: Date.now().toString(),
    ...server,
  };
  servers.push(newServer);
  store.set('servers', servers);
  return newServer;
});

ipcMain.handle('update-server', async (event, id, updatedServer) => {
  const servers = store.get('servers', []);
  const index = servers.findIndex(s => s.id === id);
  if (index !== -1) {
    servers[index] = { ...servers[index], ...updatedServer, id };
    store.set('servers', servers);
    return servers[index];
  }
  throw new Error('Server not found');
});

ipcMain.handle('delete-server', async (event, id) => {
  const servers = store.get('servers', []);
  const filtered = servers.filter(s => s.id !== id);
  store.set('servers', filtered);

  // Close SSH session if active
  if (sshSessions.has(id)) {
    const session = sshSessions.get(id);
    if (session.ssh) {
      session.ssh.dispose();
    }
    sshSessions.delete(id);
  }

  return true;
});

// SSH connection management
ipcMain.handle('connect-ssh', async (event, server) => {
  try {
    // Close existing session if any
    if (sshSessions.has(server.id)) {
      const oldSession = sshSessions.get(server.id);
      if (oldSession.ssh) {
        oldSession.ssh.dispose();
      }
      sshSessions.delete(server.id);
    }

    const ssh = new NodeSSH();
    const config = {
      host: server.host,
      username: server.username,
      port: server.port || 22,
    };

    // Add authentication method
    if (server.authType === 'key' && server.privateKey) {
      try {
        // If it looks like a path and exists, read the file
        if (!server.privateKey.includes('BEGIN') && require('fs').existsSync(server.privateKey)) {
          config.privateKey = require('fs').readFileSync(server.privateKey, 'utf8');
        } else {
          config.privateKey = server.privateKey;
        }
      } catch (err) {
        console.error('Error reading private key:', err);
        return { success: false, message: `Failed to read private key: ${err.message}` };
      }

      if (server.passphrase) {
        config.passphrase = server.passphrase;
      }
    } else if (server.password) {
      config.password = server.password;
    }

    await ssh.connect(config);

    // Create shell session
    const shell = await ssh.requestShell();

    // Create SFTP session
    const sftp = await ssh.requestSFTP();

    // Store session
    sshSessions.set(server.id, {
      ssh,
      shell,
      sftp,
      server,
    });

    // Handle shell output
    shell.on('data', (data) => {
      event.sender.send('terminal-output', server.id, data.toString());
    });

    shell.on('close', () => {
      event.sender.send('terminal-disconnected', server.id);
      sshSessions.delete(server.id);
    });

    shell.stderr.on('data', (data) => {
      event.sender.send('terminal-output', server.id, data.toString());
    });

    return { success: true, message: 'Connected successfully' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('send-command', async (event, serverId, command) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.shell) {
    return { success: false, message: 'Not connected' };
  }

  try {
    session.shell.write(command + '\n');
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// Raw terminal input for xterm
ipcMain.handle('terminal-input', async (event, serverId, data) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.shell) {
    return { success: false, message: 'Not connected' };
  }
  try {
    session.shell.write(data);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('disconnect-ssh', async (event, serverId) => {
  const session = sshSessions.get(serverId);
  if (session) {
    if (session.ssh) {
      session.ssh.dispose();
    }
    sshSessions.delete(serverId);
  }
  return { success: true };
});

ipcMain.handle('is-connected', async (event, serverId) => {
  return sshSessions.has(serverId);
});

// SFTP Operations
ipcMain.handle('sftp-list', async (event, serverId, path) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    const list = await session.ssh.execCommand(`ls -la "${path}"`);
    // Parse ls -la output manually for better compatibility or use sftp.readdir
    // Using sftp.readdir is safer but node-ssh wraps ssh2
    // Let's use node-ssh's put/get wrappers or direct sftp access if exposed
    // node-ssh exposes sftp via ssh.requestSFTP() which returns ssh2 SFTP wrapper

    // However, node-ssh provides high level methods too.
    // Let's use direct SFTP for listing to get attributes

    return new Promise((resolve, reject) => {
      session.sftp.readdir(path, (err, list) => {
        if (err) {
          resolve({ success: false, message: err.message });
        } else {
          // Process list to add isDirectory flag
          const files = list.map(item => ({
            name: item.filename,
            isDirectory: item.longname.startsWith('d'),
            size: item.attrs.size,
            modifyTime: item.attrs.mtime * 1000,
            permissions: item.longname.split(' ')[0]
          }));
          resolve({ success: true, files });
        }
      });
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('sftp-read', async (event, serverId, filePath) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    // Check if file is too large (limit to 5MB for editor)
    const stat = await new Promise((resolve, reject) => {
      session.sftp.stat(filePath, (err, stats) => {
        if (err) reject(err);
        else resolve(stats);
      });
    });

    if (stat.size > 5 * 1024 * 1024) {
      return { success: false, message: 'File too large to edit (max 5MB)' };
    }

    const content = await session.ssh.execCommand(`cat "${filePath}"`);
    return { success: true, content: content.stdout };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('sftp-write', async (event, serverId, filePath, content) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    // Use temporary file approach to avoid issues with special chars
    const tempPath = `/tmp/ssh-manager-${Date.now()}`;
    // We can't easily write string to remote file with node-ssh without a local file
    // But we can use sftp.writeFile (stream)

    return new Promise((resolve, reject) => {
      const stream = session.sftp.createWriteStream(filePath);
      stream.on('error', (err) => resolve({ success: false, message: err.message }));
      stream.on('close', () => resolve({ success: true }));
      stream.end(content);
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('sftp-upload', async (event, serverId, localPath, remotePath) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    await session.ssh.putFile(localPath, remotePath);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// Recursive folder upload handler
ipcMain.handle('sftp-upload-folder', async (event, serverId, localDir, remoteDir) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    // node-ssh provides putDirectory for recursive upload
    const result = await session.ssh.putDirectory(localDir, remoteDir, {
      recursive: true,
      concurrency: 5,
      tick: (localPath, remotePath, error) => {
        // optional: could report progress via IPC if needed
      }
    });
    if (result) {
      return { success: true };
    } else {
      return { success: false, message: 'Upload failed (putDirectory returned false)' };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('sftp-download', async (event, serverId, remotePath, localPath) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    await session.ssh.getFile(localPath, remotePath);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('sftp-delete', async (event, serverId, path, isDir) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    if (isDir) {
      await session.ssh.execCommand(`rm -rf "${path}"`);
    } else {
      await session.ssh.execCommand(`rm "${path}"`);
    }
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('sftp-create-dir', async (event, serverId, path) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    await session.ssh.mkdir(path);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('sftp-rename', async (event, serverId, oldPath, newPath) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    return new Promise((resolve, reject) => {
      session.sftp.rename(oldPath, newPath, (err) => {
        if (err) resolve({ success: false, message: err.message });
        else resolve({ success: true });
      });
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('sftp-create-file', async (event, serverId, path) => {
  const session = sshSessions.get(serverId);
  if (!session || !session.ssh) return { success: false, message: 'Not connected' };

  try {
    // Create empty file
    await session.ssh.execCommand(`touch "${path}"`);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// Native Dialogs
ipcMain.handle('dialog-show-open', async (event) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openFile']
  });
  return result;
});

ipcMain.handle('dialog-show-save', async (event, defaultName) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName
  });
  return result;
});

// Local File System
ipcMain.handle('local-fs-list', async (event, dirPath) => {
  const fs = require('fs');
  const path = require('path');

  try {
    const files = await fs.promises.readdir(dirPath);
    const fileList = await Promise.all(files.map(async (file) => {
      try {
        const filePath = path.join(dirPath, file);
        const stats = await fs.promises.stat(filePath);
        return {
          name: file,
          size: stats.size,
          isDirectory: stats.isDirectory(),
          modifyTime: stats.mtime,
          permissions: (stats.mode & parseInt('777', 8)).toString(8) // Simple octal permissions
        };
      } catch (e) {
        return null; // Skip files we can't stat (permissions, etc)
      }
    }));

    return { success: true, files: fileList.filter(f => f !== null) };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('get-home-dir', () => {
  return require('os').homedir();
});
