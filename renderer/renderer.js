// xterm is loaded via CDN in index.html
// Access Terminal and FitAddon from global scope
const { Terminal } = window;
const { FitAddon } = window.FitAddon;

// Initialize terminal
const terminal = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: 'Consolas, Monaco, monospace',
  theme: {
    background: '#000000',
    foreground: '#00ff00',
    cursor: '#00ff00',
    selection: 'rgba(255, 255, 255, 0.3)',
  },
});

const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(document.getElementById('terminal'));
fitAddon.fit();

// Resize terminal on window resize
window.addEventListener('resize', () => {
  fitAddon.fit();
  if (editor) editor.layout();
});

// Copy on selection
terminal.onSelectionChange(() => {
  const selection = terminal.getSelection();
  if (selection) {
    navigator.clipboard.writeText(selection);
  }
});

// State
let servers = [];
let currentServer = null;
let editingServerId = null;
let currentPath = '/';
let editor = null;
let currentEditingFile = null;
let currentLocalPath = null;
let selectedLocalFile = null;
let contextMenuTarget = null;
let itemToDelete = null;

// DOM Elements
const serverList = document.getElementById('serverList');
const addServerBtn = document.getElementById('addServerBtn');
const serverModal = document.getElementById('serverModal');
const serverForm = document.getElementById('serverForm');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const modalTitle = document.getElementById('modalTitle');
const commandInput = document.getElementById('commandInput');
const disconnectBtn = document.getElementById('disconnectBtn');
const connectionInfo = document.getElementById('connectionInfo');
const connectionText = document.getElementById('connectionText');
const authTypeSelect = document.getElementById('authType');
const passwordGroup = document.getElementById('passwordGroup');
const keyGroup = document.getElementById('keyGroup');
const passphraseGroup = document.getElementById('passphraseGroup');

// Window Control Elements
const minBtn = document.getElementById('minBtn');
const maxBtn = document.getElementById('maxBtn');
const closeBtn = document.getElementById('closeBtn');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebar = document.getElementById('sidebar');

// New DOM Elements for Files
const mainTabs = document.getElementById('mainTabs');
const terminalView = document.getElementById('terminalView');
const filesView = document.getElementById('filesView');
const fileList = document.getElementById('fileList');
const breadcrumbs = document.getElementById('breadcrumbs');
const refreshFilesBtn = document.getElementById('refreshFilesBtn');
const createFolderBtn = document.getElementById('createFolderBtn');
const backBtn = document.getElementById('backBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const editorContainer = document.getElementById('editorContainer');
const saveFileBtn = document.getElementById('saveFileBtn');
const closeEditorBtn = document.getElementById('closeEditorBtn');
const editorFileName = document.getElementById('editorFileName');

// Local File Panel DOM Elements
const localFileList = document.getElementById('localFileList');
const localBreadcrumbs = document.getElementById('localBreadcrumbs');
const refreshLocalFilesBtn = document.getElementById('refreshLocalFilesBtn');
const backLocalBtn = document.getElementById('backLocalBtn');
const uploadBtn = document.getElementById('uploadBtn');

// Modal DOM Elements
const contextMenu = document.getElementById('contextMenu');
const renameModal = document.getElementById('renameModal');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const newNameInput = document.getElementById('newNameInput');
const cancelRenameBtn = document.getElementById('cancelRenameBtn');
const closeRenameModal = document.getElementById('closeRenameModal');
const confirmRenameBtn = document.getElementById('confirmRenameBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const remotePathInput = document.getElementById('remotePathInput');
const remoteSearchInput = document.getElementById('remoteSearchInput');
const localPathInput = document.getElementById('localPathInput');
const localSearchInput = document.getElementById('localSearchInput');
const ctxUpload = document.getElementById('ctxUpload');
const ctxDownload = document.getElementById('ctxDownload');

// Prompt Modal Elements
const promptModal = document.getElementById('promptModal');
const promptTitle = document.getElementById('promptTitle');
const promptMessage = document.getElementById('promptMessage');
const promptInput = document.getElementById('promptInput');
const confirmPromptBtn = document.getElementById('confirmPromptBtn');
const cancelPromptBtn = document.getElementById('cancelPromptBtn');
const closePromptBtn = document.getElementById('closePromptModal');

let promptResolve = null;

let remoteSearchQuery = '';
let localSearchQuery = '';
let contextMenuSource = 'remote'; // 'remote' or 'local'

// Prompt Modal Logic
function showPrompt(title, message, defaultValue = '') {
  promptTitle.textContent = title;
  promptMessage.textContent = message;
  promptInput.value = defaultValue;
  promptModal.classList.add('show');
  promptInput.focus();

  return new Promise((resolve) => {
    promptResolve = resolve;
  });
}

function closePrompt(value) {
  promptModal.classList.remove('show');
  if (promptResolve) {
    promptResolve(value);
    promptResolve = null;
  }
}

confirmPromptBtn.addEventListener('click', () => closePrompt(promptInput.value));
cancelPromptBtn.addEventListener('click', () => closePrompt(null));
closePromptBtn.addEventListener('click', () => closePrompt(null));
promptInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') closePrompt(promptInput.value);
});

