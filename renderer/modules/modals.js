// Modals Module - Prompt, Rename, Delete confirmation modals

let promptModal, promptTitle, promptMessage, promptInput;
let confirmPromptBtn, cancelPromptBtn, closePromptBtn;
let renameModal, newNameInput, confirmRenameBtn, cancelRenameBtn, closeRenameModal;
let deleteConfirmModal, deleteConfirmMsg, confirmDeleteBtn, cancelDeleteBtn, closeDeleteModal;

let promptResolve = null;

export function initModals() {
    // Get DOM elements
    promptModal = document.getElementById('promptModal');
    promptTitle = document.getElementById('promptTitle');
    promptMessage = document.getElementById('promptMessage');
    promptInput = document.getElementById('promptInput');
    confirmPromptBtn = document.getElementById('confirmPromptBtn');
    cancelPromptBtn = document.getElementById('cancelPromptBtn');
    closePromptBtn = document.getElementById('closePromptModal');

    renameModal = document.getElementById('renameModal');
    newNameInput = document.getElementById('newNameInput');
    confirmRenameBtn = document.getElementById('confirmRenameBtn');
    cancelRenameBtn = document.getElementById('cancelRenameBtn');
    closeRenameModal = document.getElementById('closeRenameModal');

    deleteConfirmModal = document.getElementById('deleteConfirmModal');
    deleteConfirmMsg = document.getElementById('deleteConfirmMsg');
    confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    closeDeleteModal = document.getElementById('closeDeleteModal');

    // Prompt modal event listeners
    confirmPromptBtn?.addEventListener('click', () => closePrompt(promptInput.value));
    cancelPromptBtn?.addEventListener('click', () => closePrompt(null));
    closePromptBtn?.addEventListener('click', () => closePrompt(null));
    promptInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') closePrompt(promptInput.value);
    });

    // Rename modal event listeners
    cancelRenameBtn?.addEventListener('click', () => renameModal.classList.remove('show'));
    closeRenameModal?.addEventListener('click', () => renameModal.classList.remove('show'));

    // Delete modal event listeners
    cancelDeleteBtn?.addEventListener('click', () => deleteConfirmModal.classList.remove('show'));
    closeDeleteModal?.addEventListener('click', () => deleteConfirmModal.classList.remove('show'));

    // Close modals on background click
    promptModal?.addEventListener('click', (e) => {
        if (e.target === promptModal) closePrompt(null);
    });
    renameModal?.addEventListener('click', (e) => {
        if (e.target === renameModal) renameModal.classList.remove('show');
    });
    deleteConfirmModal?.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) deleteConfirmModal.classList.remove('show');
    });
}

export function showPrompt(title, message, defaultValue = '') {
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

export function showRenameModal(currentName, onConfirm) {
    newNameInput.value = currentName;
    renameModal.classList.add('show');
    newNameInput.focus();

    // Remove old listener and add new one
    const newConfirmBtn = confirmRenameBtn.cloneNode(true);
    confirmRenameBtn.parentNode.replaceChild(newConfirmBtn, confirmRenameBtn);
    confirmRenameBtn = newConfirmBtn;

    confirmRenameBtn.addEventListener('click', () => {
        const newName = newNameInput.value.trim();
        if (newName && newName !== currentName) {
            onConfirm(newName);
        }
        renameModal.classList.remove('show');
    });
}

export function showDeleteConfirm(itemName, isDir, onConfirm) {
    deleteConfirmMsg.textContent = `Are you sure you want to delete "${itemName}"?`;
    deleteConfirmModal.classList.add('show');

    // Remove old listener and add new one
    const newConfirmBtn = confirmDeleteBtn.cloneNode(true);
    confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, confirmDeleteBtn);
    confirmDeleteBtn = newConfirmBtn;

    confirmDeleteBtn.addEventListener('click', () => {
        onConfirm();
        deleteConfirmModal.classList.remove('show');
    });
}

export function hideAllModals() {
    promptModal?.classList.remove('show');
    renameModal?.classList.remove('show');
    deleteConfirmModal?.classList.remove('show');
}
