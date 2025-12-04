import {
    Robot, X, Trash, Microphone, MicrophoneSlash, Phone, PhoneDisconnect,
    SpeakerHigh, SpeakerSlash, Warning, CircleNotch, Waveform, Stop,
    Play, Pause, SkipForward
} from '@phosphor-icons/react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { authFetch } from '../../lib/api';
import { Voice, LanguageSettings, StyleSettings } from '../../types';

interface AssistantFormData {
    name: string;
    systemPrompt: string;
    firstMessage: string;
    messagingSystemPrompt: string;
    messagingFirstMessage: string;
    voiceId: string | null;
    languageSettings: LanguageSettings;
    styleSettings: StyleSettings;
    llmModel: string;
    temperature: number;
    maxTokens: number;
    // RAG settings
    ragEnabled: boolean;
    ragSimilarityThreshold: number;
    ragMaxResults: number;
    ragInstructions: string;
    knowledgeBaseIds: string[];
}

interface VoiceMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    audioUrl?: string;
    isPlaying?: boolean;
}

interface VoiceChatSidebarProps {
    assistantId: string | null;
    formData: AssistantFormData;
    selectedVoice: Voice | null;
    onClose: () => void;
}

const VoiceChatSidebar: React.FC<VoiceChatSidebarProps> = ({
    assistantId,
    formData,
    selectedVoice,
    onClose
}) => {
    // State
    const [messages, setMessages] = useState<VoiceMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcription, setTranscription] = useState('');
    const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

    // Refs
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Get language code from settings
    const getLanguageCode = useCallback(() => {
        const langMap: Record<string, string> = {
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
        const defaultLang = formData.languageSettings?.default || 'en';
        return langMap[defaultLang] || 'en-IN';
    }, [formData.languageSettings]);

    // Play audio from base64
    const playAudio = useCallback(async (base64Audio: string, messageId: string) => {
        if (isMuted) return;

        try {
            // Stop current audio if playing
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            // Decode base64 and create blob
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);

            // Create and play audio
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            setCurrentPlayingId(messageId);
            setIsPlaying(true);

            audio.onended = () => {
                setIsPlaying(false);
                setCurrentPlayingId(null);
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = () => {
                console.error('Audio playback error');
                setIsPlaying(false);
                setCurrentPlayingId(null);
            };

            await audio.play();
        } catch (err) {
            console.error('Failed to play audio:', err);
            setIsPlaying(false);
            setCurrentPlayingId(null);
        }
    }, [isMuted]);

    // Stop audio playback
    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsPlaying(false);
        setCurrentPlayingId(null);
    }, []);

    // Connect and play first message
    const handleConnect = async () => {
        setIsConnected(true);
        setError(null);

        // Get and play first message with TTS
        if (formData.firstMessage) {
            setIsProcessing(true);
            try {
                const response = await authFetch('/api/voice-preview/first-message', {
                    method: 'POST',
                    body: JSON.stringify({
                        assistantId,
                        assistantConfig: assistantId ? undefined : {
                            name: formData.name,
                            firstMessage: formData.firstMessage,
                            voiceId: formData.voiceId,
                        },
                        languageCode: getLanguageCode()
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to get first message');
                }

                const firstMessage: VoiceMessage = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: data.message,
                    timestamp: new Date()
                };
                setMessages([firstMessage]);

                // Play audio if available
                if (data.audio?.content) {
                    await playAudio(data.audio.content, firstMessage.id);
                }
            } catch (err) {
                console.error('Failed to get first message:', err);
                setError(err instanceof Error ? err.message : 'Failed to start call');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    // Disconnect call
    const handleDisconnect = () => {
        stopAudio();
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        setIsConnected(false);
        setIsRecording(false);
        setTranscription('');
    };

    // Start recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                
                if (audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    await processVoiceInput(audioBlob);
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
            setTranscription('Listening...');
        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Microphone access denied. Please allow microphone access.');
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setTranscription('Processing...');
        }
    };

    // Process voice input (using text input for now - STT to be added)
    const processVoiceInput = async (audioBlob: Blob) => {
        // For now, we'll use a text input fallback
        // In production, you'd send this to STT service
        setTranscription('Voice processing coming soon. Please use text input for now.');
        setTimeout(() => setTranscription(''), 3000);
    };

    // Send text message with voice response
    const sendMessage = async (text: string) => {
        if (!text.trim() || isProcessing) return;

        setError(null);
        setIsProcessing(true);

        // Add user message
        const userMessage: VoiceMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            // Build conversation history
            const conversationHistory = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Call voice preview API
            const response = await authFetch('/api/voice-preview/speak', {
                method: 'POST',
                body: JSON.stringify({
                    message: text,
                    assistantId,
                    assistantConfig: assistantId ? undefined : {
                        name: formData.name,
                        systemPrompt: formData.systemPrompt,
                        firstMessage: formData.firstMessage,
                        voiceId: formData.voiceId,
                        languageSettings: formData.languageSettings,
                        styleSettings: formData.styleSettings,
                        llmModel: formData.llmModel,
                        temperature: formData.temperature,
                        maxTokens: formData.maxTokens,
                        ragEnabled: formData.ragEnabled,
                        ragSimilarityThreshold: formData.ragSimilarityThreshold,
                        ragMaxResults: formData.ragMaxResults,
                        ragInstructions: formData.ragInstructions,
                        knowledgeBaseIds: formData.knowledgeBaseIds,
                    },
                    voiceId: formData.voiceId,
                    languageCode: getLanguageCode(),
                    conversationHistory,
                    channel: 'calls'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            // Add assistant message
            const assistantMessage: VoiceMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Play audio response
            if (data.audio?.content) {
                await playAudio(data.audio.content, assistantMessage.id);
            } else if (data.ttsError) {
                console.warn('TTS error:', data.ttsError);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setError(err instanceof Error ? err.message : 'Failed to get response');
        } finally {
            setIsProcessing(false);
        }
    };

    // Clear conversation
    const handleClear = () => {
        stopAudio();
        setMessages([]);
        setError(null);
    };

    // Text input state
    const [textInput, setTextInput] = useState('');

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (textInput.trim()) {
            sendMessage(textInput);
            setTextInput('');
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-background border-l border-white/10 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between bg-surface/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isConnected 
                            ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/10' 
                            : 'bg-gradient-to-br from-primary/20 to-primary/10'
                    }`}>
                        <Phone size={20} weight="fill" className={isConnected ? 'text-emerald-400' : 'text-primary'} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-textMain">{formData.name || 'Assistant'}</h4>
                        <p className="text-xs text-textMuted">
                            {isConnected ? (
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    Voice Call Active
                                </span>
                            ) : (
                                selectedVoice?.name || 'Voice Preview'
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isConnected && (
                        <>
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className={`p-2 rounded-lg transition-colors ${
                                    isMuted ? 'bg-red-500/20 text-red-400' : 'text-textMuted hover:text-textMain hover:bg-surface'
                                }`}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
                            </button>
                            <button
                                onClick={handleClear}
                                className="p-2 text-textMuted hover:text-textMain hover:bg-surface rounded-lg transition-colors"
                                title="Clear chat"
                            >
                                <Trash size={16} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 text-textMuted hover:text-textMain hover:bg-surface rounded-lg transition-colors"
                    >
                        <X size={18} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Not Connected State */}
            {!isConnected ? (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center max-w-xs">
                        {/* Voice Visualization */}
                        <div className="relative w-32 h-32 mx-auto mb-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full animate-pulse" />
                            <div className="absolute inset-4 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Robot size={40} weight="duotone" className="text-primary" />
                            </div>
                        </div>

                        <h4 className="text-lg font-semibold text-textMain mb-2">
                            Talk to {formData.name || 'Assistant'}
                        </h4>
                        <p className="text-sm text-textMuted mb-6">
                            {selectedVoice ? (
                                <>Using <span className="text-primary font-medium">{selectedVoice.name}</span> voice</>
                            ) : (
                                'No voice selected'
                            )}
                        </p>

                        {!formData.voiceId && (
                            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                                ⚠️ Please select a voice first
                            </p>
                        )}

                        <button
                            onClick={handleConnect}
                            disabled={!formData.voiceId || isProcessing}
                            className="group flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <CircleNotch size={20} className="animate-spin" />
                            ) : (
                                <Phone size={20} weight="fill" className="group-hover:scale-110 transition-transform" />
                            )}
                            Start Call
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                    message.role === 'user' ? 'bg-blue-500/20' : 'bg-gradient-to-br from-primary/20 to-primary/10'
                                }`}>
                                    {message.role === 'user' ? (
                                        <Microphone size={16} className="text-blue-400" />
                                    ) : (
                                        <Robot size={16} className="text-primary" />
                                    )}
                                </div>
                                <div className={`flex flex-col max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-2.5 rounded-2xl ${
                                        message.role === 'user'
                                            ? 'bg-blue-500/20 text-textMain rounded-tr-md'
                                            : 'bg-surface border border-white/5 text-textMain rounded-tl-md'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        {/* Audio controls for assistant messages */}
                                        {message.role === 'assistant' && (
                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                                <button
                                                    onClick={() => {
                                                        if (currentPlayingId === message.id) {
                                                            stopAudio();
                                                        } else {
                                                            // Re-fetch audio if needed
                                                        }
                                                    }}
                                                    className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                                                >
                                                    {currentPlayingId === message.id ? (
                                                        <Pause size={14} className="text-primary" />
                                                    ) : (
                                                        <Play size={14} className="text-textMuted" />
                                                    )}
                                                </button>
                                                {currentPlayingId === message.id && (
                                                    <div className="flex items-center gap-0.5">
                                                        {[...Array(4)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="w-1 bg-primary rounded-full animate-pulse"
                                                                style={{
                                                                    height: `${8 + Math.random() * 8}px`,
                                                                    animationDelay: `${i * 100}ms`
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-textMuted mt-1 px-2">{formatTime(message.timestamp)}</span>
                                </div>
                            </div>
                        ))}

                        {/* Processing indicator */}
                        {isProcessing && (
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                    <Robot size={16} className="text-primary" />
                                </div>
                                <div className="px-4 py-3 bg-surface border border-white/5 rounded-2xl rounded-tl-md">
                                    <div className="flex items-center gap-2">
                                        <Waveform size={16} className="text-primary animate-pulse" />
                                        <span className="text-sm text-textMuted">Generating response...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex gap-3 items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    <Warning size={16} className="text-red-400" />
                                </div>
                                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl rounded-tl-md">
                                    <p className="text-sm text-red-400">{error}</p>
                                    <button onClick={() => setError(null)} className="text-xs text-red-400/70 hover:text-red-400 mt-1">
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-white/5 bg-surface/50">
                        {/* Transcription */}
                        {transcription && (
                            <div className="mb-3 px-3 py-2 bg-surface/50 border border-white/5 rounded-lg">
                                <p className="text-xs text-textMuted flex items-center gap-2">
                                    <Waveform size={14} className="animate-pulse" />
                                    {transcription}
                                </p>
                            </div>
                        )}

                        {/* Text Input (fallback) */}
                        <form onSubmit={handleTextSubmit} className="flex items-center gap-3 mb-3">
                            <input
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Type or speak..."
                                disabled={isProcessing}
                                className="flex-1 px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!textInput.trim() || isProcessing}
                                className="p-3 bg-primary text-black rounded-xl hover:bg-primaryHover transition-colors disabled:opacity-50"
                            >
                                <SkipForward size={18} weight="fill" />
                            </button>
                        </form>

                        {/* Voice Controls */}
                        <div className="flex items-center justify-center gap-4">
                            {/* Mic Button */}
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isProcessing}
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                                    isRecording
                                        ? 'bg-red-500 text-white animate-pulse'
                                        : 'bg-surface border border-white/10 text-textMain hover:border-primary/50'
                                }`}
                            >
                                {isRecording ? (
                                    <Stop size={24} weight="fill" />
                                ) : (
                                    <Microphone size={24} weight={isProcessing ? 'regular' : 'fill'} />
                                )}
                            </button>

                            {/* End Call Button */}
                            <button
                                onClick={handleDisconnect}
                                className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                            >
                                <PhoneDisconnect size={24} weight="fill" />
                            </button>
                        </div>

                        <p className="text-[10px] text-textMuted text-center mt-3">
                            🎤 Voice recording • Type for text input
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default VoiceChatSidebar;