// Initialize
loadServers();
initMonaco();

// Window Controls
minBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
maxBtn.addEventListener('click', () => window.electronAPI.maximizeWindow());
closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());

// Sidebar Toggle
toggleSidebarBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  setTimeout(() => {
    fitAddon.fit();
    if (editor) editor.layout();
  }, 300);
});

// Event Listeners
addServerBtn.addEventListener('click', openAddModal);
closeModal.addEventListener('click', closeModalHandler);
cancelBtn.addEventListener('click', closeModalHandler);
serverForm.addEventListener('submit', handleFormSubmit);
// Remove HTML command input handling; use xterm for command input
// commandInput.addEventListener('keypress', handleCommandInput);
disconnectBtn.addEventListener('click', handleDisconnect);
authTypeSelect.addEventListener('change', handleAuthTypeChange);

// Context Menu
document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    contextMenu.classList.remove('show');
  }
});

document.getElementById('ctxRename').addEventListener('click', () => {
  contextMenu.classList.remove('show');
  if (contextMenuTarget) openRenameModal(contextMenuTarget);
});

document.getElementById('ctxDownload').addEventListener('click', () => {
  contextMenu.classList.remove('show');
  if (contextMenuTarget) downloadItem(contextMenuTarget.name);
});

document.getElementById('ctxDelete').addEventListener('click', () => {
  contextMenu.classList.remove('show');
  if (contextMenuTarget) {
    if (contextMenuSource === 'remote') {
      openDeleteConfirm(contextMenuTarget);
    } else {
      // Local delete not fully implemented with modal yet, but we can add it or just confirm
      if (confirm(`Are you sure you want to delete ${contextMenuTarget.name}?`)) {
        // Implement local delete if needed, or reuse modal
        // For now let's just alert or skip
        alert('Local delete not implemented in this step');
      }
    }
  }
});

ctxUpload.addEventListener('click', async () => {
  contextMenu.classList.remove('show');
  if (contextMenuTarget && contextMenuSource === 'local') {
    const name = contextMenuTarget.name;
    const isDir = contextMenuTarget.isDir;
    const localPath = `${currentLocalPath}/${name}`;
    const remotePath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;

    try {
      if (isDir) {
        const result = await window.electronAPI.sftpUploadFolder(currentServer.id, localPath, remotePath);
        if (result.success) { alert('Folder uploaded'); loadFileList(currentPath); }
        else alert(`Upload failed: ${result.message}`);
      } else {
        const result = await window.electronAPI.sftpUpload(currentServer.id, localPath, remotePath);
        if (result.success) { alert('File uploaded'); loadFileList(currentPath); }
        else alert(`Upload failed: ${result.message}`);
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  }
});

// Path Inputs
remotePathInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loadFileList(remotePathInput.value);
});
localPathInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loadLocalFileList(localPathInput.value);
});

