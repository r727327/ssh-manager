// Configuration constants for SSH Manager

module.exports = {
    // Output buffering
    OUTPUT_BUFFER_SIZE: 64 * 1024, // 64KB chunks
    OUTPUT_FLUSH_INTERVAL: 16, // ~60fps

    // Command queue
    MAX_COMMAND_QUEUE: 100,
    COMMAND_DELAY: 10, // ms between commands

    // Connection health
    KEEPALIVE_INTERVAL: 30000, // 30 seconds
    KEEPALIVE_COUNT_MAX: 3,

    // Reconnection
    RECONNECT_MAX_RETRIES: 3,
    RECONNECT_BACKOFF_BASE: 1000, // 1 second base delay

    // File size limits
    MAX_FILE_SIZE_EDITOR: 5 * 1024 * 1024, // 5MB
};
