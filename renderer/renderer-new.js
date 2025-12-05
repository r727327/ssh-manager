/**
 * New Modular Renderer Entry Point
 * 
 * This file imports and initializes all modules.
 * The original renderer.js has been preserved as renderer-original.js
 */

// Import modules
import { state } from './modules/state.js';
import { initTerminal, setupTerminalHandlers } from './modules/terminal.js';
import { initWindowControls, initSidebar, initTabs, initModals, initContextMenu } from './modules/ui-controls.js';

// Make state available globally for debugging
window.appState = state;

// Initialize application
async function initApp() {
    console.log('Initializing SSH Manager...');

    // Initialize UI components
    initWindowControls();
    initSidebar();
    initTabs();
    initModals();
    initContextMenu();

    // Initialize terminal
    initTerminal();
    setupTerminalHandlers();

    // Load the rest of the application from original renderer
    // TODO: Extract remaining modules (server-manager, file-explorer, local-files, editor)
    // For now, we'll load the original renderer code
    await loadOriginalRenderer();

    console.log('SSH Manager initialized successfully');
}

// Temporary: Load original renderer code
async function loadOriginalRenderer() {
    // This is a temporary solution
    // The original renderer.js code (minus what we've extracted) should be loaded here
    // OR we continue extracting modules until renderer.js is fully modular

    console.warn('Loading original renderer code - modularization in progress');
    // The original renderer.js will continue to work alongside our modules
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