// Search Inputs
remoteSearchInput.addEventListener('input', (e) => {
  remoteSearchQuery = e.target.value.toLowerCase();
  // We need to re-render with current files. 
  // But we don't have them stored globally except in the DOM or we need to refetch?
  // Better to store currentFileList
  if (currentRemoteFiles) renderFiles(currentRemoteFiles);
});
localSearchInput.addEventListener('input', (e) => {
  localSearchQuery = e.target.value.toLowerCase();
  if (currentLocalFiles) renderLocalFiles(currentLocalFiles);
});

// Rename Modal
cancelRenameBtn.addEventListener('click', () => renameModal.classList.remove('show'));
closeRenameModal.addEventListener('click', () => renameModal.classList.remove('show'));
confirmRenameBtn.addEventListener('click', handleRename);

// Delete Modal
cancelDeleteBtn.addEventListener('click', () => deleteConfirmModal.classList.remove('show'));
closeDeleteModal.addEventListener('click', () => deleteConfirmModal.classList.remove('show'));
confirmDeleteBtn.addEventListener('click', handleDelete);

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const tab = btn.dataset.tab;
    if (tab === 'terminal') {
      terminalView.style.display = 'flex';
      filesView.style.display = 'none';
      fitAddon.fit();
      commandInput.focus();
    } else {
      terminalView.style.display = 'none';
      filesView.style.display = 'flex';
      loadFileList(currentPath);
    }
  });
});

// File Actions
refreshFilesBtn.addEventListener('click', () => loadFileList(currentPath));
createFolderBtn.addEventListener('click', handleCreateFolder);
backBtn.addEventListener('click', handleBackButton);
bulkDeleteBtn.addEventListener('click', handleBulkDelete);
saveFileBtn.addEventListener('click', saveFileContent);
closeEditorBtn.addEventListener('click', closeEditor);

// Local File Actions
refreshLocalFilesBtn.addEventListener('click', () => loadLocalFileList(currentLocalPath));
backLocalBtn.addEventListener('click', handleBackLocalButton);
uploadBtn.addEventListener('click', handleDualPaneUpload);

// Close modal on outside click
serverModal.addEventListener('click', (e) => {
  if (e.target === serverModal) {
    closeModalHandler();
  }
});
renameModal.addEventListener('click', (e) => {
  if (e.target === renameModal) renameModal.classList.remove('show');
});
deleteConfirmModal.addEventListener('click', (e) => {
  if (e.target === deleteConfirmModal) deleteConfirmModal.classList.remove('show');
});

// Terminal output handler
window.electronAPI.onTerminalOutput((serverId, data) => {
  if (currentServer && currentServer.id === serverId) {
    terminal.write(data);
  }
});

// Terminal disconnection handler
window.electronAPI.onTerminalDisconnected((serverId) => {
  if (currentServer && currentServer.id === serverId) {
    terminal.writeln('\r\n\x1b[31mConnection closed\x1b[0m\r\n');
    handleDisconnect();
  }
});

// Functions
async function loadServers() {
  servers = await window.electronAPI.getServers();
  renderServerList();
}

function renderServerList() {
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
  editingServerId = null;
  modalTitle.textContent = 'Add Server';
  serverForm.reset();
  document.getElementById('serverPort').value = '22';
  authTypeSelect.value = 'password';
  handleAuthTypeChange();
  serverModal.classList.add('show');
}

function openEditModal(serverId) {
  editingServerId = serverId;
  const server = servers.find(s => s.id === serverId);
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
  editingServerId = null;
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
    if (editingServerId) {
      await window.electronAPI.updateServer(editingServerId, serverData);
      terminal.writeln('\r\n\x1b[32mServer updated successfully\x1b[0m\r\n');
    } else {
      await window.electronAPI.addServer(serverData);
      terminal.writeln('\r\n\x1b[32mServer added successfully\x1b[0m\r\n');
    }

    await loadServers();
    closeModalHandler();
  } catch (error) {
    terminal.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`);
  }
}

async function deleteServer(serverId) {
  if (!confirm('Are you sure you want to delete this server?')) {
    return;
  }

  try {
    await window.electronAPI.deleteServer(serverId);

    if (currentServer?.id === serverId) {
      await handleDisconnect();
    }

    await loadServers();
    terminal.writeln('\r\n\x1b[32mServer deleted successfully\x1b[0m\r\n');
  } catch (error) {
    terminal.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`);
  }
}

