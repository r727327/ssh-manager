const { ipcMain } = require('electron');
const fs = require('fs');
const SSHClient = require('../utils/ssh-client');
const {
    OUTPUT_BUFFER_SIZE,
    OUTPUT_FLUSH_INTERVAL,
    RECONNECT_MAX_RETRIES,
    RECONNECT_BACKOFF_BASE,
} = require('../utils/constants');

/**
 * Register SSH connection and terminal handlers
 * @param {Map} sshSessions - Active SSH sessions map
 */
function registerSSHHandlers(sshSessions) {
    // Connect to SSH server
    ipcMain.handle('connect-ssh', async (event, server) => {
        try {
            // Close existing session if any
            if (sshSessions.has(server.id)) {
                const oldSession = sshSessions.get(server.id);
                if (oldSession.sshClient) {
                    oldSession.sshClient.disconnect();
                }
                sshSessions.delete(server.id);
            }

            const sshClient = new SSHClient();

            // Prepare config
            const config = {
                host: server.host,
                port: server.port || 22,
                username: server.username,
                authType: server.authType,
                keepAliveInterval: server.keepAliveInterval,
            };

            // Handle authentication
            if (server.authType === 'key' && server.privateKey) {
                try {
                    // If it looks like a path and exists, read the file
                    if (!server.privateKey.includes('BEGIN') && fs.existsSync(server.privateKey)) {
                        config.privateKey = fs.readFileSync(server.privateKey, 'utf8');
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

            // Connect
            await sshClient.connect(config);

            // Request shell
            const shell = await sshClient.requestShell();

            // Request SFTP
            const sftp = await sshClient.requestSFTP();

            // Initialize session state
            const sessionState = {
                sshClient,
                shell,
                sftp,
                server,
                outputBuffer: '',
                outputTimer: null,
                connectionState: 'connected',
                reconnectAttempts: 0,
                lastActivity: Date.now(),
            };

            // Store session
            sshSessions.set(server.id, sessionState);

            // Buffered output handler
            const flushOutputBuffer = () => {
                if (sessionState.outputBuffer.length > 0) {
                    event.sender.send('terminal-output', server.id, sessionState.outputBuffer);
                    sessionState.outputBuffer = '';
                }
                sessionState.outputTimer = null;
            };

            const handleOutput = (data) => {
                sessionState.lastActivity = Date.now();
                sessionState.outputBuffer += data.toString();

                // Flush if buffer exceeds size limit
                if (sessionState.outputBuffer.length >= OUTPUT_BUFFER_SIZE) {
                    if (sessionState.outputTimer) {
                        clearTimeout(sessionState.outputTimer);
                    }
                    flushOutputBuffer();
                } else {
                    // Debounce output for small chunks
                    if (sessionState.outputTimer) {
                        clearTimeout(sessionState.outputTimer);
                    }
                    sessionState.outputTimer = setTimeout(flushOutputBuffer, OUTPUT_FLUSH_INTERVAL);
                }
            };

            // Handle shell output
            shell.on('data', handleOutput);
            shell.stderr.on('data', handleOutput);

            // Handle disconnection
            shell.on('close', () => {
                if (sessionState.outputTimer) {
                    clearTimeout(sessionState.outputTimer);
                    flushOutputBuffer();
                }

                sessionState.connectionState = 'disconnected';
                event.sender.send('terminal-disconnected', server.id);

                // Check if auto-reconnect is enabled
                const autoReconnect = server.autoReconnect || false;
                if (autoReconnect && sessionState.reconnectAttempts < (server.reconnectRetries || RECONNECT_MAX_RETRIES)) {
                    attemptReconnect(event, server, sessionState, sshSessions);
                } else {
                    sshSessions.delete(server.id);
                }
            });

            // Connection error handler
            shell.on('error', (err) => {
                console.error(`Shell error for ${server.id}:`, err);
                handleOutput(`\r\n\x1b[31mConnection error: ${err.message}\x1b[0m\r\n`);
            });

            return { success: true, message: 'Connected successfully' };
        } catch (err) {
            return { success: false, message: err.message };
        }
    });

    // Send terminal input
    ipcMain.handle('terminal-input', async (event, serverId, data) => {
        const session = sshSessions.get(serverId);
        if (!session || !session.shell) {
            return { success: false, message: 'Not connected' };
        }

        try {
            session.shell.write(data);
            session.lastActivity = Date.now();
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    });

    // Disconnect SSH
    ipcMain.handle('disconnect-ssh', async (event, serverId) => {
        const session = sshSessions.get(serverId);
        if (session) {
            // Clear any pending timers
            if (session.outputTimer) {
                clearTimeout(session.outputTimer);
            }

            if (session.sshClient) {
                session.sshClient.disconnect();
            }
            sshSessions.delete(serverId);
        }
        return { success: true };
    });

    // Check connection status
    ipcMain.handle('is-connected', async (event, serverId) => {
        return sshSessions.has(serverId);
    });

    // Reconnection preference management
    ipcMain.handle('set-reconnect-preference', async (event, serverId, preferences) => {
        // This would update server config in store
        // For now, just acknowledge
        return { success: true };
    });

    // Manual reconnect
    ipcMain.handle('manual-reconnect', async (event, serverId) => {
        const session = sshSessions.get(serverId);
        if (!session) {
            return { success: false, message: 'No session found' };
        }

        try {
            // Trigger reconnection
            await attemptReconnect(event, session.server, session, sshSessions);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    });

    // Get queue status (placeholder for future use)
    ipcMain.handle('get-queue-status', async (event, serverId) => {
        return { queueLength: 0 };
    });
}

/**
 * Attempt to reconnect to SSH server
 */
async function attemptReconnect(event, server, oldSessionState, sshSessions) {
    const retryAttempt = oldSessionState.reconnectAttempts + 1;
    const backoffDelay = RECONNECT_BACKOFF_BASE * Math.pow(2, retryAttempt - 1);

    event.sender.send('terminal-reconnecting', server.id, retryAttempt, server.reconnectRetries || RECONNECT_MAX_RETRIES);

    setTimeout(async () => {
        try {
            // Update reconnect attempts
            oldSessionState.reconnectAttempts = retryAttempt;

            // Attempt to reconnect
            const result = await event.sender._events['connect-ssh']?.(event, server);

            if (result && result.success) {
                event.sender.send('terminal-reconnected', server.id);
                // Reset reconnect attempts
                const newSession = sshSessions.get(server.id);
                if (newSession) {
                    newSession.reconnectAttempts = 0;
                }
            } else {
                throw new Error('Reconnection failed');
            }
        } catch (err) {
            console.error('Reconnection attempt failed:', err);

            if (retryAttempt >= (server.reconnectRetries || RECONNECT_MAX_RETRIES)) {
                event.sender.send('terminal-reconnect-failed', server.id);
                sshSessions.delete(server.id);
            } else {
                // Retry
                attemptReconnect(event, server, oldSessionState, sshSessions);
            }
        }
    }, backoffDelay);
}

module.exports = { registerSSHHandlers };
