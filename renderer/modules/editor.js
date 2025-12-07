// Editor Module - Monaco editor integration for file editing

import { state, setState } from './state.js';

// DOM Elements
let editorContainer, saveFileBtn, closeEditorBtn, editorFileName, monacoEditorDiv;
let editor = null;

export function initEditor() {
    // Get DOM elements
    editorContainer = document.getElementById('editorContainer');
    saveFileBtn = document.getElementById('saveFileBtn');
    closeEditorBtn = document.getElementById('closeEditorBtn');
    editorFileName = document.getElementById('editorFileName');
    monacoEditorDiv = document.getElementById('monacoEditor');

    // Event listeners
    saveFileBtn?.addEventListener('click', saveFileContent);
    closeEditorBtn?.addEventListener('click', closeEditor);

    // Initialize Monaco
    initMonaco();
}

function initMonaco() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(monacoEditorDiv, {
            value: '',
            language: 'plaintext',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false }
        });

        setState({ editor });
    });
}

export async function editFile(filename) {
    if (!state.currentServer) return;

    const filePath = state.currentPath === '/' ? `/${filename}` : `${state.currentPath}/${filename}`;
    editorFileName.textContent = filename;
    setState({ currentEditingFile: filePath });

    editorContainer.style.display = 'flex';

    if (editor) {
        editor.setValue('Loading...');
        editor.updateOptions({ readOnly: true });
    }

    const result = await window.electronAPI.sftpRead(state.currentServer.id, filePath);

    if (result.success && editor) {
        editor.setValue(result.content);
        editor.updateOptions({ readOnly: false });

        // Detect language
        const ext = filename.split('.').pop().toLowerCase();
        const languages = {
            js: 'javascript', html: 'html', css: 'css', json: 'json', md: 'markdown',
            py: 'python', sh: 'shell', ts: 'typescript', java: 'java', c: 'c', cpp: 'cpp',
            jsx: 'javascript', tsx: 'typescript', vue: 'html', xml: 'xml', yaml: 'yaml',
            yml: 'yaml', sql: 'sql', php: 'php', rb: 'ruby', go: 'go', rs: 'rust'
        };
        monaco.editor.setModelLanguage(editor.getModel(), languages[ext] || 'plaintext');
    } else {
        if (editor) {
            editor.setValue(`Error loading file: ${result.message}`);
        }
    }
}

async function saveFileContent() {
    if (!state.currentServer || !state.currentEditingFile || !editor) return;

    const content = editor.getValue();
    saveFileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveFileBtn.disabled = true;

    const result = await window.electronAPI.sftpWrite(state.currentServer.id, state.currentEditingFile, content);

    if (result.success) {
        saveFileBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
        setTimeout(() => {
            saveFileBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            saveFileBtn.disabled = false;
        }, 2000);
    } else {
        alert(`Error saving file: ${result.message}`);
        saveFileBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        saveFileBtn.disabled = false;
    }
}

function closeEditor() {
    editorContainer.style.display = 'none';
    setState({ currentEditingFile: null });
}

export function getEditor() {
    return editor;
}

// Export for global access
window.editFile = editFile;