async function connectToServer(serverId) {
  const server = servers.find(s => s.id === serverId);
  if (!server) return;

  // Disconnect from current server if any
  if (currentServer) {
    await handleDisconnect();
  }

  terminal.clear();
  terminal.writeln(`\x1b[36mConnecting to ${server.name} (${server.username}@${server.host})...\x1b[0m\r\n`);

  const result = await window.electronAPI.connectSSH(server);

  if (result.success) {
    currentServer = server;
    // commandInput.disabled = false; // Deprecated
    // commandInput.focus(); // Deprecated
    terminal.focus();
    disconnectBtn.style.display = 'flex';
    mainTabs.style.display = 'flex';

    // Update connection info
    connectionText.textContent = `Connected to ${server.name}`;
    document.querySelector('.status-dot').classList.remove('disconnected');
    document.querySelector('.status-dot').classList.add('connected');

    terminal.writeln(`\x1b[32m✓ Connected successfully\x1b[0m\r\n`);
    renderServerList();

    // Initial file list
    currentPath = `/home/${server.username}`;
    // Don't load file list immediately, wait for user to click tab
  } else {
    terminal.writeln(`\x1b[31m✗ Connection failed: ${result.message}\x1b[0m\r\n`);
  }
}

async function handleDisconnect() {
  if (!currentServer) return;

  await window.electronAPI.disconnectSSH(currentServer.id);

  currentServer = null;
  commandInput.disabled = true;
  commandInput.value = '';
  disconnectBtn.style.display = 'none';
  mainTabs.style.display = 'none';

  // Reset view to terminal
  document.querySelector('.tab-btn[data-tab="terminal"]').click();

  // Update connection info
  connectionText.textContent = 'Not Connected';
  document.querySelector('.status-dot').classList.remove('connected');
  document.querySelector('.status-dot').classList.add('disconnected');

  terminal.writeln('\r\n\x1b[33mDisconnected\x1b[0m\r\n');
  renderServerList();
}

// Capture command input from the xterm terminal
// Capture command input from the xterm terminal
terminal.onData(data => {
  if (currentServer) {
    window.electronAPI.sendTerminalInput(currentServer.id, data);
  }
});
// Remove custom key handler as we are using raw input now
// terminal.attachCustomKeyEventHandler...

// File System Functions
async function loadFileList(path) {
  if (!currentServer) return;

  fileList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  const result = await window.electronAPI.sftpList(currentServer.id, path);

  if (result.success) {
    currentPath = path;
    remotePathInput.value = path;
    currentRemoteFiles = result.files; // Store for filtering
    renderFiles(result.files);
  } else {
    fileList.innerHTML = `<div class="error-msg">Error: ${result.message}</div>`;
  }
}

function renderBreadcrumbs(path) {
  const parts = path.split('/').filter(p => p);
  let html = `<span class="crumb" onclick="loadFileList('/')"><i class="fas fa-home"></i></span>`;

  let current = '';
  parts.forEach((part, index) => {
    current += '/' + part;
    const isLast = index === parts.length - 1;
    html += `<span class="separator">/</span>`;
    if (isLast) {
      html += `<span class="crumb active">${part}</span>`;
    } else {
      html += `<span class="crumb" onclick="loadFileList('${current}')">${part}</span>`;
    }
  });

  breadcrumbs.innerHTML = html;
}

