import React, { useEffect } from 'react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    glowColor?: 'primary' | 'emerald' | 'violet' | 'amber' | 'rose' | 'blue';
}

const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
};

const glowMap = {
    primary: 'bg-primary/10',
    emerald: 'bg-emerald-500/10',
    violet: 'bg-violet-500/10',
    amber: 'bg-amber-500/10',
    rose: 'bg-rose-500/10',
    blue: 'bg-blue-500/10',
};

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    children,
    footer,
    size = 'md',
    glowColor = 'primary',
}) => {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className={`relative bg-surface border border-white/10 rounded-2xl w-full ${sizeMap[size]} shadow-2xl overflow-hidden animate-modalIn`}>
                {/* Ambient glow */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 ${glowMap[glowColor]} blur-3xl`} />
                
                {/* Header */}
                <div className="relative p-6 border-b border-white/5">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div className={`w-10 h-10 rounded-xl ${glowMap[glowColor]} flex items-center justify-center`}>
                                    {icon}
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-semibold text-textMain">{title}</h2>
                                {subtitle && (
                                    <p className="text-textMuted text-sm mt-0.5">{subtitle}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="relative p-6 max-h-[60vh] overflow-y-auto">
                    {children}
                </div>
                
                {/* Footer */}
                {footer && (
                    <div className="relative p-6 border-t border-white/5 flex gap-3 justify-end">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
