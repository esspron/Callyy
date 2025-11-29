/**
 * CHATBOT SERVICE - WhatsApp & Web Chat Processing
 * 
 * Design Principles:
 * 1. Latency tolerant (500ms-2s OK for chat)
 * 2. Full AI processing with memory
 * 3. Background job processing
 * 4. Database writes allowed
 */

const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { Queue, Worker } = require('bullmq');

const app = express();
const port = process.env.PORT || 3003;

// Initialize connections
const redis = new Redis(process.env.REDIS_URL);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = process.env.OPENAI_API_KEY 
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://voicory.vercel.app',
        'https://voicory.com',
        /\.vercel\.app$/,
        /\.railway\.app$/
    ],
    credentials: true
}));
app.use(express.json());

// ============================================
// JOB QUEUES - Async Processing
// ============================================

const aiQueue = new Queue('ai-processing', { connection: redis });
const analyticsQueue = new Queue('analytics', { connection: redis });

// AI Processing Worker
const aiWorker = new Worker('ai-processing', async (job) => {
    const { configId, message, contact, messageId } = job.data;
    
    console.log(`[CHATBOT] Processing AI job for message: ${messageId}`);
    
    try {
        // Full AI processing with memory, RAG, etc.
        await processMessageWithAI(configId, message, contact, messageId);
    } catch (error) {
        console.error('[CHATBOT] AI processing error:', error);
        throw error; // Will retry
    }
}, { 
    connection: redis,
    concurrency: 10 // Process 10 messages in parallel
});

// ============================================
// WHATSAPP WEBHOOK - Fast Acknowledgment
// ============================================

app.get('/webhooks/whatsapp', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe') {
        const { data: config } = await supabase
            .from('whatsapp_configs')
            .select('id')
            .eq('webhook_verify_token', token)
            .single();

        if (config) {
            console.log('[CHATBOT] Webhook verified');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhooks/whatsapp', async (req, res) => {
    // CRITICAL: Respond immediately
    res.sendStatus(200);
    
    try {
        const body = req.body;
        
        if (body.object !== 'whatsapp_business_account') return;

        for (const entry of body.entry || []) {
            const wabaId = entry.id;
            
            // Get config from cache first
            let config = await getCachedConfig(wabaId);
            
            if (!config) {
                const { data } = await supabase
                    .from('whatsapp_configs')
                    .select('*')
                    .eq('waba_id', wabaId)
                    .single();
                
                if (data) {
                    config = data;
                    await cacheConfig(wabaId, config);
                }
            }

            if (!config) continue;

            for (const change of entry.changes || []) {
                if (change.field === 'messages') {
                    await handleIncomingMessages(config, change.value);
                }
            }
        }
    } catch (error) {
        console.error('[CHATBOT] Webhook error:', error);
    }
});

async function handleIncomingMessages(config, value) {
    const messages = value.messages || [];
    const contacts = value.contacts || [];

    for (const message of messages) {
        // Skip old messages
        const messageTimestamp = parseInt(message.timestamp) * 1000;
        if (messageTimestamp < Date.now() - 5 * 60 * 1000) continue;

        // Check duplicate in Redis (fast)
        const isDuplicate = await redis.get(`msg:${message.id}`);
        if (isDuplicate) continue;
        
        // Mark as seen for 1 hour
        await redis.setex(`msg:${message.id}`, 3600, '1');

        const contact = contacts.find(c => c.wa_id === message.from) || {};

        // Store message immediately (non-blocking)
        const messageId = await storeMessage(config, message, contact);

        // Queue for AI processing
        if (config.chatbot_enabled && config.assistant_id && message.type === 'text') {
            await aiQueue.add('process-message', {
                configId: config.id,
                message,
                contact,
                messageId
            }, {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 }
            });
        }
    }
}

async function storeMessage(config, message, contact) {
    const content = {};
    if (message.type === 'text') {
        content.body = message.text?.body;
    } else if (message.type === 'image') {
        content.mediaId = message.image?.id;
    }
    // ... handle other types

    const { data } = await supabase
        .from('whatsapp_messages')
        .insert({
            wa_message_id: message.id,
            config_id: config.id,
            from_number: '+' + message.from,
            to_number: config.display_phone_number,
            direction: 'inbound',
            message_type: message.type,
            content,
            status: 'received',
            message_timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
        })
        .select('id')
        .single();

    return data?.id;
}

