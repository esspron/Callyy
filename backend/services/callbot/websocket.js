// ============================================
// CALLBOT WEBSOCKET SERVER
// Handles Twilio Media Streams for real-time voice AI
// ============================================

const WebSocket = require('ws');
const { handleMediaStream, getActiveSessionCount } = require('./streamHandler');

let wss = null;

/**
 * Initialize WebSocket server for Twilio Media Streams
 * @param {http.Server} server - HTTP server to attach to
 * @param {string} path - WebSocket path (default: /media-stream)
 */
function initializeWebSocket(server, path = '/media-stream') {
    if (wss) {
        console.warn('[WebSocket] Server already initialized');
        return wss;
    }

    wss = new WebSocket.Server({ 
        server,
        path,
        // Verify it's from Twilio (basic check)
        verifyClient: (info, callback) => {
            // In production, you'd verify Twilio's signature here
            // For now, accept all connections
            callback(true);
        }
    });

    wss.on('connection', (ws, req) => {
        console.log(`[WebSocket] New connection from ${req.socket.remoteAddress}`);
        handleMediaStream(ws, req);
    });

    wss.on('error', (error) => {
        console.error('[WebSocket] Server error:', error);
    });

    console.log(`✅ WebSocket server initialized at path: ${path}`);
    console.log(`   Connect URL: wss://your-domain${path}`);

    return wss;
}

/**
 * Get WebSocket server status
 */
function getStatus() {
    if (!wss) {
        return { status: 'not_initialized', clients: 0, activeCalls: 0 };
    }

    return {
        status: 'running',
        clients: wss.clients.size,
        activeCalls: getActiveSessionCount()
    };
}

/**
 * Close WebSocket server
 */
function close() {
    return new Promise((resolve) => {
        if (!wss) {
            resolve();
            return;
        }

        // Close all client connections
        wss.clients.forEach((client) => {
            client.close(1001, 'Server shutting down');
        });

        wss.close(() => {
            console.log('[WebSocket] Server closed');
            wss = null;
            resolve();
        });
    });
}

module.exports = {
    initializeWebSocket,
    getStatus,
    close
};
