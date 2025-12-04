// ============================================
// GOOGLE TTS SERVICE - Chirp 3 HD Voice Synthesis
// ============================================
const axios = require('axios');

const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
const GOOGLE_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

/**
 * Synthesize speech using Google Cloud TTS
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Voice name (e.g., "en-IN-Chirp3-HD-Achernar")
 * @param {string} languageCode - Language code (e.g., "en-IN", "hi-IN")
 * @returns {Promise<{audioContent: string, success: boolean, error?: string}>}
 */
async function synthesizeSpeech(text, voiceName, languageCode = 'en-IN') {
    if (!GOOGLE_TTS_API_KEY) {
        return { 
            success: false, 
            error: 'GOOGLE_TTS_API_KEY not configured' 
        };
    }

    try {
        const response = await axios.post(
            `${GOOGLE_TTS_ENDPOINT}?key=${GOOGLE_TTS_API_KEY}`,
            {
                input: { text },
                voice: {
                    languageCode: languageCode,
                    name: voiceName
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: 1.0,
                    pitch: 0,
                    volumeGainDb: 0
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return {
            success: true,
            audioContent: response.data.audioContent, // Base64 encoded MP3
            audioSize: response.data.audioContent?.length || 0
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error('[Google TTS Error]', errorMessage);
        return {
            success: false,
            error: errorMessage,
            status: error.response?.status
        };
    }
}

/**
 * List available voices from Google TTS
 * @param {string} languageCode - Optional filter by language
 * @returns {Promise<{voices: Array, success: boolean, error?: string}>}
 */
async function listVoices(languageCode = null) {
    if (!GOOGLE_TTS_API_KEY) {
        return { 
            success: false, 
            error: 'GOOGLE_TTS_API_KEY not configured' 
        };
    }

    try {
        let url = `https://texttospeech.googleapis.com/v1/voices?key=${GOOGLE_TTS_API_KEY}`;
        if (languageCode) {
            url += `&languageCode=${languageCode}`;
        }

        const response = await axios.get(url, { timeout: 15000 });
        
        return {
            success: true,
            voices: response.data.voices || [],
            count: response.data.voices?.length || 0
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error('[Google TTS List Error]', errorMessage);
        return {
            success: false,
            error: errorMessage,
            status: error.response?.status
        };
    }
}

/**
 * Test a specific Chirp 3 HD voice
 * @param {string} voiceName - The Google voice name (e.g., "Achernar")
 * @param {string} languageCode - Language code (e.g., "hi-IN")
 * @returns {Promise<object>}
 */
async function testChirp3Voice(voiceName, languageCode = 'hi-IN') {
    // Chirp 3 HD voice naming convention: {locale}-Chirp3-HD-{VoiceName}
    const fullVoiceName = `${languageCode}-Chirp3-HD-${voiceName}`;
    
    const testText = languageCode.startsWith('hi') 
        ? 'नमस्ते, मैं वॉइसरी हूं। मैं आपकी कैसे मदद कर सकता हूं?'
        : 'Hello, I am Voicory. How can I help you today?';

    console.log(`[Test] Testing voice: ${fullVoiceName}`);
    
    const result = await synthesizeSpeech(testText, fullVoiceName, languageCode);
    
    return {
        voiceName: fullVoiceName,
        languageCode,
        testText,
        ...result
    };
}

/**
 * Batch test multiple Chirp 3 HD voices
 * @param {Array<{name: string, locale: string}>} voices - Voices to test
 * @returns {Promise<Array>}
 */
async function batchTestVoices(voices) {
    const results = [];
    
    for (const voice of voices) {
        const result = await testChirp3Voice(voice.name, voice.locale);
        results.push({
            displayName: voice.displayName || voice.name,
            ...result
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
}

module.exports = {
    synthesizeSpeech,
    listVoices,
    testChirp3Voice,
    batchTestVoices,
    GOOGLE_TTS_API_KEY: !!GOOGLE_TTS_API_KEY // Boolean to check if configured
};
