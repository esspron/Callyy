/**
 * CALLBOT SERVICE - Ultra Low Latency Voice Processing
 * 
 * Design Principles:
 * 1. Respond in < 50ms (before AI call)
 * 2. Preload everything possible into Redis
 * 3. Zero database calls in hot path
 * 4. Streaming responses to Twilio
 * 
 * Voice Pipeline:
 * 1. Twilio Media Stream → Audio chunks (mulaw 8kHz)
 * 2. STT (Deepgram/OpenAI Realtime) → Text
 * 3. LLM (AssistantProcessor) → Response text
 * 4. TTS (Google/ElevenLabs/OpenAI) → Audio
 * 5. Audio → Twilio Media Stream
 */

const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const { processMessage } = require('../assistantProcessor');
const { synthesizeForTwilio, synthesize, getVoiceConfig } = require('../tts');

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

// Active call sessions
const activeCalls = new Map();

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
// VOICE PIPELINE - Full STT → LLM → TTS Flow
// ============================================

/**
 * Process complete voice turn
 * Call this after STT returns transcribed text
 */
async function processVoiceTurn(ws, context, transcribedText) {
    const startTime = Date.now();
    
    try {
        console.log(`[CALLBOT] Processing: "${transcribedText.substring(0, 50)}..."`);
        
        // 1. Get assistant config
        const assistant = assistantCache.get(context.assistantId) || 
                          await loadAssistant(context.assistantId);
        
        if (!assistant) {
            console.error('[CALLBOT] Assistant not found:', context.assistantId);
            return { error: 'Assistant not found' };
        }
        
        // 2. Get conversation history from Redis
        const historyKey = `call:history:${context.callSid}`;
        const historyStr = await redis.get(historyKey);
        const conversationHistory = historyStr ? JSON.parse(historyStr) : [];
        
        // 3. Process through LLM
        const llmResult = await processMessage({
            message: transcribedText,
            assistantId: context.assistantId,
            conversationHistory,
            channel: 'calls',
            customer: null,
            memory: null,
            userId: assistant.user_id
        });
        
        if (llmResult.error) {
            console.error('[CALLBOT] LLM Error:', llmResult.error);
            return { error: llmResult.error };
        }
        
        console.log(`[CALLBOT] LLM response in ${Date.now() - startTime}ms`);
        
        // 4. Update conversation history
        conversationHistory.push(
            { role: 'user', content: transcribedText },
            { role: 'assistant', content: llmResult.response }
        );
        await redis.setex(historyKey, 3600, JSON.stringify(conversationHistory));
        
        // 5. Synthesize TTS
        const ttsStart = Date.now();
        
        // Get voice config
        const voiceConfig = await getVoiceConfigCached(assistant.voice_id);
        const languageCode = assistant.language_settings?.default === 'hi' ? 'hi-IN' : 'en-IN';
        
        const ttsResult = await synthesize({
            text: llmResult.response,
            provider: voiceConfig?.tts_provider || 'google',
            voiceId: voiceConfig?.provider_voice_id || voiceConfig?.elevenlabs_voice_id || 'Achernar',
            languageCode,
            languageVoiceCodes: voiceConfig?.language_voice_codes || {},
            voiceSettings: {
                modelId: voiceConfig?.provider_model || voiceConfig?.elevenlabs_model_id,
                stability: voiceConfig?.default_stability,
                similarityBoost: voiceConfig?.default_similarity
            }
        });
        
        console.log(`[CALLBOT] TTS in ${Date.now() - ttsStart}ms, total: ${Date.now() - startTime}ms`);
        
        if (!ttsResult.success) {
            console.error('[CALLBOT] TTS Error:', ttsResult.error);
            return { 
                response: llmResult.response,
                audio: null,
                error: ttsResult.error
            };
        }
        
        // 6. Send audio back to Twilio via WebSocket
        if (ws.readyState === WebSocket.OPEN) {
            // Convert base64 MP3 to mulaw for Twilio (or use direct MP3 streaming)
            const audioPayload = {
                event: 'media',
                media: {
                    payload: ttsResult.audioContent
                }
            };
            ws.send(JSON.stringify(audioPayload));
        }
        
        return {
            response: llmResult.response,
            audio: ttsResult.audioContent,
            latency: Date.now() - startTime
        };
        
    } catch (error) {
        console.error('[CALLBOT] Voice turn error:', error.message);
        return { error: error.message };
    }
}

/**
 * Get voice config with caching
 */
async function getVoiceConfigCached(voiceId) {
    if (!voiceId) return null;
    
    // Check memory cache first
    if (voiceCache.has(voiceId)) {
        return voiceCache.get(voiceId);
    }
    
    // Check Redis
    const cached = await redis.get(`voice:${voiceId}`);
    if (cached) {
        const voice = JSON.parse(cached);
        voiceCache.set(voiceId, voice);
        return voice;
    }
    
    // Fetch from service
    const voice = await getVoiceConfig(voiceId);
    if (voice) {
        voiceCache.set(voiceId, voice);
        await redis.setex(`voice:${voiceId}`, 3600, JSON.stringify(voice));
    }
    
    return voice;
}

// ============================================
// HTTP ENDPOINT - Test Voice Pipeline
// ============================================

/**
 * POST /voice/test
 * Test the full voice pipeline with text input (no STT)
 */
app.post('/voice/test', async (req, res) => {
    try {
        const { text, assistantId, languageCode = 'en-IN' } = req.body;
        
        if (!text || !assistantId) {
            return res.status(400).json({ error: 'text and assistantId required' });
        }
        
        const assistant = assistantCache.get(assistantId) || 
                          await loadAssistant(assistantId);
        
        if (!assistant) {
            return res.status(404).json({ error: 'Assistant not found' });
        }
        
        // Process through LLM
        const llmResult = await processMessage({
            message: text,
            assistantId,
            conversationHistory: [],
            channel: 'calls',
            customer: null,
            memory: null,
            userId: assistant.user_id
        });
        
        if (llmResult.error) {
            return res.status(500).json({ error: llmResult.error });
        }
        
        // Get TTS
        const voiceConfig = await getVoiceConfigCached(assistant.voice_id);
        
        const ttsResult = await synthesize({
            text: llmResult.response,
            provider: voiceConfig?.tts_provider || 'google',
            voiceId: voiceConfig?.provider_voice_id || voiceConfig?.elevenlabs_voice_id || 'Achernar',
            languageCode,
            languageVoiceCodes: voiceConfig?.language_voice_codes || {},
            voiceSettings: {
                modelId: voiceConfig?.provider_model
            }
        });
        
        res.json({
            input: text,
            response: llmResult.response,
            audio: ttsResult.success ? {
                content: ttsResult.audioContent,
                contentType: ttsResult.contentType,
                encoding: ttsResult.encoding
            } : null,
            ttsError: ttsResult.success ? null : ttsResult.error,
            usage: llmResult.usage
        });
        
    } catch (error) {
        console.error('[CALLBOT] Test error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

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
