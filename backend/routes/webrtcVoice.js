// ============================================
// WEBRTC VOICE STREAM ROUTE
// ============================================
// Clean WebRTC voice implementation:
//   - OpenAI Realtime STT with server VAD
//   - Configured LLM for responses
//   - Custom TTS (Google/ElevenLabs)
//   - Natural interruption support
// ============================================

const express = require('express');
const { WebRTCVoiceSession } = require('../services/webrtcVoice');

const router = express.Router();

// Track active sessions
const activeSessions = new Map();

// ============================================
// REST: Create Session
// ============================================

router.post('/session', async (req, res) => {
    try {
        const { assistantId, assistantConfig } = req.body;
        const userId = req.user?.id;

        if (!assistantId && !assistantConfig?.voiceId) {
            return res.status(400).json({ error: 'assistantId or voiceId required' });
        }

        const sessionId = `webrtc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        console.log(`[WebRTC Route] Creating session: ${sessionId}`);

        res.json({
            sessionId,
            wsUrl: `/api/webrtc-voice/ws/${sessionId}`,
            config: {
                sampleRate: 24000,
                channels: 1,
                format: 'pcm16',
            }
        });

    } catch (error) {
        console.error('[WebRTC Route] Session creation error:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// ============================================
// WEBSOCKET: Voice Stream
// ============================================

function setupWebSocket(server) {
    const { WebSocketServer } = require('ws');
    
    const wss = new WebSocketServer({ 
        noServer: true,
        perMessageDeflate: false // Disable compression for lower latency
    });

    // Handle upgrade requests
    server.on('upgrade', (request, socket, head) => {
        // Guard against undefined request.url
        if (!request || !request.url) {
            return; // Let other handlers deal with it
        }

        const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        // Only handle webrtc-voice paths
        if (!pathname.startsWith('/api/webrtc-voice/ws/')) {
            return; // Let other handlers deal with it
        }

        const sessionId = pathname.split('/').pop()?.split('?')[0];

        if (!sessionId) {
            console.log(`[WebRTC WS] Invalid session path: ${pathname}`);
            socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
            socket.destroy();
            return;
        }

        // Complete WebSocket upgrade
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, sessionId);
        });
    });

    wss.on('connection', async (ws, req, sessionId) => {
        // Parse query params for config
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const assistantId = url.searchParams.get('assistantId');
        const configParam = url.searchParams.get('config');
        let assistantConfig = {};
        
        try {
            if (configParam) {
                assistantConfig = JSON.parse(decodeURIComponent(configParam));
            }
        } catch (e) {
            console.warn('[WebRTC WS] Failed to parse config:', e);
        }

        console.log(`[WebRTC WS] 🚀 Client connected: ${sessionId}`);

        let session = null;

        try {
            // Create session
            session = new WebRTCVoiceSession({
                sessionId,
                assistantId,
                assistantConfig,
                
                onTranscript: (text) => {
                    sendJson(ws, { type: 'transcript', text, isFinal: true });
                },

                onResponse: (text) => {
                    sendJson(ws, { type: 'response', text });
                },

                onAudio: (audioBuffer) => {
                    if (audioBuffer === null) {
                        // Signal to stop audio playback (barge-in)
                        sendJson(ws, { type: 'stop_audio' });
                    } else if (ws.readyState === 1) {
                        // Send audio as binary
                        console.log(`[WebRTC WS] 🔊 Sending audio: ${audioBuffer.length} bytes`);
                        ws.send(audioBuffer);
                    }
                },

                onStateChange: (state) => {
                    sendJson(ws, { type: 'state', state });
                },

                onError: (error) => {
                    sendJson(ws, { type: 'error', error: error.message });
                },
            });

            activeSessions.set(sessionId, session);

            // Start session
            await session.start();

            // Handle incoming messages
            ws.on('message', async (data) => {
                try {
                    // Binary data = audio from client
                    if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
                        const audioData = Buffer.isBuffer(data) ? data : Buffer.from(data);
                        session.sendAudio(audioData);
                        return;
                    }

                    // JSON = control messages
                    const message = JSON.parse(data.toString());
                    
                    switch (message.type) {
                        case 'end':
                            console.log(`[WebRTC WS] Client requested end`);
                            session.end();
                            ws.close(1000, 'Session ended');
                            break;

                        case 'config':
                            // Update config mid-session if needed
                            console.log(`[WebRTC WS] Config update:`, message.config);
                            break;

                        default:
                            console.log(`[WebRTC WS] Unknown message type: ${message.type}`);
                    }

                } catch (error) {
                    console.error('[WebRTC WS] Message error:', error);
                }
            });

            // Handle disconnect
            ws.on('close', () => {
                console.log(`[WebRTC WS] 🛑 Client disconnected: ${sessionId}`);
                if (session) {
                    session.end();
                    activeSessions.delete(sessionId);
                }
            });

            ws.on('error', (error) => {
                console.error(`[WebRTC WS] Error: ${error}`);
                if (session) {
                    session.end();
                    activeSessions.delete(sessionId);
                }
            });

        } catch (error) {
            console.error('[WebRTC WS] Session start error:', error);
            sendJson(ws, { type: 'error', error: error.message });
            ws.close(1011, 'Session start failed');
        }
    });
}

function sendJson(ws, data) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(data));
    }
}

module.exports = { router, setupWebSocket };
