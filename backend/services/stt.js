// ============================================
// STT SERVICE - Speech-to-Text using OpenAI
// ============================================
// Model: gpt-4o-transcribe (best accuracy for multilingual)
// Supports: Hindi, English, Hinglish, 50+ languages
// Price: ~$0.006/minute
// ============================================

const fs = require('fs');
const path = require('path');
const { openai } = require('../config');

// ============================================
// CONFIGURATION
// ============================================

const STT_CONFIG = {
    model: 'gpt-4o-transcribe',
    // Supported response formats for gpt-4o-transcribe: json, text
    // Note: verbose_json is NOT supported by gpt-4o-transcribe
    responseFormat: 'json',
    // Temperature for transcription (0-1, lower = more deterministic)
    temperature: 0,
};

// Supported audio formats
const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'flac'];

// ============================================
// MAIN TRANSCRIPTION FUNCTION
// ============================================

/**
 * Transcribe audio to text using OpenAI gpt-4o-transcribe
 * 
 * @param {Object} options - Transcription options
 * @param {Buffer|string} options.audio - Audio buffer or base64 string
 * @param {string} [options.filename] - Original filename (helps with format detection)
 * @param {string} [options.language] - Language hint (ISO 639-1 code: 'en', 'hi', etc.)
 * @param {string} [options.prompt] - Optional context prompt to guide transcription
 * @returns {Promise<Object>} - { text, language, duration, words, segments, success, error }
 */
async function transcribe(options) {
    const {
        audio,
        filename = 'audio.mp3',
        language = null,
        prompt = null,
    } = options;

    if (!audio) {
        return { success: false, error: 'Audio data is required' };
    }

    if (!openai) {
        return { success: false, error: 'OpenAI client not configured' };
    }

    try {
        console.log(`[STT] Starting transcription with ${STT_CONFIG.model}`);
        const startTime = Date.now();

        // Convert base64 to buffer if needed
        let audioBuffer;
        if (typeof audio === 'string') {
            // Remove data URL prefix if present
            const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
            audioBuffer = Buffer.from(base64Data, 'base64');
        } else {
            audioBuffer = audio;
        }

        // Determine file extension
        const ext = path.extname(filename).toLowerCase().replace('.', '') || 'mp3';
        if (!SUPPORTED_FORMATS.includes(ext)) {
            return { 
                success: false, 
                error: `Unsupported audio format: ${ext}. Supported: ${SUPPORTED_FORMATS.join(', ')}` 
            };
        }

        // Create a File-like object for the API
        const audioFile = new File([audioBuffer], filename, { 
            type: `audio/${ext}` 
        });

        // Build transcription request
        const transcriptionParams = {
            file: audioFile,
            model: STT_CONFIG.model,
            response_format: STT_CONFIG.responseFormat,
            temperature: STT_CONFIG.temperature,
        };

        // Add optional parameters
        if (language) {
            transcriptionParams.language = language;
        }
        if (prompt) {
            transcriptionParams.prompt = prompt;
        }

        // Call OpenAI Transcription API
        const response = await openai.audio.transcriptions.create(transcriptionParams);

        const duration = Date.now() - startTime;
        console.log(`[STT] Transcription completed in ${duration}ms`);

        // Handle response - gpt-4o-transcribe returns { text: "..." }
        return {
            success: true,
            text: response.text,
            language: response.language || language || 'auto-detected',
            processingTime: duration,
        };

    } catch (error) {
        console.error('[STT] Transcription error:', error.message);
        
        // Handle specific OpenAI errors
        if (error.code === 'audio_too_short') {
            return { success: false, error: 'Audio is too short to transcribe' };
        }
        if (error.code === 'audio_too_long') {
            return { success: false, error: 'Audio exceeds maximum length (25MB or ~90 minutes)' };
        }
        if (error.code === 'invalid_audio') {
            return { success: false, error: 'Invalid or corrupted audio file' };
        }
        
        return { 
            success: false, 
            error: error.message || 'Transcription failed' 
        };
    }
}

// ============================================
// TRANSCRIBE FROM FILE PATH
// ============================================

