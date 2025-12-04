// ============================================
// STT ROUTES - Speech-to-Text API Endpoints
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifySupabaseAuth, optionalSupabaseAuth } = require('../lib/auth');
const { 
    transcribe, 
    transcribeUrl, 
    getProviderStatus,
    SUPPORTED_FORMATS 
} = require('../services/stt');

// Configure multer for audio uploads (25MB max - OpenAI limit)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB
    },
    fileFilter: (req, file, cb) => {
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (SUPPORTED_FORMATS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported format: ${ext}. Supported: ${SUPPORTED_FORMATS.join(', ')}`));
        }
    },
});

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/stt/health
 * Check STT service status
 */
router.get('/health', (req, res) => {
    const status = getProviderStatus();
    res.json({
        service: 'speech-to-text',
        ...status,
        timestamp: new Date().toISOString(),
    });
});

// ============================================
// TRANSCRIBE AUDIO FILE
// ============================================

/**
 * POST /api/stt/transcribe
 * Transcribe uploaded audio file
 * 
 * Body (multipart/form-data):
 * - file: Audio file (mp3, wav, m4a, etc.)
 * - language: Optional language hint (ISO 639-1: 'en', 'hi', etc.)
 * - prompt: Optional context prompt
 */
router.post('/transcribe', verifySupabaseAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No audio file provided' 
            });
        }

        const { language, prompt } = req.body;

        console.log(`[STT Route] Transcribing file: ${req.file.originalname} (${req.file.size} bytes)`);

        const result = await transcribe({
            audio: req.file.buffer,
            filename: req.file.originalname,
            language: language || null,
            prompt: prompt || null,
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('[STT Route] Transcription error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// TRANSCRIBE BASE64 AUDIO
// ============================================

/**
 * POST /api/stt/transcribe-base64
 * Transcribe base64-encoded audio
 * 
 * Body (JSON):
 * - audio: Base64 encoded audio (with or without data URL prefix)
 * - filename: Optional filename for format detection
 * - language: Optional language hint
 * - prompt: Optional context prompt
 */
router.post('/transcribe-base64', verifySupabaseAuth, async (req, res) => {
    try {
        const { audio, filename, language, prompt } = req.body;

        if (!audio) {
            return res.status(400).json({ 
                success: false, 
                error: 'No audio data provided' 
            });
        }

        console.log(`[STT Route] Transcribing base64 audio`);

        const result = await transcribe({
            audio,
            filename: filename || 'audio.mp3',
            language: language || null,
            prompt: prompt || null,
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('[STT Route] Base64 transcription error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// TRANSCRIBE FROM URL
// ============================================

/**
 * POST /api/stt/transcribe-url
 * Transcribe audio from a URL
 * 
 * Body (JSON):
 * - url: URL to audio file
 * - language: Optional language hint
 * - prompt: Optional context prompt
 */
router.post('/transcribe-url', verifySupabaseAuth, async (req, res) => {
    try {
        const { url, language, prompt } = req.body;

        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'No URL provided' 
            });
        }

        console.log(`[STT Route] Transcribing from URL: ${url}`);

        const result = await transcribeUrl(url, {
            language: language || null,
            prompt: prompt || null,
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('[STT Route] URL transcription error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// TEST ENDPOINT (No auth for quick testing)
// ============================================

/**
 * POST /api/stt/test
 * Quick test endpoint - transcribe a short audio
 * Rate limited, no auth required
 */
router.post('/test', async (req, res) => {
    try {
        const { audio, text } = req.body;

        // If text provided, just echo it (for testing without audio)
        if (text) {
            return res.json({
                success: true,
                text: text,
                message: 'Echo mode - no transcription performed',
            });
        }

        if (!audio) {
            return res.status(400).json({ 
                success: false, 
                error: 'No audio data provided. Send { audio: "base64..." } or { text: "test" }' 
            });
        }

        const result = await transcribe({
            audio,
            filename: 'test.mp3',
        });

        res.json(result);

    } catch (error) {
        console.error('[STT Route] Test error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
