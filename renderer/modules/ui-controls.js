// UI Controls Module - Window controls, modals, tabs, sidebar

import { state } from './state.js';
import { fitTerminal } from './terminal.js';

export function initWindowControls() {
    const minBtn = document.getElementById('minBtn');
    const maxBtn = document.getElementById('maxBtn');
    const closeBtn = document.getElementById('closeBtn');

    minBtn?.addEventListener('click', () => window.electronAPI.minimizeWindow());
    maxBtn?.addEventListener('click', () => window.electronAPI.maximizeWindow());
    closeBtn?.addEventListener('click', () => window.electronAPI.closeWindow());
}

export function initSidebar() {
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const sidebar = document.getElementById('sidebar');

    toggleSidebarBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('collapsed');
        // Fit terminal after sidebar animation
        setTimeout(() => {
            fitTerminal();
            if (state.editor) state.editor.layout();
        }, 300);
    });
}

export function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const terminalView = document.getElementById('terminalView');
    const filesView = document.getElementById('filesView');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            // Update active tab
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show/hide views
            if (tab === 'terminal') {
                terminalView.style.display = 'flex';
                filesView.style.display = 'none';
                // Fit terminal when switching to it
                fitTerminal();
            } else {
                terminalView.style.display = 'none';
                filesView.style.display = 'flex';
                // Load file list if connected
                if (state.currentServer && window.loadFileList) {
                    window.loadFileList(state.currentPath);
                }
            }
        });
    });
}

export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

export function initModals() {
    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close buttons
    document.querySelectorAll('[id$="Modal"] .close, [id$="Btn"][id^="cancel"], [id$="Btn"][id^="close"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
}

export function initContextMenu() {
    const contextMenu = document.getElementById('contextMenu');

    // Hide context menu on click outside
    document.addEventListener('click', () => {
        if (contextMenu) contextMenu.style.display = 'none';
    });

    // Prevent default context menu
    document.addEventListener('contextmenu', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (fileItem) {
            e.preventDefault();
        }
    });
}
