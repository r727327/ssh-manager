const { Client } = require('ssh2');
const { KEEPALIVE_INTERVAL, KEEPALIVE_COUNT_MAX } = require('./constants');

/**
 * SSH2 Client Wrapper
 * Provides a Promise-based API over ssh2's callback-based API
 */
class SSHClient {
    constructor() {
        this.client = new Client();
        this.shell = null;
        this.sftp = null;
        this.connected = false;
    }

    /**
     * Connect to SSH server
     * @param {Object} config - SSH connection config
     * @returns {Promise<void>}
     */
    connect(config) {
        return new Promise((resolve, reject) => {
            const sshConfig = {
                host: config.host,
                port: config.port || 22,
                username: config.username,
                keepaliveInterval: config.keepAliveInterval || KEEPALIVE_INTERVAL,
                keepaliveCountMax: KEEPALIVE_COUNT_MAX,
            };

            // Add authentication
            if (config.authType === 'key' && config.privateKey) {
                sshConfig.privateKey = config.privateKey;
                if (config.passphrase) {
                    sshConfig.passphrase = config.passphrase;
                }
            } else if (config.password) {
                sshConfig.password = config.password;
            }

            this.client.on('ready', () => {
                this.connected = true;
                resolve();
            });

            this.client.on('error', (err) => {
                this.connected = false;
                reject(err);
            });

            this.client.connect(sshConfig);
        });
    }

    /**
     * Request interactive shell
     * @returns {Promise<Stream>}
     */
    requestShell() {
        return new Promise((resolve, reject) => {
            this.client.shell({ term: 'xterm-256color' }, (err, stream) => {
                if (err) return reject(err);
                this.shell = stream;
                resolve(stream);
            });
        });
    }

    /**
     * Request SFTP session
     * @returns {Promise<SFTPStream>}
     */
    requestSFTP() {
        return new Promise((resolve, reject) => {
            this.client.sftp((err, sftp) => {
                if (err) return reject(err);
                this.sftp = sftp;
                resolve(sftp);
            });
        });
    }

    /**
     * Execute command on remote server
     * @param {string} command - Command to execute
     * @returns {Promise<{stdout: string, stderr: string, code: number}>}
     */
    execCommand(command) {
        return new Promise((resolve, reject) => {
            this.client.exec(command, (err, stream) => {
                if (err) return reject(err);

                let stdout = '';
                let stderr = '';

                stream.on('data', (data) => {
                    stdout += data.toString();
                });

                stream.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                stream.on('close', (code) => {
                    resolve({ stdout, stderr, code });
                });
            });
        });
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.client) {
            this.client.end();
            this.connected = false;
            this.shell = null;
            this.sftp = null;
        }
    }

    /**
     * Get underlying ssh2 client
     */
    getClient() {
        return this.client;
    }
}

module.exports = SSHClient;
