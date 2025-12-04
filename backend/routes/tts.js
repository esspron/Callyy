// ============================================
// TTS TEST ROUTES - Voice Library Testing
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const { 
    synthesizeSpeech, 
    listVoices, 
    testChirp3Voice, 
    batchTestVoices,
    GOOGLE_TTS_API_KEY 
} = require('../services/googleTTS');

/**
 * GET /api/tts/health
 * Check if TTS service is configured
 */
router.get('/health', (req, res) => {
    res.json({
        service: 'Google TTS',
        configured: GOOGLE_TTS_API_KEY,
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/tts/voices
 * List available Google TTS voices
 */
router.get('/voices', async (req, res) => {
    try {
        const { language } = req.query;
        const result = await listVoices(language);
        
        if (!result.success) {
            return res.status(400).json(result);
        }

        // Filter for Chirp3-HD voices if requested
        let voices = result.voices;
        if (req.query.chirp3Only === 'true') {
            voices = voices.filter(v => v.name?.includes('Chirp3-HD'));
        }

        res.json({
            success: true,
            count: voices.length,
            voices: voices.map(v => ({
                name: v.name,
                languageCodes: v.languageCodes,
                ssmlGender: v.ssmlGender,
                naturalSampleRateHertz: v.naturalSampleRateHertz
            }))
        });
    } catch (error) {
        console.error('[TTS Voices Error]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/tts/synthesize
 * Synthesize text to speech
 */
router.post('/synthesize', async (req, res) => {
    try {
        const { text, voiceName, languageCode = 'en-IN' } = req.body;

        if (!text) {
            return res.status(400).json({ success: false, error: 'Text is required' });
        }
        if (!voiceName) {
            return res.status(400).json({ success: false, error: 'Voice name is required' });
        }

        const result = await synthesizeSpeech(text, voiceName, languageCode);
        
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[TTS Synthesize Error]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/tts/test/:voiceName
 * Test a specific Chirp 3 HD voice
 */
router.get('/test/:voiceName', async (req, res) => {
    try {
        const { voiceName } = req.params;
        const { language = 'hi-IN' } = req.query;

        const result = await testChirp3Voice(voiceName, language);
        
        res.json(result);
    } catch (error) {
        console.error('[TTS Test Error]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/tts/test-boost-voices
 * Test all Boost tier (Chirp 3 HD) voices from database
 */
router.get('/test-boost-voices', async (req, res) => {
    try {
        // Get all Boost tier voices from database
        const { data: voices, error } = await supabase
            .from('voices')
            .select('name, provider_voice_id, primary_language, language_voice_codes')
            .eq('tts_provider', 'google')
            .eq('pricing_tier', 'boost')
            .eq('is_active', true)
            .limit(5); // Test first 5 voices

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        if (!voices || voices.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No Boost tier Google voices found in database' 
            });
        }

        // Test each voice
        const testResults = [];
        for (const voice of voices) {
            const voiceName = voice.provider_voice_id; // e.g., "Achernar"
            const languageCode = voice.primary_language === 'Hindi' ? 'hi-IN' : 'en-IN';
            
            console.log(`[Testing] ${voice.name} (${voiceName}) in ${languageCode}`);
            
            const result = await testChirp3Voice(voiceName, languageCode);
            testResults.push({
                displayName: voice.name,
                providerVoiceId: voiceName,
                languageCode,
                success: result.success,
                error: result.error,
                audioSize: result.audioSize || 0
            });

            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const successCount = testResults.filter(r => r.success).length;
        const failCount = testResults.filter(r => !r.success).length;

        res.json({
            success: failCount === 0,
            summary: {
                total: testResults.length,
                passed: successCount,
                failed: failCount
            },
            results: testResults
        });
    } catch (error) {
        console.error('[TTS Boost Test Error]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/tts/test-all-languages/:voiceName
 * Test a voice across all its supported languages
 */
router.get('/test-all-languages/:voiceName', async (req, res) => {
    try {
        const { voiceName } = req.params;

        // Get voice from database
        const { data: voice, error } = await supabase
            .from('voices')
            .select('name, provider_voice_id, language_voice_codes')
            .eq('provider_voice_id', voiceName)
            .eq('tts_provider', 'google')
            .single();

        if (error || !voice) {
            return res.status(404).json({ 
                success: false, 
                error: `Voice "${voiceName}" not found` 
            });
        }

        const languageCodes = voice.language_voice_codes 
            ? Object.keys(voice.language_voice_codes) 
            : ['hi-IN', 'en-IN'];

        // Test first 5 languages
        const testLanguages = languageCodes.slice(0, 5);
        const testResults = [];

        for (const langCode of testLanguages) {
            const result = await testChirp3Voice(voiceName, langCode);
            testResults.push({
                languageCode: langCode,
                success: result.success,
                error: result.error,
                audioSize: result.audioSize || 0
            });
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const successCount = testResults.filter(r => r.success).length;

        res.json({
            voiceName: voice.name,
            providerVoiceId: voiceName,
            totalLanguages: languageCodes.length,
            tested: testLanguages.length,
            passed: successCount,
            results: testResults
        });
    } catch (error) {
        console.error('[TTS Language Test Error]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