let currentRemoteFiles = [];
function renderFiles(files) {
  const filtered = files.filter(f => f.name.toLowerCase().includes(remoteSearchQuery));
  // Sort: Directories first, then files
  filtered.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name);
    }
    return a.isDirectory ? -1 : 1;
  });

  if (filtered.length === 0) {
    fileList.innerHTML = '<div class="empty-folder">No matches found</div>';
    return;
  }

  fileList.innerHTML = filtered.map(file => {
    const icon = file.isDirectory ? 'fa-folder' : getFileIcon(file.name);
    const size = file.isDirectory ? '-' : formatSize(file.size);
    const date = new Date(file.modifyTime).toLocaleString();

    const safeName = escapeQuote(file.name);
    return `
      <div class="file-row" 
           data-name="${safeName}"
           data-isdir="${file.isDirectory}"
           ondblclick="handleFileDoubleClick('${safeName}', ${file.isDirectory})"
           oncontextmenu="handleContextMenu(event, '${safeName}', ${file.isDirectory})">
        <input type="checkbox" class="remote-select-checkbox" data-name="${safeName}" onclick="event.stopPropagation()" />
        <div class="col-name">
          <i class="fas ${icon} ${file.isDirectory ? 'folder-icon' : 'file-icon'}"></i>
          ${file.name}
        </div>
        <div class="col-size">${size}</div>
        <div class="col-date">${date}</div>
        <div class="col-perm">${file.permissions}</div>
        <div class="file-row-actions">
          ${!file.isDirectory ? `<button class="edit-file-btn" data-filename="${safeName}" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
          <button class="download-item-btn" data-filename="${safeName}" title="Download"><i class="fas fa-download"></i></button>
          <button class="delete-item-btn" data-filename="${safeName}" data-isdir="${file.isDirectory}" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners for action buttons using event delegation
  fileList.querySelectorAll('.edit-file-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editFile(btn.dataset.filename);
    });
  });

  fileList.querySelectorAll('.download-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadItem(btn.dataset.filename);
    });
  });

  fileList.querySelectorAll('.delete-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteConfirm({ name: btn.dataset.filename, isDir: btn.dataset.isdir === 'true' });
    });
  });
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    js: 'fa-js',
    html: 'fa-html5',
    css: 'fa-css3',
    json: 'fa-code',
    md: 'fa-markdown',
    txt: 'fa-file-alt',
    jpg: 'fa-image',
    png: 'fa-image',
    pdf: 'fa-file-pdf',
    zip: 'fa-file-archive',
    tar: 'fa-file-archive',
    gz: 'fa-file-archive',
  };
  return icons[ext] || 'fa-file';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

window.handleFileDoubleClick = (name, isDir) => {
  if (isDir) {
    const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    loadFileList(newPath);
  } else {
    editFile(name);
  }
};

const createFileBtn = document.getElementById('createFileBtn');

// Event Listeners
createFileBtn.addEventListener('click', handleCreateFile);

document.getElementById('ctxEdit').addEventListener('click', () => {
  contextMenu.classList.remove('show');
  if (contextMenuTarget && !contextMenuTarget.isDir) editFile(contextMenuTarget.name);
});

window.handleContextMenu = (e, name, isDir) => {
  e.preventDefault();
  contextMenuTarget = { name, isDir };

  // Show/Hide Edit option
  const editOption = document.getElementById('ctxEdit');
  if (isDir) {
    editOption.style.display = 'none';
  } else {
    editOption.style.display = 'flex';
  }

  contextMenuSource = 'remote';
  ctxUpload.style.display = 'none';
  ctxDownload.style.display = 'flex';

  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.classList.add('show');
};

window.handleLocalContextMenu = (e, name, isDir) => {
  e.preventDefault();
  contextMenuTarget = { name, isDir };
  contextMenuSource = 'local';

  // Show Upload, Hide Download/Edit (Edit is for remote)
  document.getElementById('ctxEdit').style.display = 'none';
  ctxDownload.style.display = 'none';
  ctxUpload.style.display = 'flex';

  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.classList.add('show');
};

// Editor Functions
function initMonaco() {
  require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

  require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('monacoEditor'), {
      value: '',
      language: 'plaintext',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false }
    });
  });
}

window.editFile = async (filename) => {
  if (!currentServer) return;

  const filePath = currentPath === '/' ? `/${filename}` : `${currentPath}/${filename}`;
  editorFileName.textContent = filename;
  currentEditingFile = filePath;

  editorContainer.style.display = 'flex';
  editor.setValue('Loading...');
  editor.updateOptions({ readOnly: true });

  const result = await window.electronAPI.sftpRead(currentServer.id, filePath);

  if (result.success) {
    editor.setValue(result.content);
    editor.updateOptions({ readOnly: false });

    // Detect language
    const ext = filename.split('.').pop().toLowerCase();
    const languages = {
      js: 'javascript', html: 'html', css: 'css', json: 'json', md: 'markdown',
      py: 'python', sh: 'shell', ts: 'typescript', java: 'java', c: 'c', cpp: 'cpp'
    };
    monaco.editor.setModelLanguage(editor.getModel(), languages[ext] || 'plaintext');
  } else {
    editor.setValue(`Error loading file: ${result.message}`);
  }
};

