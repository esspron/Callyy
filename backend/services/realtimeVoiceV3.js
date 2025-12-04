// ============================================
// REALTIME VOICE SERVICE V3 - OpenAI Realtime STT
// ============================================
// UPGRADE: Uses OpenAI Realtime WebSocket for streaming STT
// - True streaming transcription (partial words as you speak)
// - Server-side VAD (no frontend silence detection needed)
// - Multilingual auto-detection
// - Lower latency than batch transcribe()
// ============================================

const { processMessage } = require('./assistantProcessor');
const { synthesizeWithVoiceId } = require('./tts');
const { getCachedAssistant } = require('./assistant');
const { RealtimeSTTSession, REALTIME_STT_CONFIG } = require('./realtimeSTT');

// ============================================
// CONFIGURATION
// ============================================

const REALTIME_CONFIG = {
    // Audio processing
    sampleRate: 24000, // Match OpenAI Realtime (24kHz)
    
    // TTS streaming - sentence-by-sentence
    ttsChunkSize: 100,
    
    // Interruption
    interruptOnSpeech: true,
    
    // LOW LATENCY SETTINGS
    maxConversationHistory: 6,  // Fewer messages = faster LLM
    forceModel: 'gpt-4o-mini',  // Force fast model for real-time (override assistant config)
    
    // Features
    enableMetrics: true,
    enableRecording: true,
    maxRecordingDuration: 30 * 60 * 1000, // 30 minutes
    
    // Streaming STT mode
    useStreamingSTT: true,
};

// ============================================
// LATENCY TRACKER CLASS
// ============================================

class LatencyTracker {
    constructor() {
        this.sttLatencies = [];
        this.llmLatencies = [];
        this.ttsLatencies = [];
        this.totalLatencies = [];
        this.turnCount = 0;
    }

    recordSTT(ms) { this.sttLatencies.push(ms); }
    recordLLM(ms) { this.llmLatencies.push(ms); }
    recordTTS(ms) { this.ttsLatencies.push(ms); }
    recordTotalTurn(ms) { this.totalLatencies.push(ms); this.turnCount++; }

    calculatePercentile(arr, percentile) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    getMetrics() {
        const calcStats = (arr) => ({
            avg: arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0,
            p50: this.calculatePercentile(arr, 50),
            p99: this.calculatePercentile(arr, 99),
        });
        return {
            turnCount: this.turnCount,
            stt: calcStats(this.sttLatencies),
            llm: calcStats(this.llmLatencies),
            tts: calcStats(this.ttsLatencies),
            total: calcStats(this.totalLatencies),
        };
    }
}

// ============================================
// CALL RECORDER CLASS
// ============================================

class CallRecorder {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.isRecording = false;
        this.userAudioChunks = [];
        this.assistantAudioChunks = [];
        this.transcript = [];
        this.startTime = null;
        this.endTime = null;
    }

    start() { this.isRecording = true; this.startTime = new Date(); }
    stop() { this.isRecording = false; this.endTime = new Date(); }

    addUserAudio(audioData) {
        if (!this.isRecording) return;
        this.userAudioChunks.push({ data: audioData, timestamp: Date.now() });
    }

    addAssistantAudio(audioData) {
        if (!this.isRecording) return;
        this.assistantAudioChunks.push({ data: audioData, timestamp: Date.now() });
    }

    addTranscript(role, text, timestamp = Date.now()) {
        this.transcript.push({ role, text, timestamp });
    }

    getRecordingSummary() {
        return {
            sessionId: this.sessionId,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime && this.startTime ? this.endTime - this.startTime : null,
            userAudioChunks: this.userAudioChunks.length,
            assistantAudioChunks: this.assistantAudioChunks.length,
            transcript: this.transcript,
        };
    }
}

// ============================================
// REALTIME VOICE SESSION V3 CLASS
// ============================================

