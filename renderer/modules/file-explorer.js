// File Explorer Module - Remote file operations and navigation

import { state } from './state.js';
import { showPrompt, showRenameModal, showDeleteConfirm } from './modals.js';

// DOM Elements
let fileList, breadcrumbs, refreshFilesBtn, createFolderBtn, createFileBtn;
let backBtn, bulkDeleteBtn, remotePathInput, remoteSearchInput;

let remoteSearchQuery = '';
let currentRemoteFiles = [];

export function initFileExplorer() {
    // Get DOM elements
    fileList = document.getElementById('fileList');
    breadcrumbs = document.getElementById('breadcrumbs');
    refreshFilesBtn = document.getElementById('refreshFilesBtn');
    createFolderBtn = document.getElementById('createFolderBtn');
    createFileBtn = document.getElementById('createFileBtn');
    backBtn = document.getElementById('backBtn');
    bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    remotePathInput = document.getElementById('remotePathInput');
    remoteSearchInput = document.getElementById('remoteSearchInput');

    // Event listeners
    refreshFilesBtn?.addEventListener('click', () => loadFileList(state.currentPath));
    createFolderBtn?.addEventListener('click', handleCreateFolder);
    createFileBtn?.addEventListener('click', handleCreateFile);
    backBtn?.addEventListener('click', handleBackButton);
    bulkDeleteBtn?.addEventListener('click', handleBulkDelete);

    remotePathInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadFileList(remotePathInput.value);
    });

    remoteSearchInput?.addEventListener('input', (e) => {
        remoteSearchQuery = e.target.value.toLowerCase();
        if (currentRemoteFiles) renderFiles(currentRemoteFiles);
    });
}

export async function loadFileList(path) {
    if (!state.currentServer) return;

    fileList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    const result = await window.electronAPI.sftpList(state.currentServer.id, path);

    if (result.success) {
        state.currentPath = path;
        remotePathInput.value = path;
        currentRemoteFiles = result.files;
        renderFiles(result.files);
        renderBreadcrumbs(path);
    } else {
        fileList.innerHTML = `<div class="error-msg">Error: ${result.message}</div>`;
    }
}

function renderBreadcrumbs(path) {
    const parts = path.split('/').filter(p => p);
    let html = `<span class="crumb" onclick="window.loadFileList('/')"><i class="fas fa-home"></i></span>`;

    let current = '';
    parts.forEach((part, index) => {
        current += '/' + part;
        const isLast = index === parts.length - 1;
        html += `<span class="separator">/</span>`;
        if (isLast) {
            html += `<span class="crumb active">${part}</span>`;
        } else {
            html += `<span class="crumb" onclick="window.loadFileList('${current}')">${part}</span>`;
        }
    });

    breadcrumbs.innerHTML = html;
}

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
                 ondblclick="window.handleFileDoubleClick('${safeName}', ${file.isDirectory})"
                 oncontextmenu="window.handleContextMenu(event, '${safeName}', ${file.isDirectory})">
                <input type="checkbox" class="remote-select-checkbox" data-name="${safeName}" onclick="event.stopPropagation()" />
                <div class="col-name">
                    <i class="fas ${icon} ${file.isDirectory ? 'folder-icon' : 'file-icon'}"></i>
                    ${file.name}
                </div>
                <div class="col-size">${size}</div>
                <div class="col-date">${date}</div>
                <div class="file-row-actions">
                    ${!file.isDirectory ? `<button class="edit-file-btn" data-filename="${safeName}" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
                    <button class="download-item-btn" data-filename="${safeName}" title="Download"><i class="fas fa-download"></i></button>
                    <button class="delete-item-btn" data-filename="${safeName}" data-isdir="${file.isDirectory}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners for action buttons
    fileList.querySelectorAll('.edit-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.editFile(btn.dataset.filename);
        });
    });

    fileList.querySelectorAll('.download-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.downloadItem(btn.dataset.filename);
        });
    });

    fileList.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = { name: btn.dataset.filename, isDir: btn.dataset.isdir === 'true' };
            handleDeleteItem(item);
        });
    });
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        js: 'fa-js', html: 'fa-html5', css: 'fa-css3', json: 'fa-code',
        md: 'fa-markdown', txt: 'fa-file-alt', jpg: 'fa-image', png: 'fa-image',
        pdf: 'fa-file-pdf', zip: 'fa-file-archive', tar: 'fa-file-archive', gz: 'fa-file-archive',
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

function escapeQuote(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function handleBackButton() {
    if (state.currentPath === '/') return;
    const parts = state.currentPath.split('/').filter(p => p);
    parts.pop();
    const newPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    loadFileList(newPath);
}

async function handleCreateFolder() {
    const name = await showPrompt('New Folder', 'Enter folder name:');
    if (!name) return;

    const path = state.currentPath === '/' ? `/${name}` : `${state.currentPath}/${name}`;
    const result = await window.electronAPI.sftpCreateDir(state.currentServer.id, path);

    if (result.success) {
        loadFileList(state.currentPath);
    } else {
        alert(`Error creating folder: ${result.message}`);
    }
}

async function handleCreateFile() {
    const name = await showPrompt('New File', 'Enter file name:');
    if (!name) return;

    const path = state.currentPath === '/' ? `/${name}` : `${state.currentPath}/${name}`;
    const result = await window.electronAPI.sftpCreateFile(state.currentServer.id, path);

    if (result.success) {
        loadFileList(state.currentPath);
    } else {
        alert(`Error creating file: ${result.message}`);
    }
}

async function handleBulkDelete() {
    const checkboxes = document.querySelectorAll('.remote-select-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Please select at least one item to delete.');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${checkboxes.length} item(s)?`)) {
        return;
    }

    for (const cb of checkboxes) {
        const name = cb.dataset.name;
        const isDir = cb.closest('.file-row').dataset.isdir === 'true';
        const path = state.currentPath === '/' ? `/${name}` : `${state.currentPath}/${name}`;

        await window.electronAPI.sftpDelete(state.currentServer.id, path, isDir);
    }

    loadFileList(state.currentPath);
}

function handleDeleteItem(item) {
    showDeleteConfirm(item.name, item.isDir, async () => {
        const path = state.currentPath === '/' ? `/${item.name}` : `${state.currentPath}/${item.name}`;
        const result = await window.electronAPI.sftpDelete(state.currentServer.id, path, item.isDir);

        if (result.success) {
            loadFileList(state.currentPath);
        } else {
            alert(`Error deleting: ${result.message}`);
        }
    });
}

export function handleRenameItem(item) {
    showRenameModal(item.name, async (newName) => {
        const oldPath = state.currentPath === '/' ? `/${item.name}` : `${state.currentPath}/${item.name}`;
        const newPath = state.currentPath === '/' ? `/${newName}` : `${state.currentPath}/${newName}`;

        const result = await window.electronAPI.sftpRename(state.currentServer.id, oldPath, newPath);

        if (result.success) {
            loadFileList(state.currentPath);
        } else {
            alert(`Error renaming: ${result.message}`);
        }
    });
}

// Export for global access
window.loadFileList = loadFileList;
window.handleFileDoubleClick = (name, isDir) => {
    if (isDir) {
        const newPath = state.currentPath === '/' ? `/${name}` : `${state.currentPath}/${name}`;
        loadFileList(newPath);
    } else {
        window.editFile(name);
    }
};
