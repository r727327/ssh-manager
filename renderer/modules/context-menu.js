// Context Menu Module - Right-click context menu for files

import { state } from './state.js';
import { handleRenameItem } from './file-explorer.js';
import { downloadItem } from './local-files.js';

// DOM Elements
let contextMenu, ctxEdit, ctxRename, ctxDownload, ctxUpload, ctxDelete;
let contextMenuTarget = null;
let contextMenuSource = 'remote'; // 'remote' or 'local'

export function initContextMenu() {
    // Get DOM elements
    contextMenu = document.getElementById('contextMenu');
    ctxEdit = document.getElementById('ctxEdit');
    ctxRename = document.getElementById('ctxRename');
    ctxDownload = document.getElementById('ctxDownload');
    ctxUpload = document.getElementById('ctxUpload');
    ctxDelete = document.getElementById('ctxDelete');

    // Hide context menu on click outside
    document.addEventListener('click', () => {
        if (contextMenu) contextMenu.classList.remove('show');
    });

    // Context menu item handlers
    ctxEdit?.addEventListener('click', () => {
        contextMenu.classList.remove('show');
        if (contextMenuTarget && !contextMenuTarget.isDir) {
            window.editFile(contextMenuTarget.name);
        }
    });

    ctxRename?.addEventListener('click', () => {
        contextMenu.classList.remove('show');
        if (contextMenuTarget && contextMenuSource === 'remote') {
            handleRenameItem(contextMenuTarget);
        }
    });

    ctxDownload?.addEventListener('click', () => {
        contextMenu.classList.remove('show');
        if (contextMenuTarget && contextMenuSource === 'remote') {
            downloadItem(contextMenuTarget.name);
        }
    });

    ctxUpload?.addEventListener('click', async () => {
        contextMenu.classList.remove('show');
        if (contextMenuTarget && contextMenuSource === 'local') {
            await handleLocalUpload(contextMenuTarget);
        }
    });

    ctxDelete?.addEventListener('click', () => {
        contextMenu.classList.remove('show');
        if (contextMenuTarget) {
            if (contextMenuSource === 'remote') {
                handleRemoteDelete(contextMenuTarget);
            } else {
                alert('Local delete not implemented yet');
            }
        }
    });
}

async function handleLocalUpload(item) {
    if (!state.currentServer) {
        alert('Please connect to a server first.');
        return;
    }

    const name = item.name;
    const isDir = item.isDir;
    const separator = state.currentLocalPath.includes('\\') ? '\\' : '/';
    const localPath = `${state.currentLocalPath}${separator}${name}`;
    const remotePath = state.currentPath === '/' ? `/${name}` : `${state.currentPath}/${name}`;

    try {
        if (isDir) {
            const result = await window.electronAPI.sftpUploadFolder(state.currentServer.id, localPath, remotePath);
            if (result.success) {
                alert('Folder uploaded');
                window.loadFileList(state.currentPath);
            } else {
                alert(`Upload failed: ${result.message}`);
            }
        } else {
            const result = await window.electronAPI.sftpUpload(state.currentServer.id, localPath, remotePath);
            if (result.success) {
                alert('File uploaded');
                window.loadFileList(state.currentPath);
            } else {
                alert(`Upload failed: ${result.message}`);
            }
        }
    } catch (e) {
        alert(`Error: ${e.message}`);
    }
}

async function handleRemoteDelete(item) {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
        return;
    }

    const path = state.currentPath === '/' ? `/${item.name}` : `${state.currentPath}/${item.name}`;
    const result = await window.electronAPI.sftpDelete(state.currentServer.id, path, item.isDir);

    if (result.success) {
        window.loadFileList(state.currentPath);
    } else {
        alert(`Error deleting: ${result.message}`);
    }
}

// Export for global access
window.handleContextMenu = (e, name, isDir) => {
    e.preventDefault();
    contextMenuTarget = { name, isDir };
    contextMenuSource = 'remote';

    // Show/Hide Edit option
    if (isDir) {
        ctxEdit.style.display = 'none';
    } else {
        ctxEdit.style.display = 'flex';
    }

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

    // Show Upload, Hide Download/Edit
    ctxEdit.style.display = 'none';
    ctxDownload.style.display = 'none';
    ctxUpload.style.display = 'flex';

    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.classList.add('show');
};