class RealtimeVoiceSessionV3 {
    constructor(options) {
        const {
            sessionId,
            assistantId,
            assistantConfig,
            userId,
            onTranscript,
            onPartialTranscript,
            onResponse,
            onAudio,
            onStateChange,
            onMetrics,
            onError
        } = options;

        this.sessionId = sessionId || `vs3_${Date.now()}`;
        this.assistantId = assistantId;
        this.assistantConfig = assistantConfig;
        this.userId = userId;
        
        // Callbacks to client
        this.onTranscript = onTranscript || (() => {});
        this.onPartialTranscript = onPartialTranscript || (() => {});
        this.onResponse = onResponse || (() => {});
        this.onAudio = onAudio || (() => {});
        this.onStateChange = onStateChange || (() => {});
        this.onMetrics = onMetrics || (() => {});
        this.onError = onError || (() => {});

        // State
        this.state = 'idle';
        this.isEnded = false;
        this.isMuted = false;
        this.conversationHistory = [];
        
        // TTS control
        this.currentTTSAbort = null;
        this.ttsQueue = [];

        // Latency tracking
        this.latencyTracker = new LatencyTracker();
        this.turnStartTime = null;

        // Call recording
        this.recorder = new CallRecorder(this.sessionId);

        // Resolved config
        this.resolvedConfig = null;

        // ===== NEW: OpenAI Realtime STT Session =====
        this.sttSession = null;
        this.currentPartialTranscript = '';
    }

    // ============================================
    // SESSION LIFECYCLE
    // ============================================

    async start() {
        console.log(`[RealtimeVoiceV3] 🚀 Starting session ${this.sessionId}`);
        this.setState('processing');

        // Start recording
        if (REALTIME_CONFIG.enableRecording) {
            this.recorder.start();
        }

        try {
            await this.resolveConfig();

            // ===== NEW: Start OpenAI Realtime STT Session =====
            await this.startStreamingSTT();

            // Play first message
            if (this.resolvedConfig.firstMessage) {
                this.setState('speaking');
                
                this.conversationHistory.push({
                    role: 'assistant',
                    content: this.resolvedConfig.firstMessage
                });
                
                this.recorder.addTranscript('assistant', this.resolvedConfig.firstMessage);
                this.onResponse(this.resolvedConfig.firstMessage);
                await this.speakText(this.resolvedConfig.firstMessage);
            }

            this.setState('listening');
            this.sendMetricsUpdate();

        } catch (error) {
            console.error('[RealtimeVoiceV3] Start error:', error);
            this.onError(error);
        }
    }

    end() {
        console.log(`[RealtimeVoiceV3] 🛑 Ending session ${this.sessionId}`);
        this.isEnded = true;
        this.interrupt();
        
        // ===== NEW: Disconnect STT session =====
        if (this.sttSession) {
            this.sttSession.disconnect();
            this.sttSession = null;
        }

        // Stop recording
        if (REALTIME_CONFIG.enableRecording) {
            this.recorder.stop();
            const summary = this.recorder.getRecordingSummary();
            console.log('[RealtimeVoiceV3] Recording summary:', {
                duration: summary.duration,
                turns: summary.transcript.length,
            });
        }

        this.sendMetricsUpdate();
        this.setState('idle');
    }

    // ============================================
    // STREAMING STT SETUP (NEW)
    // ============================================

    async startStreamingSTT() {
        const language = this.resolvedConfig?.languageSettings?.default || null; // null = auto-detect
        
        console.log(`[RealtimeVoiceV3] 🎤 Starting OpenAI Realtime STT (language: ${language || 'auto'})`);

        this.sttSession = new RealtimeSTTSession({
            sessionId: `${this.sessionId}_stt`,
            language: language,
            prompt: this.resolvedConfig?.systemPrompt?.substring(0, 200) || '', // Context hint
            
            onPartialTranscript: (text) => {
                // Real-time partial transcript - show to user immediately
                this.currentPartialTranscript = text;
                this.onPartialTranscript(text);
            },
            
            onFinalTranscript: (text, itemId) => {
                // Final transcript for this utterance
                this.handleFinalTranscript(text);
            },
            
            onSpeechStart: () => {
                // User started speaking
                console.log('[RealtimeVoiceV3] 🎤 Speech detected');
                this.turnStartTime = Date.now();
                
                // If assistant is speaking, interrupt (barge-in)
                if (this.state === 'speaking') {
                    this.interrupt();
                }
            },
            
            onSpeechEnd: () => {
                // User stopped speaking (VAD detected silence)
                console.log('[RealtimeVoiceV3] 🎤 Speech ended');
            },
            
            onError: (error) => {
                console.error('[RealtimeVoiceV3] STT error:', error);
                this.onError(error);
            },
            
            onConnected: () => {
                console.log('[RealtimeVoiceV3] ✅ STT connected');
            },
            
            onDisconnected: () => {
                console.log('[RealtimeVoiceV3] STT disconnected');
                // Reconnect if session not ended
                if (!this.isEnded) {
                    this.startStreamingSTT();
                }
            },
        });

        await this.sttSession.connect();
    }

