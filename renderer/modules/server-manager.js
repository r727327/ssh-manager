// Server Management Module - CRUD operations and connection management

import { state, setState } from './state.js';
import { clearTerminal, writeToTerminal, enableCommandInput, disableCommandInput } from './terminal.js';

// DOM Elements
let serverList, addServerBtn, serverModal, serverForm, closeModal, cancelBtn;
let modalTitle, authTypeSelect, passwordGroup, keyGroup, passphraseGroup;
let disconnectBtn, mainTabs, connectionText;

export function initServerManager() {
    // Get DOM elements
    serverList = document.getElementById('serverList');
    addServerBtn = document.getElementById('addServerBtn');
    serverModal = document.getElementById('serverModal');
    serverForm = document.getElementById('serverForm');
    closeModal = document.getElementById('closeModal');
    cancelBtn = document.getElementById('cancelBtn');
    modalTitle = document.getElementById('modalTitle');
    authTypeSelect = document.getElementById('authType');
    passwordGroup = document.getElementById('passwordGroup');
    keyGroup = document.getElementById('keyGroup');
    passphraseGroup = document.getElementById('passphraseGroup');
    disconnectBtn = document.getElementById('disconnectBtn');
    mainTabs = document.getElementById('mainTabs');
    connectionText = document.getElementById('connectionText');

    // Event listeners
    addServerBtn?.addEventListener('click', openAddModal);
    closeModal?.addEventListener('click', closeModalHandler);
    cancelBtn?.addEventListener('click', closeModalHandler);
    serverForm?.addEventListener('submit', handleFormSubmit);
    authTypeSelect?.addEventListener('change', handleAuthTypeChange);
    disconnectBtn?.addEventListener('click', handleDisconnect);

    // Load servers
    loadServers();
}

export async function loadServers() {
    const servers = await window.electronAPI.getServers();
    setState({ servers });
    renderServerList();
}

export function renderServerList() {
    const { servers, currentServer } = state;

    if (servers.length === 0) {
        serverList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-server"></i>
                <p>No servers added yet.<br>Click "Add Server" to get started.</p>
            </div>
        `;
        return;
    }

    serverList.innerHTML = servers.map(server => `
        <div class="server-item ${currentServer?.id === server.id ? 'active' : ''}" data-id="${server.id}">
            <div class="server-item-header">
                <div class="server-name">
                    <i class="fas fa-server"></i>
                    ${server.name}
                </div>
                <div class="server-actions">
                    <button class="action-btn edit" data-id="${server.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" data-id="${server.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="server-details">
                <div class="server-detail-item">
                    <i class="fas fa-user"></i>
                    <span>${server.username}@${server.host}:${server.port || 22}</span>
                </div>
                <div class="server-detail-item">
                    <i class="fas fa-key"></i>
                    <span>${server.authType === 'key' ? 'SSH Key' : 'Password'}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners
    document.querySelectorAll('.server-item').forEach(item => {
        const serverId = item.dataset.id;
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.server-actions')) {
                connectToServer(serverId);
            }
        });
    });

    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(btn.dataset.id);
        });
    });

    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteServer(btn.dataset.id);
        });
    });
}

function openAddModal() {
    setState({ editingServerId: null });
    modalTitle.textContent = 'Add Server';
    serverForm.reset();
    document.getElementById('serverPort').value = '22';
    authTypeSelect.value = 'password';
    handleAuthTypeChange();
    serverModal.classList.add('show');
}

function openEditModal(serverId) {
    setState({ editingServerId: serverId });
    const server = state.servers.find(s => s.id === serverId);
    if (!server) return;

    modalTitle.textContent = 'Edit Server';
    document.getElementById('serverName').value = server.name;
    document.getElementById('serverHost').value = server.host;
    document.getElementById('serverPort').value = server.port || 22;
    document.getElementById('serverUsername').value = server.username;
    authTypeSelect.value = server.authType || 'password';

    if (server.authType === 'key') {
        document.getElementById('serverPrivateKey').value = server.privateKey || '';
        document.getElementById('serverPassphrase').value = server.passphrase || '';
    } else {
        document.getElementById('serverPassword').value = server.password || '';
    }

    handleAuthTypeChange();
    serverModal.classList.add('show');
}

