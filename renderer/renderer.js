/**
 * Modular Renderer Entry Point
 * 
 * This file imports and initializes all modules for the SSH Manager application.
 */

// Import modules
import { state } from './modules/state.js';
import { initTerminal, setupTerminalHandlers } from './modules/terminal.js';
import { initWindowControls, initSidebar, initTabs, initModals as initUIModals, initContextMenu as initUIContextMenu } from './modules/ui-controls.js';
import { initServerManager } from './modules/server-manager.js';
import { initFileExplorer } from './modules/file-explorer.js';
import { initLocalFiles } from './modules/local-files.js';
import { initEditor } from './modules/editor.js';
import { initModals } from './modules/modals.js';
import { initContextMenu } from './modules/context-menu.js';

// Make state available globally for debugging
window.appState = state;

// Initialize application
async function initApp() {
    console.log('🚀 Initializing SSH Manager (Modular)...');

    try {
        // Initialize UI components
        console.log('  ✓ Initializing UI controls...');
        try {
            initWindowControls();
            console.log('    - Window controls initialized');
        } catch (e) {
            console.error('    ❌ Window controls error:', e);
        }

        try {
            initSidebar();
            console.log('    - Sidebar initialized');
        } catch (e) {
            console.error('    ❌ Sidebar error:', e);
        }

        try {
            initTabs();
            console.log('    - Tabs initialized');
        } catch (e) {
            console.error('    ❌ Tabs error:', e);
        }

        try {
            initUIModals();
            console.log('    - UI modals initialized');
        } catch (e) {
            console.error('    ❌ UI modals error:', e);
        }

        try {
            initUIContextMenu();
            console.log('    - UI context menu initialized');
        } catch (e) {
            console.error('    ❌ UI context menu error:', e);
        }

        // Initialize modals
        console.log('  ✓ Initializing modals...');
        try {
            initModals();
        } catch (e) {
            console.error('    ❌ Modals error:', e);
        }

        // Initialize context menu
        console.log('  ✓ Initializing context menu...');
        try {
            initContextMenu();
        } catch (e) {
            console.error('    ❌ Context menu error:', e);
        }

        // Initialize terminal
        console.log('  ✓ Initializing terminal...');
        try {
            initTerminal();
            setupTerminalHandlers();
        } catch (e) {
            console.error('    ❌ Terminal error:', e);
            throw e; // Terminal is critical
        }

        // Initialize server manager
        console.log('  ✓ Initializing server manager...');
        try {
            initServerManager();
        } catch (e) {
            console.error('    ❌ Server manager error:', e);
        }

        // Initialize file explorer
        console.log('  ✓ Initializing file explorer...');
        try {
            initFileExplorer();
        } catch (e) {
            console.error('    ❌ File explorer error:', e);
        }

        // Initialize local files
        console.log('  ✓ Initializing local files...');
        try {
            initLocalFiles();
        } catch (e) {
            console.error('    ❌ Local files error:', e);
        }

        // Initialize editor
        console.log('  ✓ Initializing editor...');
        try {
            initEditor();
        } catch (e) {
            console.error('    ❌ Editor error:', e);
        }

        console.log('✅ SSH Manager initialized successfully!');
        console.log('📊 Application state is available at window.appState');
    } catch (error) {
        console.error('❌ FATAL Error initializing SSH Manager:', error);
        console.error('Stack trace:', error.stack);
        alert(`Failed to initialize application: ${error.message}\n\nCheck console for details.`);
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
