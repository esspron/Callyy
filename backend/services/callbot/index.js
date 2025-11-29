/**
 * CALLBOT SERVICE - Ultra Low Latency Voice Processing
 * 
 * Design Principles:
 * 1. Respond in < 50ms (before AI call)
 * 2. Preload everything possible into Redis
 * 3. Zero database calls in hot path
 * 4. Streaming responses to Twilio
 */

const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');

const app = express();
const port = process.env.PORT || 3002;

// Redis for ultra-fast cache reads
const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    commandTimeout: 100, // Fail fast - 100ms max
});

// Preload critical data on startup
let assistantCache = new Map();
let voiceCache = new Map();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'callbot',
        cachedAssistants: assistantCache.size,
        latency: 'optimized'
    });
});

// ============================================
// TWILIO VOICE WEBHOOK - ULTRA LOW LATENCY
// ============================================

app.post('/voice/incoming', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { To, From, CallSid } = req.body;
        
        // 1. Get assistant config from cache (< 1ms)
        const config = await getPhoneConfig(To);
        
        if (!config || !config.assistant_id) {
            return sendTwiML(res, `
                <Response>
                    <Say>This number is not configured. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }
        
        // 2. Get assistant from cache (< 1ms)
        const assistant = assistantCache.get(config.assistant_id) || 
                          await loadAssistant(config.assistant_id);
        
        if (!assistant) {
            return sendTwiML(res, `
                <Response>
                    <Say>Assistant not available. Please try again later.</Say>
                    <Hangup/>
                </Response>
            `);
        }
        
        // 3. Store call context in Redis for streaming (< 5ms)
        await redis.setex(`call:${CallSid}`, 3600, JSON.stringify({
            assistantId: config.assistant_id,
            assistantName: assistant.name,
            systemPrompt: assistant.system_prompt,
            voiceId: assistant.voice_id,
            from: From,
            to: To,
            startedAt: Date.now()
        }));
        
        // 4. Connect to streaming AI (Twilio <Stream>)
        const streamUrl = `wss://${process.env.CALLBOT_HOST}/voice/stream/${CallSid}`;
        
        const twiml = `
            <Response>
                <Connect>
                    <Stream url="${streamUrl}">
                        <Parameter name="callSid" value="${CallSid}"/>
                        <Parameter name="assistantId" value="${config.assistant_id}"/>
                    </Stream>
                </Connect>
            </Response>
        `;
        
        console.log(`[CALLBOT] Incoming call setup in ${Date.now() - startTime}ms`);
        sendTwiML(res, twiml);
        
    } catch (error) {
        console.error('[CALLBOT] Error:', error.message);
        sendTwiML(res, `
            <Response>
                <Say>We're experiencing technical difficulties. Please try again.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

// Status callback - async, not latency sensitive
app.post('/voice/status', async (req, res) => {
    res.sendStatus(200); // Respond immediately
    
    // Queue for async processing (don't block)
    const { CallSid, CallStatus, CallDuration } = req.body;
    
    // Fire and forget - log to Redis queue for backend to process
    redis.rpush('call:logs', JSON.stringify({
        callSid: CallSid,
        status: CallStatus,
        duration: CallDuration,
        timestamp: Date.now()
    })).catch(console.error);
});

// ============================================
// WEBSOCKET STREAMING (for real-time voice)
// ============================================

const WebSocket = require('ws');
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server, path: '/voice/stream' });

wss.on('connection', async (ws, req) => {
    const callSid = new URL(req.url, 'http://localhost').searchParams.get('callSid');
    console.log(`[CALLBOT] Stream connected for call: ${callSid}`);
    
    // Get call context from Redis
    const contextStr = await redis.get(`call:${callSid}`);
    const context = contextStr ? JSON.parse(contextStr) : null;
    
    if (!context) {
        ws.close();
        return;
    }
    
    // Handle incoming audio from Twilio
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            
            if (message.event === 'media') {
                // Audio chunk from caller - send to STT
                // Then to LLM, then to TTS, then back to Twilio
                // This is where your AI processing happens
                await processAudioChunk(ws, context, message.media.payload);
            }
        } catch (error) {
            console.error('[CALLBOT] Stream error:', error.message);
        }
    });
    
    ws.on('close', () => {
        console.log(`[CALLBOT] Stream closed for call: ${callSid}`);
    });
});

// ============================================
// CACHE HELPERS - Everything Preloaded
// ============================================

async function getPhoneConfig(phoneNumber) {
    // Normalize phone number
    const normalized = phoneNumber.replace(/[^\d+]/g, '');
    
    // Try cache first
    const cached = await redis.get(`phone:${normalized}`);
    if (cached) return JSON.parse(cached);
    
    // Cache miss - this shouldn't happen often
    // The backend service should preload all phone configs
    console.warn(`[CALLBOT] Cache miss for phone: ${normalized}`);
    return null;
}

async function loadAssistant(assistantId) {
    const cached = await redis.get(`assistant:${assistantId}`);
    if (cached) {
        const assistant = JSON.parse(cached);
        assistantCache.set(assistantId, assistant);
        return assistant;
    }
    return null;
}

function sendTwiML(res, twiml) {
    res.set('Content-Type', 'text/xml');
    res.send(twiml.trim());
}

async function processAudioChunk(ws, context, audioPayload) {
    // TODO: Integrate with your STT/LLM/TTS pipeline
    // For now, this is a placeholder
    // 
    // Options for ultra-low latency:
    // 1. Deepgram for STT (streaming, ~100ms)
    // 2. Groq for LLM (fastest inference, ~50ms)
    // 3. ElevenLabs for TTS (streaming, ~100ms)
}

// ============================================
// STARTUP - Preload Cache
// ============================================

async function preloadCache() {
    console.log('[CALLBOT] Preloading cache...');
    
    // Wait for Redis connection
    await new Promise(resolve => redis.once('ready', resolve));
    
    // Load all phone configs from Redis (backend populates these)
    const phoneKeys = await redis.keys('phone:*');
    console.log(`[CALLBOT] Found ${phoneKeys.length} phone configs in cache`);
    
    // Load all assistants from Redis
    const assistantKeys = await redis.keys('assistant:*');
    for (const key of assistantKeys) {
        const data = await redis.get(key);
        if (data) {
            const assistant = JSON.parse(data);
            assistantCache.set(assistant.id, assistant);
        }
    }
    console.log(`[CALLBOT] Loaded ${assistantCache.size} assistants into memory`);
}

// Start server
server.listen(port, async () => {
    console.log(`[CALLBOT] Service running on port ${port}`);
    await preloadCache();
    console.log('[CALLBOT] Ready for calls!');
});

module.exports = app;