    // ============================================
    // AUDIO PROCESSING (STREAMING)
    // ============================================

    /**
     * Process incoming audio - forward to OpenAI Realtime STT
     * @param {Buffer} audioData - PCM16 audio buffer (24kHz mono)
     */
    async processAudio(audioData) {
        if (this.isEnded || this.isMuted) return;

        // Record user audio
        if (REALTIME_CONFIG.enableRecording) {
            this.recorder.addUserAudio(audioData);
        }

        // ===== NEW: Stream audio to OpenAI Realtime STT =====
        if (this.sttSession && this.sttSession.isReady()) {
            this.sttSession.sendAudio(audioData);
        }
    }

    /**
     * Handle speech_end signal from client (optional, VAD handles this)
     * Called when frontend detects silence or user stops recording
     */
    async onSpeechEnd() {
        if (this.isEnded) return;
        
        // With streaming STT, the server handles VAD
        // This is just a hint from the client
        if (this.sttSession && this.sttSession.isReady()) {
            this.sttSession.commitAudio();
        }
    }

    // ============================================
    // TRANSCRIPT HANDLING (NEW)
    // ============================================

    async handleFinalTranscript(text) {
        if (this.isEnded) return;
        if (!text || !text.trim()) {
            console.log('[RealtimeVoiceV3] Empty transcript, ignoring');
            return;
        }

        const userText = text.trim();
        const turnStart = this.turnStartTime || Date.now();
        
        // Calculate STT latency (from speech end to final transcript)
        const sttLatency = Date.now() - turnStart;
        this.latencyTracker.recordSTT(sttLatency);
        console.log(`[RealtimeVoiceV3] ⏱️ STT: ${sttLatency}ms`);

        console.log('[RealtimeVoiceV3] 📝 Final transcript:', userText);

        // Record and send transcript
        this.recorder.addTranscript('user', userText);
        this.onTranscript(userText, true);
        this.currentPartialTranscript = '';

        this.conversationHistory.push({
            role: 'user',
            content: userText
        });

        // Generate response
        await this.generateResponse(userText, turnStart);
    }

    // ============================================
    // CONFIGURATION
    // ============================================

    async resolveConfig() {
        let config = { ...this.assistantConfig };

        if (this.assistantId) {
            const assistant = await getCachedAssistant(this.assistantId);
            if (!assistant) {
                throw new Error('Assistant not found');
            }
            
            config = {
                name: assistant.name,
                systemPrompt: assistant.system_prompt,
                firstMessage: assistant.first_message,
                voiceId: assistant.voice_id,
                languageSettings: assistant.language_settings,
                styleSettings: assistant.style_settings,
                llmModel: assistant.llm_model,
                temperature: assistant.temperature,
                maxTokens: assistant.max_tokens,
                ragEnabled: assistant.rag_enabled,
                ragSimilarityThreshold: assistant.rag_similarity_threshold,
                ragMaxResults: assistant.rag_max_results,
                ragInstructions: assistant.rag_instructions,
                knowledgeBaseIds: assistant.knowledge_base_ids || [],
                ...this.assistantConfig
            };
        }

        this.resolvedConfig = config;
        console.log('[RealtimeVoiceV3] Config resolved:', {
            name: config.name,
            voiceId: config.voiceId,
            language: config.languageSettings?.default || 'auto',
        });
    }

    updateConfig(newConfig) {
        this.resolvedConfig = { ...this.resolvedConfig, ...newConfig };
    }

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    setState(newState) {
        if (this.state !== newState) {
            console.log(`[RealtimeVoiceV3] State: ${this.state} → ${newState}`);
            this.state = newState;
            this.onStateChange(newState);
        }
    }

    setMuted(muted) {
        this.isMuted = muted;
        console.log(`[RealtimeVoiceV3] Muted: ${muted}`);
        
        // Clear STT audio buffer when muting
        if (muted && this.sttSession) {
            this.sttSession.clearAudio();
        }
    }

    // ============================================
    // LLM RESPONSE GENERATION
    // ============================================