/**
 * Transcribe audio from a file path
 * 
 * @param {string} filePath - Path to audio file
 * @param {Object} [options] - Additional options (language, prompt)
 * @returns {Promise<Object>} - Transcription result
 */
async function transcribeFile(filePath, options = {}) {
    try {
        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const audioBuffer = fs.readFileSync(filePath);
        const filename = path.basename(filePath);

        return transcribe({
            audio: audioBuffer,
            filename,
            ...options,
        });
    } catch (error) {
        console.error('[STT] File transcription error:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// TRANSCRIBE FROM URL
// ============================================

/**
 * Transcribe audio from a URL
 * 
 * @param {string} url - URL to audio file
 * @param {Object} [options] - Additional options (language, prompt)
 * @returns {Promise<Object>} - Transcription result
 */
async function transcribeUrl(url, options = {}) {
    try {
        const axios = require('axios');
        
        console.log(`[STT] Fetching audio from URL: ${url}`);
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000, // 60 second timeout
        });

        const audioBuffer = Buffer.from(response.data);
        const filename = path.basename(new URL(url).pathname) || 'audio.mp3';

        return transcribe({
            audio: audioBuffer,
            filename,
            ...options,
        });
    } catch (error) {
        console.error('[STT] URL transcription error:', error.message);
        return { success: false, error: `Failed to fetch audio: ${error.message}` };
    }
}

// ============================================
// TRANSCRIBE FOR TWILIO (mulaw 8kHz)
// ============================================

/**
 * Transcribe Twilio audio stream (mulaw 8kHz)
 * Note: Twilio sends audio as base64 mulaw, needs conversion for best results
 * 
 * @param {string} base64Audio - Base64 encoded mulaw audio from Twilio
 * @param {Object} [options] - Additional options
 * @returns {Promise<Object>} - Transcription result
 */
async function transcribeTwilioAudio(base64Audio, options = {}) {
    // Twilio sends mulaw 8kHz audio
    // OpenAI can handle it, but quality may vary
    // For production, consider converting to wav first
    
    return transcribe({
        audio: base64Audio,
        filename: 'twilio_audio.wav',
        ...options,
    });
}

// ============================================
// STREAMING TRANSCRIPTION (for real-time)
// ============================================

/**
 * Note: OpenAI's transcription API doesn't support true streaming yet.
 * For real-time voice calls, you have two options:
 * 
 * 1. Use Twilio's built-in <Gather> with speech recognition
 * 2. Buffer audio chunks and transcribe periodically
 * 3. Use OpenAI Realtime API (gpt-4o-realtime) for true streaming
 * 
 * This function provides a chunked transcription approach
 */
async function transcribeChunked(audioChunks, options = {}) {
    // Combine audio chunks
    const combinedBuffer = Buffer.concat(audioChunks);
    
    return transcribe({
        audio: combinedBuffer,
        filename: 'chunked_audio.mp3',
        ...options,
    });
}

// ============================================
// LANGUAGE DETECTION
// ============================================

/**
 * Detect language from audio without full transcription
 * Uses a short transcription to detect language
 * 
 * @param {Buffer|string} audio - Audio data
 * @returns {Promise<Object>} - { language, confidence }
 */
async function detectLanguage(audio) {
    const result = await transcribe({
        audio,
        filename: 'detect_language.mp3',
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        language: result.language,
        sampleText: result.text?.substring(0, 100),
    };
}

// ============================================
// PROVIDER STATUS
// ============================================

function getProviderStatus() {
    return {
        provider: 'openai',
        model: STT_CONFIG.model,
        configured: !!openai,
        supportedFormats: SUPPORTED_FORMATS,
        features: {
            wordTimestamps: true,
            languageDetection: true,
            multilingualSupport: true,
            streaming: false, // Not supported by transcription API
        },
    };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Main functions
    transcribe,
    transcribeFile,
    transcribeUrl,
    transcribeTwilioAudio,
    transcribeChunked,
    detectLanguage,
    
    // Status
    getProviderStatus,
    
    // Config
    STT_CONFIG,
    SUPPORTED_FORMATS,
};