async function processMessageWithAI(configId, message, contact, messageId) {
    // Get full config
    const { data: config } = await supabase
        .from('whatsapp_configs')
        .select('*')
        .eq('id', configId)
        .single();

    if (!config?.assistant_id) return;

    // Get assistant
    const { data: assistant } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', config.assistant_id)
        .single();

    if (!assistant || assistant.status !== 'active') return;

    // Get conversation history
    const { data: history } = await supabase
        .from('whatsapp_messages')
        .select('direction, content, message_type')
        .eq('config_id', configId)
        .or(`from_number.eq.+${message.from},to_number.eq.+${message.from}`)
        .order('message_timestamp', { ascending: false })
        .limit(10);

    // Build messages for OpenAI
    const messages = [
        { role: 'system', content: assistant.system_prompt || 'You are a helpful assistant.' }
    ];

    // Add history in chronological order
    for (const msg of (history || []).reverse()) {
        if (msg.message_type === 'text' && msg.content?.body) {
            messages.push({
                role: msg.direction === 'inbound' ? 'user' : 'assistant',
                content: msg.content.body
            });
        }
    }

    // Add current message
    messages.push({ role: 'user', content: message.text?.body });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
        model: assistant.llm_model || 'gpt-4o',
        messages,
        temperature: parseFloat(assistant.temperature) || 0.7,
        max_tokens: assistant.max_tokens || 1024
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) return;

    // Send WhatsApp response
    await sendWhatsAppMessage(config, message.from, response);

    // Log usage for billing
    await logUsage(config.user_id, assistant.id, completion.usage);
}

async function sendWhatsAppMessage(config, to, text) {
    const axios = require('axios');
    
    let accessToken = config.access_token?.trim();
    
    const response = await axios.post(
        `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
        {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text }
        },
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );

    // Store outgoing message
    await supabase.from('whatsapp_messages').insert({
        wa_message_id: response.data.messages?.[0]?.id,
        config_id: config.id,
        from_number: config.display_phone_number,
        to_number: '+' + to,
        direction: 'outbound',
        message_type: 'text',
        content: { body: text },
        status: 'sent',
        is_from_bot: true,
        assistant_id: config.assistant_id,
        message_timestamp: new Date().toISOString()
    });
}

async function logUsage(userId, assistantId, usage) {
    if (!usage) return;

    await supabase.rpc('log_llm_usage', {
        p_user_id: userId,
        p_assistant_id: assistantId,
        p_provider: 'openai',
        p_model: 'gpt-4o',
        p_input_tokens: usage.prompt_tokens || 0,
        p_output_tokens: usage.completion_tokens || 0,
        p_call_log_id: null,
        p_conversation_id: null
    });
}

// ============================================
// CACHE HELPERS
// ============================================

async function getCachedConfig(wabaId) {
    const cached = await redis.get(`waba:${wabaId}`);
    return cached ? JSON.parse(cached) : null;
}

async function cacheConfig(wabaId, config) {
    await redis.setex(`waba:${wabaId}`, 300, JSON.stringify(config));
}

// ============================================
// CACHE SYNC - Populate Redis for CallBot
// ============================================

async function syncCacheToRedis() {
    console.log('[CHATBOT] Syncing data to Redis cache...');
    
    // Sync all phone number configs
    const { data: phoneNumbers } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('is_active', true);
    
    for (const phone of phoneNumbers || []) {
        await redis.setex(
            `phone:${phone.number}`,
            3600,
            JSON.stringify(phone)
        );
    }
    console.log(`[CHATBOT] Cached ${phoneNumbers?.length || 0} phone configs`);
    
    // Sync all active assistants
    const { data: assistants } = await supabase
        .from('assistants')
        .select('*')
        .eq('status', 'active');
    
    for (const assistant of assistants || []) {
        await redis.setex(
            `assistant:${assistant.id}`,
            3600,
            JSON.stringify(assistant)
        );
    }
    console.log(`[CHATBOT] Cached ${assistants?.length || 0} assistants`);
    
    // Sync WhatsApp configs
    const { data: waConfigs } = await supabase
        .from('whatsapp_configs')
        .select('*')
        .eq('status', 'connected');
    
    for (const config of waConfigs || []) {
        await redis.setex(
            `waba:${config.waba_id}`,
            3600,
            JSON.stringify(config)
        );
    }
    console.log(`[CHATBOT] Cached ${waConfigs?.length || 0} WhatsApp configs`);
}

// Sync cache every 5 minutes
setInterval(syncCacheToRedis, 5 * 60 * 1000);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'chatbot',
        queues: {
            ai: aiQueue.name,
            analytics: analyticsQueue.name
        }
    });
});

// Start server
app.listen(port, async () => {
    console.log(`[CHATBOT] Service running on port ${port}`);
    await syncCacheToRedis();
    console.log('[CHATBOT] Cache synced, ready for messages!');
});

module.exports = app;
