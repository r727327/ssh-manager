const { ipcMain } = require('electron');

/**
 * Register server management handlers
 * @param {Store} store - Electron store instance
 * @param {Map} sshSessions - Active SSH sessions map
 */
function registerServerHandlers(store, sshSessions) {
    // Get all servers
    ipcMain.handle('get-servers', async () => {
        return store.get('servers', []);
    });

    // Add new server
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

    // Update existing server
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

    // Delete server
    ipcMain.handle('delete-server', async (event, id) => {
        const servers = store.get('servers', []);
        const filtered = servers.filter(s => s.id !== id);
        store.set('servers', filtered);

        // Close SSH session if active
        if (sshSessions.has(id)) {
            const session = sshSessions.get(id);
            if (session.sshClient) {
                session.sshClient.disconnect();
            }
            sshSessions.delete(id);
        }

        return true;
    });
}

module.exports = { registerServerHandlers };