    async generateResponse(userMessage, turnStart) {
        if (this.isEnded) return;

        this.setState('processing');

        try {
            // LLM with latency tracking
            const llmStart = Date.now();
            const result = await processMessage({
                message: userMessage,
                assistantId: this.assistantId,
                assistantConfig: this.resolvedConfig,
                conversationHistory: this.conversationHistory.slice(-10),
                channel: 'calls',
                customer: null,
                memory: null,
                userId: this.userId
            });
            const llmLatency = Date.now() - llmStart;
            this.latencyTracker.recordLLM(llmLatency);
            console.log(`[RealtimeVoiceV3] ⏱️ LLM: ${llmLatency}ms`);

            if (result.error) {
                throw new Error(result.error);
            }

            const responseText = result.response;
            console.log('[RealtimeVoiceV3] 🤖 Response:', responseText.substring(0, 80) + '...');

            // Record transcript
            this.recorder.addTranscript('assistant', responseText);

            this.conversationHistory.push({
                role: 'assistant',
                content: responseText
            });

            this.onResponse(responseText);

            // TTS with latency tracking
            this.setState('speaking');
            const ttsStart = Date.now();
            await this.speakText(responseText);
            const ttsLatency = Date.now() - ttsStart;
            this.latencyTracker.recordTTS(ttsLatency);
            console.log(`[RealtimeVoiceV3] ⏱️ TTS: ${ttsLatency}ms`);

            // Record total turn latency
            const totalLatency = Date.now() - turnStart;
            this.latencyTracker.recordTotalTurn(totalLatency);
            console.log(`[RealtimeVoiceV3] ⏱️ Total turn: ${totalLatency}ms`);

            // Send metrics update
            this.sendMetricsUpdate();

            if (!this.isEnded) {
                this.setState('listening');
            }

        } catch (error) {
            console.error('[RealtimeVoiceV3] Response error:', error);
            this.onError(error);
            this.setState('listening');
        }
    }

    // ============================================
    // TEXT-TO-SPEECH
    // ============================================

    async speakText(text) {
        if (this.isEnded || !text) return;

        const abortController = { aborted: false };
        this.currentTTSAbort = abortController;

        try {
            const voiceId = this.resolvedConfig?.voiceId;
            if (!voiceId) {
                console.warn('[RealtimeVoiceV3] No voice configured');
                return;
            }

            const languageCode = this.getLanguageCode();
            console.log(`[RealtimeVoiceV3] 🔊 TTS: voiceId=${voiceId}`);

            await this.streamTTS(text, voiceId, languageCode, abortController);

        } catch (error) {
            if (!abortController.aborted) {
                console.error('[RealtimeVoiceV3] TTS error:', error);
                this.onError(error);
            }
        } finally {
            this.currentTTSAbort = null;
        }
    }

    async streamTTS(text, voiceId, languageCode, abortController) {
        const sentences = this.splitIntoSentences(text);
        
        for (const sentence of sentences) {
            if (abortController.aborted) break;
            if (!sentence.trim()) continue;

            const result = await synthesizeWithVoiceId(sentence, voiceId, languageCode);

            if (abortController.aborted) break;

            if (result.success) {
                const audioBuffer = Buffer.from(result.audioContent, 'base64');
                
                // Record assistant audio
                if (REALTIME_CONFIG.enableRecording) {
                    this.recorder.addAssistantAudio(audioBuffer);
                }
                
                this.onAudio(audioBuffer);
            }
        }
    }

    splitIntoSentences(text) {
        return text
            .split(/(?<=[.!?।])\s+/)
            .filter(s => s.trim().length > 0);
    }

    // ============================================
    // INTERRUPTION
    // ============================================

    interrupt() {
        console.log('[RealtimeVoiceV3] ⚡ BARGE-IN');
        
        if (this.currentTTSAbort) {
            this.currentTTSAbort.aborted = true;
        }

        this.ttsQueue = [];

        // Clear STT buffer on interrupt
        if (this.sttSession) {
            this.sttSession.clearAudio();
        }

        if (this.state === 'speaking') {
            this.setState('listening');
        }
    }

    // ============================================
    // METRICS
    // ============================================

    sendMetricsUpdate() {
        if (!REALTIME_CONFIG.enableMetrics) return;
        this.onMetrics(this.latencyTracker.getMetrics());
    }

    getMetrics() {
        return this.latencyTracker.getMetrics();
    }

    getRecordingSummary() {
        return this.recorder.getRecordingSummary();
    }

    // ============================================
    // HELPERS
    // ============================================

    getLanguageCode() {
        const langMap = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'hi-Latn': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'mr': 'mr-IN',
            'bn': 'bn-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
        };
        const defaultLang = this.resolvedConfig?.languageSettings?.default || 'en';
        return langMap[defaultLang] || 'en-IN';
    }
}

module.exports = {
    RealtimeVoiceSessionV3,
    LatencyTracker,
    CallRecorder,
    REALTIME_CONFIG
};
