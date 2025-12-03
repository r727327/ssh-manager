# SSH Manager

SSH Manager is a cross-platform desktop application built with **Electron** and **Node.js** that allows you to manage SSH connections, access terminal sessions, and transfer files via SFTP. It is designed for developers and sysadmins who want a simple and powerful SSH client with built-in file management capabilities.

---

## Features

- **SSH Terminal**
  - Connect to servers via password or private key.
  - Send commands and receive real-time output.
  - Terminal disconnect detection.

- **SFTP / File Operations**
  - Browse remote directories.
  - Read and edit files (up to 5MB).
  - Upload/download files.
  - Create, delete, and rename files or directories.
  
- **Server Management**
  - Add, update, delete server entries.
  - Store server info locally using `electron-store`.

- **Local File System**
  - Browse local directories and files.
  - Display file metadata (size, permissions, modification date).

- **Window & UI Controls**
  - Frameless window with custom minimize, maximize, close.
  - Terminal output and disconnect events.

- **Native Dialogs**
  - Open file and save file dialogs.

---

## Installation

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

## Usage

1. Open the application.
2. Add a server with hostname, port, username, and authentication method (password or private key).
3. Connect to the server:
   - Terminal tab for executing commands.
   - SFTP tab for managing files.
4. Use native dialogs to open or save local files.
5. Disconnect SSH sessions safely when done.

---

## Roadmap

Planned features include:
- Full terminal emulation using `xterm.js`.
- Multiple terminal/SFTP tabs.
- Drag-and-drop file uploads/downloads.
- Large file support with streaming.
- Bookmark/favorites for servers.
- Directory synchronization and remote search.

---

## Security

- Store passwords/private keys securely (OS keychain/encryption recommended).
- Sanitize paths for file operations.
- Optional logging for audit purposes.
- Keep SSH sessions alive and properly closed on exit.

---

## Contributing

Contributions are welcome! Feel free to submit issues, feature requests, or pull requests.

---

## License

MIT License © 2025 Ravi Singh
