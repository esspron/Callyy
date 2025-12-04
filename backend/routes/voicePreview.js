// ============================================
// VOICE PREVIEW ROUTES - Talk to Assistant Feature
// ============================================
// Full voice pipeline: STT → LLM → TTS
// Used for: Dashboard "Talk to Assistant" preview
// ============================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const { processMessage } = require('../services/assistantProcessor');
const { synthesizeWithVoiceId, synthesize, getProviderStatus } = require('../services/tts');
const { getCachedAssistant } = require('../services/assistant');
const { verifySupabaseAuth } = require('../lib/auth');

// ============================================
// HEALTH CHECK - TTS Provider Status
// ============================================
router.get('/health', (req, res) => {
    const status = getProviderStatus();
    res.json({
        service: 'voice-preview',
        status: 'healthy',
        providers: status
    });
});

// ============================================
// VOICE PREVIEW - Single Message (Text Input)
// ============================================
/**
 * POST /api/voice-preview/speak
 * Generate LLM response + TTS audio for a text message
 * 
 * Body:
 * - message: User's text message
 * - assistantId: Assistant ID (optional if assistantConfig provided)
 * - assistantConfig: Live assistant config (optional)
 * - voiceId: Voice ID to use (overrides assistant's voice)
 * - languageCode: Language code (e.g., 'en-IN', 'hi-IN')
 * - conversationHistory: Previous messages
 */
