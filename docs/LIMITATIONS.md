# Current Limitations of SSH Manager

## Terminal
- Basic terminal shell only, lacks proper emulation (colors, arrow keys, resizing).
- Limited handling of large output streams.
- No scrollback or search in terminal.

## SFTP / File Management
- File read/write operations limited to small files (<5MB).
- No concurrency handling; multiple operations may conflict.
- Directory caching not implemented, may be slow on large directories.

## Authentication
- Passphrases stored in plaintext (not encrypted).
- Limited key authentication support.

## Session Management
- No automatic reconnect for dropped sessions.
- No keep-alive or heartbeat implemented.

## User Interface
- Single session per terminal view; no tabs.
- Limited drag-and-drop or context menu functionality.
- Notifications for errors or events are minimal.

## Security
- Stored credentials are not encrypted.
- Paths are not sanitized; risk of accidental file deletion.
- No audit or logging of SSH commands or SFTP actions.
