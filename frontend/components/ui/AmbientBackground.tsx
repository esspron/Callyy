import React, { useMemo } from 'react';

import { useGPUCapabilities } from '../../utils/gpuDetection';

interface GradientConfig {
  color: 'primary' | 'violet' | 'purple' | 'emerald' | 'cyan';
  opacity?: number; // 0-1, defaults to 0.05
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

const sizeStyles: Record<NonNullable<GradientConfig['size']>, { width: string; height: string }> = {
  sm: { width: '12rem', height: '12rem' },
  md: { width: '20rem', height: '20rem' },
  lg: { width: '24rem', height: '24rem' },
};

// Color values using OKLCH to match the design system
const colorValues: Record<GradientConfig['color'], string> = {
  primary: 'oklch(0.72 0.15 180)',
  violet: 'oklch(0.65 0.25 290)',
  purple: 'oklch(0.60 0.25 300)',
  emerald: 'oklch(0.70 0.17 160)',
  cyan: 'oklch(0.75 0.14 200)',
};

/**
 * AmbientBackground - Renders decorative gradient blurs with GPU fallback
 * 
 * When GPU is available: Full blur effects with GPU acceleration
 * When GPU is limited: Simpler solid gradients without blur (lighter on CPU)
 */
export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  gradients = [
    { color: 'primary', opacity: 0.05, position: 'top-left', size: 'lg' },
    { color: 'violet', opacity: 0.05, position: 'bottom-right', size: 'md' },
  ],
  className = '',
}) => {
  const { shouldUseSimpleEffects, prefersReducedMotion } = useGPUCapabilities();

  // Memoize gradient elements to prevent re-renders
  const gradientElements = useMemo(() => {
    return gradients.map((gradient, index) => {
      const size = sizeStyles[gradient.size || 'lg'];
      const position = positionStyles[gradient.position];
      const baseColor = colorValues[gradient.color];
      const opacity = gradient.opacity ?? 0.05;

      if (shouldUseSimpleEffects) {
        // Fallback: Simple radial gradient without blur (CPU-friendly)
        return (
          <div
            key={index}
            className="absolute rounded-full pointer-events-none"
            style={{
              ...position,
              ...size,
              background: `radial-gradient(circle, ${baseColor} 0%, transparent 70%)`,
              opacity: opacity * 6, // Boost opacity slightly for non-blur version
            }}
          />
        );
      }

      // Full GPU-accelerated blur effect
      return (
        <div
          key={index}
          className="absolute rounded-full pointer-events-none"
          style={{
            ...position,
            ...size,
            backgroundColor: baseColor,
            opacity,
            filter: 'blur(48px)',
            transform: position.transform + ' translateZ(0)',
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
    { color: 'primary', opacity: 0.05, position: 'top-left', size: 'lg' },
    { color: 'violet', opacity: 0.05, position: 'bottom-right', size: 'md' },
  ] as GradientConfig[],
  
  // Purple theme
  purple: [
    { color: 'purple', opacity: 0.05, position: 'top-right', size: 'lg' },
    { color: 'primary', opacity: 0.05, position: 'bottom-left', size: 'md' },
  ] as GradientConfig[],
  
  // Green/success theme
  success: [
    { color: 'emerald', opacity: 0.05, position: 'top-left', size: 'lg' },
    { color: 'primary', opacity: 0.05, position: 'bottom-right', size: 'md' },
  ] as GradientConfig[],
  
  // Minimal - single gradient
  minimal: [
    { color: 'primary', opacity: 0.03, position: 'center', size: 'lg' },
  ] as GradientConfig[],
};

export default AmbientBackground;