router.post('/speak', verifySupabaseAuth, async (req, res) => {
    try {
        const {
            message,
            assistantId,
            assistantConfig,
            voiceId,
            languageCode = 'en-IN',
            conversationHistory = [],
            channel = 'calls'
        } = req.body;

        const billingUserId = req.userId;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!assistantId && !assistantConfig) {
            return res.status(400).json({ error: 'Either assistantId or assistantConfig is required' });
        }

        // SECURITY: Verify user owns the assistant
        if (assistantId) {
            const assistant = await getCachedAssistant(assistantId);
            if (!assistant) {
                return res.status(404).json({ error: 'Assistant not found' });
            }
            if (assistant.user_id !== billingUserId) {
                return res.status(403).json({ error: 'You do not have access to this assistant' });
            }
        }

        // ===== STEP 1: Generate LLM Response =====
        console.log('[Voice Preview] Processing message...');
        const llmResult = await processMessage({
            message,
            assistantId,
            assistantConfig,
            conversationHistory,
            channel,
            customer: null,
            memory: null,
            userId: billingUserId
        });

        if (llmResult.error) {
            return res.status(500).json({ error: llmResult.error });
        }

        // ===== STEP 2: Get Voice Configuration =====
        // Priority: voiceId from request > assistantConfig.voiceId > assistant.voice_id
        let resolvedVoiceId = voiceId;
        if (!resolvedVoiceId && assistantConfig?.voiceId) {
            resolvedVoiceId = assistantConfig.voiceId;
        }
        if (!resolvedVoiceId && assistantId) {
            const assistant = await getCachedAssistant(assistantId);
            resolvedVoiceId = assistant?.voice_id;
        }

        if (!resolvedVoiceId) {
            // Return response without audio if no voice configured
            return res.json({
                response: llmResult.response,
                audio: null,
                message: 'No voice configured for this assistant',
                usage: llmResult.usage
            });
        }

        // ===== STEP 3: Synthesize Speech =====
        console.log(`[Voice Preview] Synthesizing with voice: ${resolvedVoiceId}, language: ${languageCode}`);
        const ttsResult = await synthesizeWithVoiceId(
            llmResult.response,
            resolvedVoiceId,
            languageCode
        );

        if (!ttsResult.success) {
            // Return response with error but include text
            return res.json({
                response: llmResult.response,
                audio: null,
                ttsError: ttsResult.error,
                usage: llmResult.usage
            });
        }

        // ===== STEP 4: Return Response with Audio =====
        res.json({
            response: llmResult.response,
            audio: {
                content: ttsResult.audioContent,
                contentType: ttsResult.contentType,
                encoding: ttsResult.encoding
            },
            usage: llmResult.usage
        });

    } catch (error) {
        console.error('[Voice Preview] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TTS ONLY - Synthesize Text (No LLM)
// ============================================
/**
 * POST /api/voice-preview/tts
 * Generate TTS audio for any text (no LLM processing)
 * 
 * Body:
 * - text: Text to synthesize
 * - voiceId: Voice ID from database
 * - languageCode: Language code
 */
router.post('/tts', verifySupabaseAuth, async (req, res) => {
    try {
        const { text, voiceId, languageCode = 'en-IN' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        if (!voiceId) {
            return res.status(400).json({ error: 'Voice ID is required' });
        }

        const ttsResult = await synthesizeWithVoiceId(text, voiceId, languageCode);

        if (!ttsResult.success) {
            return res.status(500).json({ error: ttsResult.error });
        }

        res.json({
            audio: {
                content: ttsResult.audioContent,
                contentType: ttsResult.contentType,
                encoding: ttsResult.encoding
            }
        });

    } catch (error) {
        console.error('[Voice Preview TTS] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// VOICE SAMPLE - Test a Voice
// ============================================
/**
 * GET /api/voice-preview/sample/:voiceId
 * Generate a sample audio for a voice
 */
router.get('/sample/:voiceId', async (req, res) => {
    try {
        const { voiceId } = req.params;
        const languageCode = req.query.language || 'en-IN';
        
        // Get voice config to determine appropriate sample text
        const { data: voice } = await supabase
            .from('voices')
            .select('*')
            .eq('id', voiceId)
            .single();

        if (!voice) {
            return res.status(404).json({ error: 'Voice not found' });
        }

        // Generate sample text based on language
        const sampleTexts = {
            'hi-IN': `नमस्ते! मैं ${voice.name} हूं। मैं आपकी कैसे मदद कर सकती हूं?`,
            'en-IN': `Hello! I'm ${voice.name}. How can I help you today?`,
            'en-US': `Hello! I'm ${voice.name}. How can I help you today?`,
            'ta-IN': `வணக்கம்! நான் ${voice.name}. நான் உங்களுக்கு எப்படி உதவ முடியும்?`,
            'te-IN': `హలో! నేను ${voice.name}. నేను మీకు ఎలా సహాయం చేయగలను?`
        };

        const sampleText = sampleTexts[languageCode] || sampleTexts['en-IN'];

        const ttsResult = await synthesizeWithVoiceId(sampleText, voiceId, languageCode);

        if (!ttsResult.success) {
            return res.status(500).json({ error: ttsResult.error });
        }

        res.json({
            voiceName: voice.name,
            languageCode,
            sampleText,
            audio: {
                content: ttsResult.audioContent,
                contentType: ttsResult.contentType,
                encoding: ttsResult.encoding
            }
        });

    } catch (error) {
        console.error('[Voice Sample] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CONVERSATION - Multi-turn Voice Chat
// ============================================
/**
 * POST /api/voice-preview/conversation
 * Handle a conversation turn with full context
 */
router.post('/conversation', verifySupabaseAuth, async (req, res) => {
    try {
        const {
            sessionId,
            message,
            assistantId,
            assistantConfig,
            voiceId,
            languageCode = 'en-IN',
            conversationHistory = []
        } = req.body;

        const billingUserId = req.userId;

        // Generate unique session if not provided
        const resolvedSessionId = sessionId || `preview-${Date.now()}`;

        // Process like /speak but return session context
        const llmResult = await processMessage({
            message,
            assistantId,
            assistantConfig,
            conversationHistory,
            channel: 'calls',
            customer: null,
            memory: null,
            userId: billingUserId
        });

        if (llmResult.error) {
            return res.status(500).json({ error: llmResult.error });
        }

        // Get voice and synthesize
        let resolvedVoiceId = voiceId;
        if (!resolvedVoiceId && assistantConfig?.voiceId) {
            resolvedVoiceId = assistantConfig.voiceId;
        }
        if (!resolvedVoiceId && assistantId) {
            const assistant = await getCachedAssistant(assistantId);
            resolvedVoiceId = assistant?.voice_id;
        }

        let audio = null;
        if (resolvedVoiceId) {
            const ttsResult = await synthesizeWithVoiceId(
                llmResult.response,
                resolvedVoiceId,
                languageCode
            );
            if (ttsResult.success) {
                audio = {
                    content: ttsResult.audioContent,
                    contentType: ttsResult.contentType,
                    encoding: ttsResult.encoding
                };
            }
        }

        // Return response with updated conversation history
        res.json({
            sessionId: resolvedSessionId,
            response: llmResult.response,
            audio,
            conversationHistory: [
                ...conversationHistory,
                { role: 'user', content: message },
                { role: 'assistant', content: llmResult.response }
            ],
            usage: llmResult.usage
        });

    } catch (error) {
        console.error('[Voice Conversation] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET FIRST MESSAGE AUDIO
// ============================================
/**
 * POST /api/voice-preview/first-message
 * Get TTS audio for assistant's first message
 */
router.post('/first-message', verifySupabaseAuth, async (req, res) => {
    try {
        const { assistantId, assistantConfig, languageCode = 'en-IN' } = req.body;
        const billingUserId = req.userId;

        // Get first message
        let firstMessage = null;
        let voiceId = null;

        if (assistantConfig) {
            firstMessage = assistantConfig.firstMessage;
            voiceId = assistantConfig.voiceId;
        } else if (assistantId) {
            const assistant = await getCachedAssistant(assistantId);
            if (!assistant) {
                return res.status(404).json({ error: 'Assistant not found' });
            }
            if (assistant.user_id !== billingUserId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            firstMessage = assistant.first_message;
            voiceId = assistant.voice_id;
        }

        if (!firstMessage) {
            return res.status(400).json({ error: 'No first message configured' });
        }
        if (!voiceId) {
            return res.json({
                message: firstMessage,
                audio: null,
                error: 'No voice configured'
            });
        }

        const ttsResult = await synthesizeWithVoiceId(firstMessage, voiceId, languageCode);

        res.json({
            message: firstMessage,
            audio: ttsResult.success ? {
                content: ttsResult.audioContent,
                contentType: ttsResult.contentType,
                encoding: ttsResult.encoding
            } : null,
            ttsError: ttsResult.success ? null : ttsResult.error
        });

    } catch (error) {
        console.error('[First Message] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
