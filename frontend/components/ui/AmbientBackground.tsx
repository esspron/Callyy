import React, { useMemo } from 'react';
import { useGPUCapabilities } from '../../utils/gpuDetection';

interface GradientConfig {
  color: string; // Tailwind color class like 'primary/5' or 'violet-500/5'
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  size?: 'sm' | 'md' | 'lg'; // sm: w-48, md: w-80, lg: w-96
}

interface AmbientBackgroundProps {
  gradients?: GradientConfig[];
  className?: string;
}

const positionStyles: Record<GradientConfig['position'], React.CSSProperties> = {
  'top-left': { top: '15%', left: '20%', transform: 'translate(-50%, -50%)' },
  'top-right': { top: '15%', right: '20%', transform: 'translate(50%, -50%)' },
  'bottom-left': { bottom: '15%', left: '20%', transform: 'translate(-50%, 50%)' },
  'bottom-right': { bottom: '15%', right: '20%', transform: 'translate(50%, 50%)' },
  'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
};

const sizeClasses: Record<NonNullable<GradientConfig['size']>, string> = {
  sm: 'w-48 h-48',
  md: 'w-80 h-80',
  lg: 'w-96 h-96',
};

/**
 * AmbientBackground - Renders decorative gradient blurs with GPU fallback
 * 
 * When GPU is available: Full blur effects with GPU acceleration
 * When GPU is limited: Simpler solid gradients without blur (lighter on CPU)
 */
export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  gradients = [
    { color: 'primary/5', position: 'top-left', size: 'lg' },
    { color: 'violet-500/5', position: 'bottom-right', size: 'md' },
  ],
  className = '',
}) => {
  const { shouldUseSimpleEffects, prefersReducedMotion } = useGPUCapabilities();

  // Memoize gradient elements to prevent re-renders
  const gradientElements = useMemo(() => {
    return gradients.map((gradient, index) => {
      const sizeClass = sizeClasses[gradient.size || 'lg'];
      const position = positionStyles[gradient.position];

      if (shouldUseSimpleEffects) {
        // Fallback: Simple radial gradient without blur (CPU-friendly)
        return (
          <div
            key={index}
            className={`absolute ${sizeClass} rounded-full pointer-events-none`}
            style={{
              ...position,
              background: `radial-gradient(circle, var(--color-${gradient.color.replace('/', '-').replace('-', '-')}) 0%, transparent 70%)`,
              opacity: 0.3,
            }}
          />
        );
      }

      // Full GPU-accelerated blur effect
      return (
        <div
          key={index}
          className={`absolute ${sizeClass} bg-${gradient.color} rounded-full blur-3xl pointer-events-none`}
          style={{
            ...position,
            transform: position.transform + ' translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            contain: 'strict',
          } as React.CSSProperties}
        />
      );
    });
  }, [gradients, shouldUseSimpleEffects]);

  // Skip rendering entirely if user prefers reduced motion
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {gradientElements}
    </div>
  );
};

/**
 * Preset configurations for common use cases
 */
export const AmbientPresets = {
  // Default teal + violet
  default: [
    { color: 'primary/5', position: 'top-left', size: 'lg' },
    { color: 'violet-500/5', position: 'bottom-right', size: 'md' },
  ] as GradientConfig[],
  
  // Purple theme
  purple: [
    { color: 'purple-500/5', position: 'top-right', size: 'lg' },
    { color: 'primary/5', position: 'bottom-left', size: 'md' },
  ] as GradientConfig[],
  
  // Green/success theme
  success: [
    { color: 'emerald-500/5', position: 'top-left', size: 'lg' },
    { color: 'primary/5', position: 'bottom-right', size: 'md' },
  ] as GradientConfig[],
  
  // Minimal - single gradient
  minimal: [
    { color: 'primary/3', position: 'center', size: 'lg' },
  ] as GradientConfig[],
};

export default AmbientBackground;
