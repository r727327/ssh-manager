const { ipcMain, dialog } = require('electron');
const os = require('os');

/**
 * Register window control handlers
 * @param {BrowserWindow} win - Main window instance
 */
function registerWindowHandlers(win) {
    // Window controls
    ipcMain.handle('window-minimize', () => win.minimize());

    ipcMain.handle('window-maximize', () => {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });

    ipcMain.handle('window-close', () => win.close());

    // File dialogs
    ipcMain.handle('open-file-dialog', async () => {
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
        });
        return result.filePaths[0] || null;
    });

    ipcMain.handle('save-file-dialog', async (event, defaultPath) => {
        const result = await dialog.showSaveDialog(win, {
            defaultPath,
        });
        return result.filePath || null;
    });

    // Utility
    ipcMain.handle('get-home-dir', () => {
        return os.homedir();
    });

    // Local filesystem operations
    ipcMain.handle('local-fs-list', async (event, dirPath) => {
        const fs = require('fs').promises;
        const path = require('path');

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const files = await Promise.all(
                entries.map(async (entry) => {
                    const fullPath = path.join(dirPath, entry.name);
                    try {
                        const stats = await fs.stat(fullPath);
                        return {
                            name: entry.name,
                            isDirectory: entry.isDirectory(),
                            size: stats.size,
                            modifyTime: stats.mtimeMs,
                            permissions: stats.mode.toString(8).slice(-3),
                        };
                    } catch (err) {
                        // If we can't stat the file, return basic info
                        return {
                            name: entry.name,
                            isDirectory: entry.isDirectory(),
                            size: 0,
                            modifyTime: 0,
                            permissions: '000',
                        };
                    }
                })
            );
            return { success: true, files };
        } catch (err) {
            return { success: false, message: err.message };
        }
    });
}

module.exports = { registerWindowHandlers };
