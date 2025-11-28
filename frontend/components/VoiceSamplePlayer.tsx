import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, CaretDown, Globe } from '@phosphor-icons/react';
import { VoiceSample } from '../types';

interface VoiceSamplePlayerProps {
    samples?: VoiceSample[];
    previewUrl?: string; // Direct preview URL fallback
    defaultLanguage?: string;
    compact?: boolean;
}

const VoiceSamplePlayer: React.FC<VoiceSamplePlayerProps> = ({ 
    samples = [], 
    previewUrl,
    defaultLanguage,
    compact = false 
}) => {
    const [selectedLanguage, setSelectedLanguage] = useState<string>(
        defaultLanguage || samples[0]?.language || 'English'
    );
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get current sample based on selected language, or use previewUrl as fallback
    const currentSample = samples.find(s => s.language === selectedLanguage) || samples[0];
    const audioUrl = currentSample?.audioUrl || previewUrl;

    // Available languages from samples
    const availableLanguages = samples.map(s => s.language);
    const hasSamples = samples.length > 0;

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset player when sample changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            setProgress(0);
        }
    }, [audioUrl]);

    const togglePlay = () => {
        if (!audioUrl) return;

        if (!audioRef.current) {
            audioRef.current = new Audio(audioUrl);
            
            audioRef.current.addEventListener('loadedmetadata', () => {
                setDuration(audioRef.current?.duration || 0);
            });
            
            audioRef.current.addEventListener('timeupdate', () => {
                if (audioRef.current) {
                    const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                    setProgress(percent);
                }
            });
            
            audioRef.current.addEventListener('ended', () => {
                setIsPlaying(false);
                setProgress(0);
            });

            audioRef.current.addEventListener('error', () => {
                console.error('Error loading audio');
                setIsPlaying(false);
            });
        }

        // Update source if it changed
        if (audioRef.current.src !== audioUrl) {
            audioRef.current.src = audioUrl;
            audioRef.current.load();
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => {
                console.error('Error playing audio:', err);
            });
        }
        setIsPlaying(!isPlaying);
    };

    const selectLanguage = (language: string) => {
        // Stop current playback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setProgress(0);
        setSelectedLanguage(language);
        setShowDropdown(false);
        
        // Load new audio
        const newSample = samples.find(s => s.language === language);
        if (newSample?.audioUrl && audioRef.current) {
            audioRef.current.src = newSample.audioUrl;
            audioRef.current.load();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!audioUrl) {
        return (
            <div className="text-xs text-textMuted">No preview available</div>
        );
    }

    return (
        <div className={`${compact ? 'space-y-2' : 'space-y-3'}`}>
            {/* Language Selector - only show if we have multiple samples */}
            {hasSamples && <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-background/50 border border-border/50 rounded-lg text-sm text-textMain hover:border-primary/50 hover:bg-surfaceHover transition-all duration-200 w-full justify-between backdrop-blur-sm"
                >
                    <span className="flex items-center gap-2">
                        <Globe size={14} weight="duotone" className="text-primary" />
                        <span>{selectedLanguage}</span>
                    </span>
                    <CaretDown size={14} weight="bold" className={`text-textMuted transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-surface/95 border border-border/50 rounded-lg shadow-xl shadow-black/20 overflow-hidden backdrop-blur-xl">
                        {availableLanguages.map(lang => (
                            <button
                                key={lang}
                                onClick={() => selectLanguage(lang)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-surfaceHover transition-all duration-200 ${
                                    lang === selectedLanguage ? 'bg-primary/10 text-primary' : 'text-textMain'
                                }`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                )}
            </div>}

            {/* Player Controls */}
            <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    disabled={!audioUrl}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary hover:from-primary hover:to-primary/80 hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-primary/10 hover:shadow-primary/30 hover:scale-105 group"
                >
                    {isPlaying ? (
                        <Pause size={16} weight="fill" className="transition-transform group-hover:scale-110" />
                    ) : (
                        <Play size={16} weight="fill" className="ml-0.5 transition-transform group-hover:scale-110" />
                    )}
                </button>

                {/* Progress Bar */}
                <div className="flex-1">
                    <div className="h-1.5 bg-background/50 rounded-full overflow-hidden backdrop-blur-sm">
                        <div 
                            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-100 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    {!compact && duration > 0 && (
                        <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-textMuted">
                                {formatTime((progress / 100) * duration)}
                            </span>
                            <span className="text-[10px] text-textMuted">
                                {formatTime(duration)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceSamplePlayer;
