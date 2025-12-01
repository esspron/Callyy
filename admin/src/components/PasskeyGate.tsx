import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, Warning, Eye, EyeSlash, Clock, LockKey } from '@phosphor-icons/react';

interface PasskeyGateProps {
    onAuthenticate: (passkey: string) => { success: boolean; error?: string };
    lockoutUntil?: number | null;
    attemptsRemaining?: number;
}

const PasskeyGate: React.FC<PasskeyGateProps> = ({ 
    onAuthenticate, 
    lockoutUntil, 
    attemptsRemaining = 5 
}) => {
    const [passkey, setPasskey] = useState('');
    const [error, setError] = useState('');
    const [showPasskey, setShowPasskey] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lockoutRemaining, setLockoutRemaining] = useState<string | null>(null);

    // Update lockout countdown timer
    useEffect(() => {
        if (!lockoutUntil || Date.now() >= lockoutUntil) {
            setLockoutRemaining(null);
            return;
        }

        const updateTimer = () => {
            const remaining = lockoutUntil - Date.now();
            if (remaining <= 0) {
                setLockoutRemaining(null);
                return;
            }
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            setLockoutRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [lockoutUntil]);

    const isLockedOut = lockoutUntil && Date.now() < lockoutUntil;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLockedOut) return;
        
        setIsSubmitting(true);
        setError('');

        // Small delay to prevent timing attacks
        setTimeout(() => {
            const result = onAuthenticate(passkey);
            if (!result.success) {
                setError(result.error || 'Invalid passkey. Access denied.');
                setPasskey('');
            }
            setIsSubmitting(false);
        }, 300 + Math.random() * 200); // Random delay to prevent timing analysis
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-error/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Security badge */}
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center">
                            <ShieldCheck size={40} weight="duotone" className="text-primary" />
                        </div>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-textMain mb-2">Admin Access</h1>
                        <p className="text-textMuted text-sm">
                            Enter the admin passkey to access the Voicory Admin Panel
                        </p>
                    </div>

                    {/* Lockout Warning */}
                    {isLockedOut && lockoutRemaining && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <LockKey size={20} weight="bold" className="text-red-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-red-400">Account Locked</p>
                                    <p className="text-sm text-red-400/70 flex items-center gap-1">
                                        <Clock size={14} /> Try again in {lockoutRemaining}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Passkey Input */}
                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-2">
                                Passkey
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    <Key size={18} weight="bold" className="text-textMuted" />
                                </div>
                                <input
                                    type={showPasskey ? 'text' : 'password'}
                                    value={passkey}
                                    onChange={(e) => setPasskey(e.target.value)}
                                    placeholder="Enter admin passkey"
                                    disabled={isLockedOut}
                                    className="w-full pl-11 pr-11 py-3 bg-background border border-white/10 rounded-xl text-textMain placeholder-textSubtle focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    autoComplete="off"
                                    autoFocus={!isLockedOut}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasskey(!showPasskey)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain transition-colors"
                                    disabled={isLockedOut}
                                >
                                    {showPasskey ? <EyeSlash size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {/* Attempts remaining indicator */}
                            {!isLockedOut && attemptsRemaining < 5 && (
                                <p className="mt-2 text-xs text-amber-400">
                                    ⚠️ {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                                </p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-error/10 border border-error/20 rounded-xl">
                                <Warning size={18} weight="bold" className="text-error flex-shrink-0" />
                                <span className="text-error text-sm">{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!passkey || isSubmitting || isLockedOut}
                            className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={20} weight="bold" />
                                    Access Admin Panel
                                </>
                            )}
                        </button>
                    </form>

                    {/* Security Notice */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <p className="text-xs text-textSubtle text-center">
                            🔒 This is a secure admin area. All access attempts are logged.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-textSubtle mt-6">
                    Voicory Admin Panel • Local Access Only
                </p>
            </div>
        </div>
    );
};

export default PasskeyGate;