async function saveFileContent() {
  if (!currentServer || !currentEditingFile) return;

  const content = editor.getValue();
  saveFileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  const result = await window.electronAPI.sftpWrite(currentServer.id, currentEditingFile, content);

  if (result.success) {
    saveFileBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
    setTimeout(() => {
      saveFileBtn.innerHTML = '<i class="fas fa-save"></i> Save';
    }, 2000);
  } else {
    alert(`Error saving file: ${result.message}`);
    saveFileBtn.innerHTML = '<i class="fas fa-save"></i> Save';
  }
}

function closeEditor() {
  editorContainer.style.display = 'none';
  currentEditingFile = null;
}

// Local File System Functions
async function loadLocalFileList(path) {
  console.log('Loading local files for path:', path);
  localFileList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const result = await window.electronAPI.localFsList(path);
    console.log('Local files result:', result);

    if (result.success) {
      currentLocalPath = path;
      localPathInput.value = path;
      currentLocalFiles = result.files;
      renderLocalFiles(result.files);
    } else {
      console.error('Error loading local files:', result.message);
      localFileList.innerHTML = `<div class="error-msg">Error: ${result.message}</div>`;
    }
  } catch (err) {
    console.error('Exception loading local files:', err);
    localFileList.innerHTML = `<div class="error-msg">Exception: ${err.message}</div>`;
  }
}

function renderLocalBreadcrumbs(path) {
  const parts = path.split('/').filter(p => p);
  let html = `<span class="crumb" onclick="loadLocalFileList('/')"><i class="fas fa-hdd"></i></span>`;

  let current = '';
  parts.forEach((part, index) => {
    current += '/' + part;
    const isLast = index === parts.length - 1;
    html += `<span class="separator">/</span>`;
    if (isLast) {
      html += `<span class="crumb active">${part}</span>`;
    } else {
      html += `<span class="crumb" onclick="loadLocalFileList('${current}')">${part}</span>`;
    }
  });

  localBreadcrumbs.innerHTML = html;
}

let currentLocalFiles = [];
function renderLocalFiles(files) {
  const filtered = files.filter(f => f.name.toLowerCase().includes(localSearchQuery));
  filtered.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
    return a.isDirectory ? -1 : 1;
  });

  if (filtered.length === 0) {
    localFileList.innerHTML = '<div class="empty-folder">No matches found</div>';
    return;
  }

  localFileList.innerHTML = filtered.map(file => {
    const icon = file.isDirectory ? 'fa-folder' : getFileIcon(file.name);
    const size = file.isDirectory ? '-' : formatSize(file.size);
    const date = new Date(file.modifyTime).toLocaleString();
    const safeName = escapeQuote(file.name);
    return `
    <div class="file-row"
         data-name="${safeName}"
         data-isdir="${file.isDirectory}"
         ondblclick="handleLocalFileDoubleClick('${safeName}', ${file.isDirectory})"
         oncontextmenu="handleLocalContextMenu(event, '${safeName}', ${file.isDirectory})">
      <input type="checkbox" class="local-select-checkbox" data-name="${safeName}" onclick="event.stopPropagation()" />
      <div class="col-name">
        <i class="fas ${icon} ${file.isDirectory ? 'folder-icon' : 'file-icon'}"></i>
        ${file.name}
      </div>
      <div class="col-size">${size}</div>
      <div class="col-date">${date}</div>
    </div>
  `;
  }).join('');
}

window.handleLocalFileDoubleClick = (name, isDir) => {
  if (isDir) {
    const newPath = currentLocalPath === '/' ? `/${name}` : `${currentLocalPath}/${name}`;
    loadLocalFileList(newPath);
  }
};

