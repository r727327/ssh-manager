# SSH Manager Roadmap

## Phase 1 - Core Stability
- Improve terminal reliability and session handling.
- Enhance error handling for SSH and SFTP.
- Add terminal disconnect detection and reconnection.

## Phase 2 - SFTP Enhancements
- Support large file uploads/downloads with streaming.
- Implement concurrent SFTP operations.
- Cache directory trees for performance.
- Display file permissions, owner, group, and modification times.

## Phase 3 - Authentication & Security
- Validate private key format and passphrases.
- Integrate secure storage (OS keychain/encrypted storage).
- Implement input validation and sanitize paths.

## Phase 4 - UI/UX Improvements
- Integrate `xterm.js` for full-featured terminal.
- Add tabs for multiple sessions.
- Drag-and-drop support for file transfers.
- Add context menu for file operations.
- Notifications for connection/file transfer status.

## Phase 5 - Advanced Features
- Remote file search functionality.
- Directory sync (local ↔ remote).
- Logging and exporting of terminal sessions.
- Bookmark/favorites support for servers.

## Phase 6 - Performance & Optimization
- Lazy load directory listings.
- Limit concurrent connections per server.
- Optimize terminal and SFTP performance for large directories.
