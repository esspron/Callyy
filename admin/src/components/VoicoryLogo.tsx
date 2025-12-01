import React from 'react';

interface VoicoryLogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const VoicoryLogo: React.FC<VoicoryLogoProps> = ({ 
    className = '', 
    size = 'md' 
}) => {
    const sizes = {
        sm: { fontSize: '1.25rem' },
        md: { fontSize: '1.75rem' },
        lg: { fontSize: '2.25rem' }
    };

    const { fontSize } = sizes[size];

    return (
        <span 
            className={className}
            style={{ 
                fontFamily: 'Ahsing, sans-serif',
                fontSize: fontSize,
                letterSpacing: '0.05em',
                background: 'linear-gradient(90deg, #2EC7B7 0%, #26AFA1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
            }}
        >
            VOICORY
        </span>
    );
};

export default VoicoryLogo;
