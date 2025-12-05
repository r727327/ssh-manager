# SSH Manager

A modern, cross-platform SSH client built with **Electron** and **Node.js**. Manage SSH connections, execute commands in a full-featured terminal, and transfer files with an intuitive dual-pane SFTP interface.

---

## ✨ Features

### 🖥️ Terminal
- **Full xterm.js Integration** - Native terminal emulation with complete ANSI support
- **Interactive Shell** - Arrow keys, tab completion, and all terminal features work natively
- **Connection Health Monitoring** - Keep-alive packets prevent idle disconnections
- **Auto-Reconnect** - Automatic reconnection with exponential backoff on connection loss
- **High Performance** - Buffered output handling for smooth rendering of large outputs

### 📁 SFTP / File Management
- **Dual-Pane Interface** - FileZilla-style layout with local and remote file browsers
- **Multi-Select Operations** - Select multiple files/folders for bulk operations
- **File Operations**
  - Upload/download files and folders (with recursive support)
  - Create, delete, rename files and directories
  - Edit remote files with Monaco Editor (syntax highlighting)
  - View file permissions and metadata
- **Navigation**
  - Breadcrumb navigation
  - Direct path input
  - Search/filter files
  - Parent directory navigation
- **Context Menu** - Right-click for quick actions (upload, download, rename, delete, edit)

### 🔐 Authentication
- **Password Authentication** - Standard username/password login
- **SSH Key Authentication** - Support for private keys with optional passphrase
- **Secure Storage** - Credentials stored locally using electron-store

### 💾 Server Management
- **Save Multiple Servers** - Store unlimited server configurations
- **Quick Connect** - One-click connection to saved servers
- **Edit/Delete** - Manage server entries easily
- **Connection Status** - Visual indicators for connection state

### 🎨 User Interface
- **Modern Design** - Clean, dark-themed interface with smooth animations
- **Frameless Window** - Custom title bar with minimize, maximize, close controls
- **Collapsible Sidebar** - Maximize workspace when needed
- **Tab Interface** - Switch between Terminal and Files views
- **Responsive Layout** - Adapts to window resizing

---

## 🚀 Installation

### Prerequisites
- Node.js 16+ and npm

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ssh-manager.git
cd ssh-manager
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the application**
```bash
npm start
```

---

## 📖 Usage

### Adding a Server
1. Click **"Add Server"** in the sidebar
2. Enter server details:
   - Server name (for easy identification)
   - Host (IP address or domain)
   - Port (default: 22)
   - Username
   - Authentication method (password or SSH key)
3. Click **"Save"**

### Connecting
1. Click on a server in the sidebar
2. Wait for connection confirmation
3. Use the **Terminal** tab for command execution
4. Use the **Files** tab for file management

### Terminal Operations
- Type commands directly in the terminal
- Use arrow keys for command history
- Press Ctrl+C to interrupt running commands
- Terminal supports all standard features (vim, nano, top, etc.)

### File Operations
- **Upload**: Select local files → right-click → Upload
- **Download**: Select remote files → click Download button or right-click → Download
- **Edit**: Double-click a file or right-click → Edit
- **Bulk Delete**: Select multiple items → click "Delete Selected"
- **Navigate**: Double-click folders or use breadcrumbs/path input

---

## 🛠️ Technical Stack

- **Electron** - Cross-platform desktop framework
- **Node.js** - Runtime environment
- **node-ssh** - SSH2 client for Node.js
- **xterm.js** - Terminal emulator
- **Monaco Editor** - Code editor (VS Code's editor)
- **electron-store** - Persistent storage

---

## 🔒 Security Considerations

- Credentials are stored locally using electron-store
- SSH connections use standard SSH2 protocol
- Private keys can be password-protected
- **Recommendation**: Use SSH keys instead of passwords for better security
- **Future**: OS keychain integration for encrypted credential storage

---

## 🐛 Known Limitations

- File editor limited to 5MB files (for performance)
- Maximum 100 queued commands (prevents memory issues)
- SFTP operations may fail during reconnection (retry after reconnect)

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs via GitHub Issues
- Suggest features
- Submit pull requests

---

## 📄 License

MIT License © 2025 Ravi Singh

---

## 🙏 Acknowledgments

Built with:
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [node-ssh](https://github.com/steelbrain/node-ssh) - SSH client
- [Electron](https://www.electronjs.org/) - Desktop framework
