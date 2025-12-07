// Local Files Module - Local file system operations

import { state } from './state.js';

// DOM Elements
let localFileList, localBreadcrumbs, refreshLocalFilesBtn, backLocalBtn, uploadBtn;
let localPathInput, localSearchInput;

let localSearchQuery = '';
let currentLocalFiles = [];

export function initLocalFiles() {
    // Get DOM elements
    localFileList = document.getElementById('localFileList');
    localBreadcrumbs = document.getElementById('localBreadcrumbs');
    refreshLocalFilesBtn = document.getElementById('refreshLocalFilesBtn');
    backLocalBtn = document.getElementById('backLocalBtn');
    uploadBtn = document.getElementById('uploadBtn');
    localPathInput = document.getElementById('localPathInput');
    localSearchInput = document.getElementById('localSearchInput');

    // Event listeners
    refreshLocalFilesBtn?.addEventListener('click', () => loadLocalFileList(state.currentLocalPath));
    backLocalBtn?.addEventListener('click', handleBackLocalButton);
    uploadBtn?.addEventListener('click', handleDualPaneUpload);

    localPathInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadLocalFileList(localPathInput.value);
    });

    localSearchInput?.addEventListener('input', (e) => {
        localSearchQuery = e.target.value.toLowerCase();
        if (currentLocalFiles) renderLocalFiles(currentLocalFiles);
    });

    // Load home directory initially
    initializeLocalPath();
}

async function initializeLocalPath() {
    const homeDir = await window.electronAPI.getHomeDir();
    if (homeDir) {
        loadLocalFileList(homeDir);
    }
}

export async function loadLocalFileList(path) {
    localFileList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
        const result = await window.electronAPI.localFsList(path);

        if (result.success) {
            state.currentLocalPath = path;
            localPathInput.value = path;
            currentLocalFiles = result.files;
            renderLocalFiles(result.files);
            renderLocalBreadcrumbs(path);
        } else {
            localFileList.innerHTML = `<div class="error-msg">Error: ${result.message}</div>`;
        }
    } catch (err) {
        localFileList.innerHTML = `<div class="error-msg">Exception: ${err.message}</div>`;
    }
}

function renderLocalBreadcrumbs(path) {
    // Handle Windows paths
    const isWindows = path.includes('\\') || /^[A-Z]:/i.test(path);
    const separator = isWindows ? '\\' : '/';
    const parts = path.split(separator).filter(p => p);

    let html = `<span class="crumb" onclick="window.loadLocalFileList('${isWindows ? 'C:\\' : '/'}')"><i class="fas fa-hdd"></i></span>`;

    let current = isWindows ? '' : '';
    parts.forEach((part, index) => {
        if (isWindows && index === 0) {
            current = part; // Drive letter
        } else {
            current += separator + part;
        }

        const isLast = index === parts.length - 1;
        html += `<span class="separator">${separator}</span>`;

        if (isLast) {
            html += `<span class="crumb active">${part}</span>`;
        } else {
            const escapedPath = current.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            html += `<span class="crumb" onclick="window.loadLocalFileList('${escapedPath}')">${part}</span>`;
        }
    });

    localBreadcrumbs.innerHTML = html;
}

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
                 ondblclick="window.handleLocalFileDoubleClick('${safeName}', ${file.isDirectory})"
                 oncontextmenu="window.handleLocalContextMenu(event, '${safeName}', ${file.isDirectory})">
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

function handleBackLocalButton() {
    if (!state.currentLocalPath) return;

    const isWindows = state.currentLocalPath.includes('\\');
    const separator = isWindows ? '\\' : '/';
    const parts = state.currentLocalPath.split(separator).filter(p => p);

    if (parts.length <= 1) return; // Already at root

    parts.pop();
    const newPath = isWindows ? parts.join(separator) : '/' + parts.join('/');
    loadLocalFileList(newPath);
}

async function handleDualPaneUpload() {
    if (!state.currentServer) {
        alert('Please connect to a server first.');
        return;
    }

    const checkboxes = document.querySelectorAll('.local-select-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Please select at least one local file or folder to upload.');
        return;
    }

    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;

    let anyError = false;
    for (const cb of checkboxes) {
        const name = cb.dataset.name;
        const isDir = cb.closest('.file-row').dataset.isdir === 'true';
        const separator = state.currentLocalPath.includes('\\') ? '\\' : '/';
        const localPath = `${state.currentLocalPath}${separator}${name}`;
        const remotePath = state.currentPath === '/' ? `/${name}` : `${state.currentPath}/${name}`;

        try {
            if (isDir) {
                const result = await window.electronAPI.sftpUploadFolder(state.currentServer.id, localPath, remotePath);
                if (!result.success) {
                    anyError = true;
                    alert(`Folder upload failed for ${name}: ${result.message}`);
                }
            } else {
                const result = await window.electronAPI.sftpUpload(state.currentServer.id, localPath, remotePath);
                if (!result.success) {
                    anyError = true;
                    alert(`File upload failed for ${name}: ${result.message}`);
                }
            }
        } catch (e) {
            anyError = true;
            alert(`Error uploading ${name}: ${e.message}`);
        }
    }

    uploadBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Upload';
    uploadBtn.disabled = false;

    if (!anyError) {
        // Refresh remote file list
        window.loadFileList(state.currentPath);
        // Uncheck all checkboxes
        checkboxes.forEach(cb => cb.checked = false);
    }
}

export async function downloadItem(filename) {
    if (!state.currentServer || !state.currentLocalPath) return;

    const remotePath = state.currentPath === '/' ? `/${filename}` : `${state.currentPath}/${filename}`;
    const separator = state.currentLocalPath.includes('\\') ? '\\' : '/';
    const localPath = `${state.currentLocalPath}${separator}${filename}`;

    if (!confirm(`Download ${filename} to ${state.currentLocalPath}?`)) return;

    const result = await window.electronAPI.sftpDownload(state.currentServer.id, remotePath, localPath);

    if (result.success) {
        loadLocalFileList(state.currentLocalPath);
        alert('Download complete!');
    } else {
        alert(`Download failed: ${result.message}`);
    }
}

// Export for global access
window.loadLocalFileList = loadLocalFileList;
window.handleLocalFileDoubleClick = (name, isDir) => {
    if (isDir) {
        const separator = state.currentLocalPath.includes('\\') ? '\\' : '/';
        const newPath = `${state.currentLocalPath}${separator}${name}`;
        loadLocalFileList(newPath);
    }
};
window.downloadItem = downloadItem;
