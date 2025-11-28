import { motion } from 'framer-motion';
import React from 'react';

interface FadeInProps {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}

export const FadeIn: React.FC<FadeInProps> = ({ children, delay = 0, className }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
                duration: 0.3,
                ease: "easeOut",
                delay: delay,
            }}
            className={className}
            style={{ willChange: 'opacity', pointerEvents: 'auto' }}
        >
            {children}
        </motion.div>
    );
};
