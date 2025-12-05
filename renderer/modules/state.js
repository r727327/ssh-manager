// Shared Application State

export const state = {
    // Server management
    servers: [],
    currentServer: null,
    editingServerId: null,

    // File navigation
    currentPath: '/',
    currentLocalPath: null,
    selectedLocalFile: null,

    // Editor
    editor: null,
    currentEditingFile: null,

    // UI state
    contextMenuTarget: null,
    itemToDelete: null,
};

// Helper to update state and trigger re-renders if needed
export function setState(updates) {
    Object.assign(state, updates);
}
