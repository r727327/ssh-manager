# SSH Manager - Security Considerations

## Credential Storage
- Encrypt stored passwords and private keys using OS keychain or encrypted storage.
- Avoid storing plain text passwords or passphrases.

## Authentication
- Validate private key format to prevent malformed keys.
- Support multiple keys and ssh-agent.

## Path & File Safety
- Sanitize remote paths to prevent accidental deletion or overwrites.
- Restrict destructive operations (like `rm -rf /`) from UI.

## Session Security
- Keep SSH sessions secure; avoid exposing session objects to UI directly.
- Implement automatic session cleanup on disconnect.

## Logging & Audit
- Optional local logging for commands and SFTP operations.
- Do not log sensitive data such as passwords or private key content.

## Network Security
- Consider SSH keep-alive to avoid idle disconnects.
- Validate host fingerprints to prevent MITM attacks.