// Dual Pane Transfer Logic
async function handleDualPaneUpload() {
  if (!currentServer) {
    alert('Please connect to a server first.');
    return;
  }
  // Gather selected local items
  const checkboxes = document.querySelectorAll('.local-select-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('Please select at least one local file or folder to upload.');
    return;
  }

  uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
  let anyError = false;
  for (const cb of checkboxes) {
    const name = cb.dataset.name;
    const isDir = cb.closest('.file-row').dataset.isdir === 'true';
    const localPath = `${currentLocalPath}/${name}`;
    const remotePath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    try {
      if (isDir) {
        const result = await window.electronAPI.sftpUploadFolder(currentServer.id, localPath, remotePath);
        if (!result.success) { anyError = true; alert(`Folder upload failed for ${name}: ${result.message}`); }
      } else {
        const result = await window.electronAPI.sftpUpload(currentServer.id, localPath, remotePath);
        if (!result.success) { anyError = true; alert(`File upload failed for ${name}: ${result.message}`); }
      }
    } catch (e) {
      anyError = true;
      alert(`Error uploading ${name}: ${e.message}`);
    }
  }
  uploadBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Upload';
  if (!anyError) loadFileList(currentPath);
}

// File Operations
window.downloadItem = async (filename) => {
  if (!currentServer) return;

  const remotePath = currentPath === '/' ? `/${filename}` : `${currentPath}/${filename}`;
  const localPath = `${currentLocalPath}/${filename}`;

  if (!confirm(`Download ${filename} to ${currentLocalPath}?`)) return;

  const result = await window.electronAPI.sftpDownload(currentServer.id, remotePath, localPath);

  if (result.success) {
    loadLocalFileList(currentLocalPath); // Refresh local list
    alert('Download complete!');
  } else {
    alert(`Download failed: ${result.message}`);
  }
};

window.openDeleteConfirm = (item) => {
  itemToDelete = item;
  document.getElementById('deleteConfirmMsg').textContent = `Are you sure you want to delete ${item.name}?`;
  deleteConfirmModal.classList.add('show');
};

async function handleDelete() {
  if (!itemToDelete) return;

  const path = currentPath === '/' ? `/${itemToDelete.name}` : `${currentPath}/${itemToDelete.name}`;
  const result = await window.electronAPI.sftpDelete(currentServer.id, path, itemToDelete.isDir);

  if (result.success) {
    loadFileList(currentPath);
    deleteConfirmModal.classList.remove('show');
  } else {
    alert(`Error deleting: ${result.message}`);
  }
}

function openRenameModal(item) {
  contextMenuTarget = item;
  newNameInput.value = item.name;
  renameModal.classList.add('show');
  newNameInput.focus();
}

async function handleRename() {
  if (!contextMenuTarget) return;

  const newName = newNameInput.value.trim();
  if (!newName || newName === contextMenuTarget.name) {
    renameModal.classList.remove('show');
    return;
  }

  const oldPath = currentPath === '/' ? `/${contextMenuTarget.name}` : `${currentPath}/${contextMenuTarget.name}`;
  const newPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;

  const result = await window.electronAPI.sftpRename(currentServer.id, oldPath, newPath);

  if (result.success) {
    loadFileList(currentPath);
    renameModal.classList.remove('show');
  } else {
    alert(`Error renaming: ${result.message}`);
  }
}

async function handleCreateFolder() {
  const name = await showPrompt('New Folder', 'Enter folder name:');
  if (!name) return;

  // Fix path construction logic
  const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
  const result = await window.electronAPI.sftpCreateDir(currentServer.id, path);

  if (result.success) {
    loadFileList(currentPath);
  } else {
    alert(`Error creating folder: ${result.message}`);
  }
}

async function handleUploadFile() {
  if (!currentServer) return;

  const result = await window.electronAPI.showOpenDialog();
  if (result.canceled || result.filePaths.length === 0) return;

  const localPath = result.filePaths[0];
  const filename = localPath.split(/[/\\]/).pop(); // Handle both slash types
  const remotePath = currentPath === '/' ? `/${filename}` : `${currentPath}/${filename}`;

  const uploadResult = await window.electronAPI.sftpUpload(currentServer.id, localPath, remotePath);

  if (uploadResult.success) {
    loadFileList(currentPath);
  } else {
    alert(`Upload failed: ${uploadResult.message}`);
  }
}

