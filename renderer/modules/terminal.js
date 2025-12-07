// Terminal Module - xterm.js initialization and operations

import { state } from './state.js';

// Terminal and FitAddon are loaded via CDN in index.html
// Access them from the global window object
let terminal;
let fitAddon;
let commandInput;

export function initTerminal() {
    // Initialize terminal from global scope
    const { Terminal } = window;
    const { FitAddon } = window.FitAddon;

    terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, monospace',
        letterSpacing: 0,
        theme: {
            background: '#000000',
            foreground: '#00ff00',
            cursor: '#00ff00',
            selection: 'rgba(255, 255, 255, 0.3)',
        },
    });

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(document.getElementById('terminal'));
    fitAddon.fit();

    commandInput = document.getElementById('commandInput');

    // Resize terminal on window resize
    window.addEventListener('resize', () => {
        fitAddon.fit();
        if (state.editor) state.editor.layout();
    });

    // Copy on selection
    terminal.onSelectionChange(() => {
        const selection = terminal.getSelection();
        if (selection) {
            navigator.clipboard.writeText(selection);
        }
    });

    // Capture terminal input and send to SSH
    terminal.onData(data => {
        if (state.currentServer) {
            window.electronAPI.sendTerminalInput(state.currentServer.id, data);
        }
    });

    // Handle command input (legacy support)
    if (commandInput) {
        commandInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && state.currentServer) {
                const command = commandInput.value.trim();
                if (command) {
                    await window.electronAPI.sendCommand(state.currentServer.id, command + '\n');
                    commandInput.value = '';
                }
            }
        });
    }
}

export function setupTerminalHandlers() {
    // Terminal output handler
    window.electronAPI.onTerminalOutput((serverId, data) => {
        if (serverId === state.currentServer?.id) {
            terminal.write(data);
        }
    });

    // Terminal disconnected handler
    window.electronAPI.onTerminalDisconnected((serverId) => {
        if (serverId === state.currentServer?.id) {
            terminal.writeln('\r\n\x1b[31mConnection closed\x1b[0m\r\n');
            if (commandInput) commandInput.disabled = true;
        }
    });

    // Reconnection handlers
    window.electronAPI.onTerminalReconnecting((serverId, attempt, maxRetries) => {
        if (serverId === state.currentServer?.id) {
            terminal.writeln(`\r\n\x1b[33mReconnecting (${attempt}/${maxRetries})...\x1b[0m\r\n`);
        }
    });

    window.electronAPI.onTerminalReconnected((serverId) => {
        if (serverId === state.currentServer?.id) {
            terminal.writeln('\r\n\x1b[32mReconnected successfully\x1b[0m\r\n');
            if (commandInput) commandInput.disabled = false;
        }
    });

    window.electronAPI.onTerminalReconnectFailed((serverId) => {
        if (serverId === state.currentServer?.id) {
            terminal.writeln('\r\n\x1b[31mReconnection failed\x1b[0m\r\n');
        }
    });
}

export function clearTerminal() {
    if (terminal) terminal.clear();
}

export function writeToTerminal(text) {
    if (terminal) terminal.write(text);
}

export function fitTerminal() {
    if (fitAddon) fitAddon.fit();
}

export function enableCommandInput() {
    if (commandInput) {
        commandInput.disabled = false;
        commandInput.focus();
    }
}

export function disableCommandInput() {
    if (commandInput) {
        commandInput.disabled = true;
        commandInput.value = '';
    }
}
