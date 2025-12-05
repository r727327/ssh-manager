const { ipcMain } = require('electron');
const { MAX_FILE_SIZE_EDITOR } = require('../utils/constants');

/**
 * Register SFTP file operation handlers
 * @param {Map} sshSessions - Active SSH sessions map
 */
function registerSFTPHandlers(sshSessions) {
    // List directory
    ipcMain.handle('sftp-list', async (event, serverId, path) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sftp) {
            return { success: false, message: 'Not connected' };
        }

        return new Promise((resolve) => {
            session.sftp.readdir(path, (err, list) => {
                if (err) {
                    resolve({ success: false, message: err.message });
                } else {
                    const files = list.map(item => ({
                        name: item.filename,
                        isDirectory: item.longname.startsWith('d'),
                        size: item.attrs.size,
                        modifyTime: item.attrs.mtime * 1000,
                        permissions: item.longname.split(' ')[0],
                    }));
                    resolve({ success: true, files });
                }
            });
        });
    });

    // Read file
    ipcMain.handle('sftp-read', async (event, serverId, filePath) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sftp) {
            return { success: false, message: 'Not connected' };
        }

        try {
            // Check file size
            const stat = await new Promise((resolve, reject) => {
                session.sftp.stat(filePath, (err, stats) => {
                    if (err) reject(err);
                    else resolve(stats);
                });
            });

            if (stat.size > MAX_FILE_SIZE_EDITOR) {
                return { success: false, message: 'File too large to edit (max 5MB)' };
            }

            // Read file using stream
            return new Promise((resolve) => {
                const stream = session.sftp.createReadStream(filePath);
                let content = '';

                stream.on('data', (data) => {
                    content += data.toString();
                });

                stream.on('end', () => {
                    resolve({ success: true, content });
                });

                stream.on('error', (err) => {
                    resolve({ success: false, message: err.message });
                });
            });
        } catch (err) {
            return { success: false, message: err.message };
        }
    });

    // Write file
    ipcMain.handle('sftp-write', async (event, serverId, filePath, content) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sftp) {
            return { success: false, message: 'Not connected' };
        }

        return new Promise((resolve) => {
            const stream = session.sftp.createWriteStream(filePath);

            stream.on('error', (err) => {
                resolve({ success: false, message: err.message });
            });

            stream.on('close', () => {
                resolve({ success: true });
            });

            stream.end(content);
        });
    });

    // Upload file
    ipcMain.handle('sftp-upload', async (event, serverId, localPath, remotePath) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sftp) {
            return { success: false, message: 'Not connected' };
        }

        return new Promise((resolve) => {
            // Ensure remote directory exists
            const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
            session.sshClient.execCommand(`mkdir -p "${remoteDir}"`).then(() => {
                session.sftp.fastPut(localPath, remotePath, (err) => {
                    if (err) {
                        resolve({ success: false, message: err.message });
                    } else {
                        resolve({ success: true });
                    }
                });
            }).catch(err => {
                resolve({ success: false, message: err.message });
            });
        });
    });

    // Download file
    ipcMain.handle('sftp-download', async (event, serverId, remotePath, localPath) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sftp) {
            return { success: false, message: 'Not connected' };
        }

        return new Promise((resolve) => {
            session.sftp.fastGet(remotePath, localPath, (err) => {
                if (err) {
                    resolve({ success: false, message: err.message });
                } else {
                    resolve({ success: true });
                }
            });
        });
    });

    // Delete file or directory
    ipcMain.handle('sftp-delete', async (event, serverId, path, isDir) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sshClient) {
            return { success: false, message: 'Not connected' };
        }

        try {
            const cmd = isDir ? `rm -rf "${path}"` : `rm -f "${path}"`;
            await session.sshClient.execCommand(cmd);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    });

    // Create directory
    ipcMain.handle('sftp-create-dir', async (event, serverId, path) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sftp) {
            return { success: false, message: 'Not connected' };
        }

        return new Promise((resolve) => {
            session.sftp.mkdir(path, (err) => {
                if (err) {
                    resolve({ success: false, message: err.message });
                } else {
                    resolve({ success: true });
                }
            });
        });
    });

    // Create file
    ipcMain.handle('sftp-create-file', async (event, serverId, path) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sshClient) {
            return { success: false, message: 'Not connected' };
        }

        try {
            await session.sshClient.execCommand(`touch "${path}"`);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    });

    // Rename file or directory
    ipcMain.handle('sftp-rename', async (event, serverId, oldPath, newPath) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sftp) {
            return { success: false, message: 'Not connected' };
        }

        return new Promise((resolve) => {
            session.sftp.rename(oldPath, newPath, (err) => {
                if (err) {
                    resolve({ success: false, message: err.message });
                } else {
                    resolve({ success: true });
                }
            });
        });
    });

    // Upload folder recursively
    ipcMain.handle('sftp-upload-folder', async (event, serverId, localDir, remoteDir) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.sshClient) {
            return { success: false, message: 'Not connected' };
        }

        try {
            // Use tar to upload folder
            const fs = require('fs');
            const path = require('path');

            // Create temp tar file
            const tempTar = `/tmp/upload-${Date.now()}.tar.gz`;
            const { execSync } = require('child_process');

            execSync(`tar -czf ${tempTar} -C "${path.dirname(localDir)}" "${path.basename(localDir)}"`);

            // Upload tar
            await new Promise((resolve, reject) => {
                session.sftp.fastPut(tempTar, `/tmp/upload.tar.gz`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Extract on remote
            await session.sshClient.execCommand(`mkdir -p "${remoteDir}" && tar -xzf /tmp/upload.tar.gz -C "${remoteDir}" && rm /tmp/upload.tar.gz`);

            // Clean up local temp
            fs.unlinkSync(tempTar);

            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    });
}

module.exports = { registerSFTPHandlers };