function closeModalHandler() {
    serverModal.classList.remove('show');
    serverForm.reset();
    setState({ editingServerId: null });
}

function handleAuthTypeChange() {
    const authType = authTypeSelect.value;
    if (authType === 'key') {
        passwordGroup.style.display = 'none';
        keyGroup.style.display = 'block';
        passphraseGroup.style.display = 'block';
        document.getElementById('serverPassword').required = false;
        document.getElementById('serverPrivateKey').required = true;
    } else {
        passwordGroup.style.display = 'block';
        keyGroup.style.display = 'none';
        passphraseGroup.style.display = 'none';
        document.getElementById('serverPassword').required = true;
        document.getElementById('serverPrivateKey').required = false;
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const serverData = {
        name: document.getElementById('serverName').value,
        host: document.getElementById('serverHost').value,
        port: parseInt(document.getElementById('serverPort').value),
        username: document.getElementById('serverUsername').value,
        authType: authTypeSelect.value,
    };

    if (serverData.authType === 'key') {
        serverData.privateKey = document.getElementById('serverPrivateKey').value;
        serverData.passphrase = document.getElementById('serverPassphrase').value;
    } else {
        serverData.password = document.getElementById('serverPassword').value;
    }

    try {
        if (state.editingServerId) {
            await window.electronAPI.updateServer(state.editingServerId, serverData);
            writeToTerminal('\r\n\x1b[32mServer updated successfully\x1b[0m\r\n');
        } else {
            await window.electronAPI.addServer(serverData);
            writeToTerminal('\r\n\x1b[32mServer added successfully\x1b[0m\r\n');
        }

        await loadServers();
        closeModalHandler();
    } catch (error) {
        writeToTerminal(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`);
    }
}

async function deleteServer(serverId) {
    if (!confirm('Are you sure you want to delete this server?')) {
        return;
    }

    try {
        await window.electronAPI.deleteServer(serverId);

        if (state.currentServer?.id === serverId) {
            await handleDisconnect();
        }

        await loadServers();
        writeToTerminal('\r\n\x1b[32mServer deleted successfully\x1b[0m\r\n');
    } catch (error) {
        writeToTerminal(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`);
    }
}

export async function connectToServer(serverId) {
    const server = state.servers.find(s => s.id === serverId);
    if (!server) return;

    // Disconnect from current server if any
    if (state.currentServer) {
        await handleDisconnect();
    }

    clearTerminal();
    writeToTerminal(`\x1b[36mConnecting to ${server.name} (${server.username}@${server.host})...\x1b[0m\r\n`);

    const result = await window.electronAPI.connectSSH(server);

    if (result.success) {
        setState({ currentServer: server });
        enableCommandInput();
        disconnectBtn.style.display = 'flex';
        mainTabs.style.display = 'flex';

        // Update connection info
        connectionText.textContent = `Connected to ${server.name}`;
        document.querySelector('.status-dot').classList.remove('disconnected');
        document.querySelector('.status-dot').classList.add('connected');

        writeToTerminal(`\x1b[32m✓ Connected successfully\x1b[0m\r\n`);
        renderServerList();

        // Set initial path
        setState({ currentPath: `/home/${server.username}` });
    } else {
        writeToTerminal(`\x1b[31m✗ Connection failed: ${result.message}\x1b[0m\r\n`);
    }
}

export async function handleDisconnect() {
    if (!state.currentServer) return;

    await window.electronAPI.disconnectSSH(state.currentServer.id);

    setState({ currentServer: null });
    disableCommandInput();
    disconnectBtn.style.display = 'none';
    mainTabs.style.display = 'none';

    // Reset view to terminal
    document.querySelector('.tab-btn[data-tab="terminal"]')?.click();

    // Update connection info
    connectionText.textContent = 'Not Connected';
    document.querySelector('.status-dot').classList.remove('connected');
    document.querySelector('.status-dot').classList.add('disconnected');

    writeToTerminal('\r\n\x1b[33mDisconnected\x1b[0m\r\n');
    renderServerList();
}