async function handleCreateFile() {
  const name = await showPrompt('New File', 'Enter file name:');
  if (!name) return;

  const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
  const result = await window.electronAPI.sftpCreateFile(currentServer.id, path);

  if (result.success) {
    loadFileList(currentPath);
    // Optionally open the new file for editing
    if (confirm('File created. Open for editing?')) {
      editFile(name);
    }
  } else {
    alert(`Error creating file: ${result.message}`);
  }
}

// Back Button Handlers
function handleBackButton() {
  if (!currentServer || currentPath === '/') return;

  // Navigate to parent directory
  const parts = currentPath.split('/').filter(p => p);
  parts.pop(); // Remove last part
  const parentPath = parts.length === 0 ? '/' : '/' + parts.join('/');
  loadFileList(parentPath);
}

function handleBackLocalButton() {
  if (!currentLocalPath || currentLocalPath === '/') return;

  // Navigate to parent directory
  const parts = currentLocalPath.split('/').filter(p => p);
  parts.pop(); // Remove last part
  const parentPath = parts.length === 0 ? '/' : '/' + parts.join('/');
  loadLocalFileList(parentPath);
}

// Bulk Delete Handler
async function handleBulkDelete() {
  if (!currentServer) return;

  const checkboxes = document.querySelectorAll('.remote-select-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('Please select at least one file or folder to delete.');
    return;
  }

  const itemNames = Array.from(checkboxes).map(cb => cb.dataset.name);
  const confirmMsg = `Are you sure you want to delete ${itemNames.length} item(s)?\n\n${itemNames.join('\n')}`;

  if (!confirm(confirmMsg)) return;

  bulkDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
  bulkDeleteBtn.disabled = true;

  let successCount = 0;
  let errorCount = 0;

  for (const cb of checkboxes) {
    const name = cb.dataset.name;
    const isDir = cb.closest('.file-row').dataset.isdir === 'true';
    const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;

    try {
      const result = await window.electronAPI.sftpDelete(currentServer.id, path, isDir);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        console.error(`Failed to delete ${name}: ${result.message}`);
      }
    } catch (e) {
      errorCount++;
      console.error(`Error deleting ${name}:`, e);
    }
  }

  bulkDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Selected';
  bulkDeleteBtn.disabled = false;

  if (errorCount > 0) {
    alert(`Deleted ${successCount} item(s). ${errorCount} item(s) failed.`);
  } else {
    alert(`Successfully deleted ${successCount} item(s).`);
  }

  loadFileList(currentPath);
}

// Initialize
// loadServers(); // Assuming this is called elsewhere or not needed here
initMonaco();

// Initialize Local Path with Home Directory
console.log('Requesting home directory...');
window.electronAPI.getHomeDir().then(homeDir => {
  console.log('Home directory received:', homeDir);
  currentLocalPath = homeDir;
  loadLocalFileList(currentLocalPath);
}).catch(err => {
  console.error('Failed to get home directory:', err);
  localFileList.innerHTML = `<div class="error-msg">Error loading home dir: ${err.message}</div>`;
});

// Helper to escape quotes for HTML attributes
function escapeQuote(str) {
  return str.replace(/'/g, "\\'");
}

// Welcome message
terminal.writeln('\x1b[36m╔═══════════════════════════════════════════════════════╗\x1b[0m');
terminal.writeln('\x1b[36m║                                                       ║\x1b[0m');
terminal.writeln('\x1b[36m║              Welcome to SSH Manager                   ║\x1b[0m');
terminal.writeln('\x1b[36m║                                                       ║\x1b[0m');
terminal.writeln('\x1b[36m║  Select a server from the sidebar to get started     ║\x1b[0m');
terminal.writeln('\x1b[36m║                                                       ║\x1b[0m');
terminal.writeln('\x1b[36m╚═══════════════════════════════════════════════════════╝\x1b[0m');
terminal.writeln('');
