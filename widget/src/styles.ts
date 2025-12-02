/**
 * Voicory Widget Styles
 * Generates and injects CSS for the widget
 */

import type { WidgetConfig, WidgetColors, WidgetPosition, WidgetSize, WidgetTheme } from './types';

// Default color palettes
const LIGHT_COLORS: Required<WidgetColors> = {
  primary: '#0ea5e9',
  primaryHover: '#0284c7',
  background: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  userBubble: '#0ea5e9',
  assistantBubble: '#f1f5f9',
};

const DARK_COLORS: Required<WidgetColors> = {
  primary: '#38bdf8',
  primaryHover: '#0ea5e9',
  background: '#0f172a',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.1)',
  userBubble: '#0ea5e9',
  assistantBubble: '#1e293b',
};

// Size configurations
const SIZE_CONFIG: Record<WidgetSize, { width: number; height: number; buttonSize: number }> = {
  small: { width: 320, height: 480, buttonSize: 52 },
  medium: { width: 380, height: 560, buttonSize: 60 },
  large: { width: 440, height: 640, buttonSize: 68 },
};

// Position configurations
const POSITION_CONFIG: Record<WidgetPosition, { bottom?: string; top?: string; left?: string; right?: string }> = {
  'bottom-right': { bottom: '20px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' },
  'top-right': { top: '20px', right: '20px' },
  'top-left': { top: '20px', left: '20px' },
};

export function getColors(theme: WidgetTheme, customColors?: WidgetColors): Required<WidgetColors> {
  const baseColors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  return { ...baseColors, ...customColors };
}

export function generateStyles(config: WidgetConfig): string {
  const theme = config.theme || 'dark';
  const colors = getColors(theme, config.colors);
  const size = SIZE_CONFIG[config.size || 'medium'];
  const position = POSITION_CONFIG[config.position || 'bottom-right'];
  const zIndex = config.zIndex || 999999;
  
  const positionStyles = Object.entries(position)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');
  const alignItems = position.right ? 'flex-end' : 'flex-start';

  return `
/* Voicory Widget Styles - Generated */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.voicory-widget-root {
  --vw-primary: ${colors.primary};
  --vw-primary-hover: ${colors.primaryHover};
  --vw-bg: ${colors.background};
  --vw-text: ${colors.text};
  --vw-text-muted: ${colors.textMuted};
  --vw-border: ${colors.border};
  --vw-user-bubble: ${colors.userBubble};
  --vw-assistant-bubble: ${colors.assistantBubble};
  --vw-width: ${size.width}px;
  --vw-height: ${size.height}px;
  --vw-button-size: ${size.buttonSize}px;
  --vw-radius: 16px;
  --vw-radius-sm: 12px;
  --vw-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --vw-shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --vw-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--vw-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Container */
.voicory-widget-container {
  position: fixed;
  ${positionStyles}
  z-index: ${zIndex};
  display: flex;
  flex-direction: column;
  align-items: ${alignItems};
  gap: 16px;
  pointer-events: none;
}

.voicory-widget-container * {
  box-sizing: border-box;
}

/* Launcher Button */
.voicory-launcher {
  width: var(--vw-button-size);
  height: var(--vw-button-size);
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vw-primary) 0%, var(--vw-primary-hover) 100%);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--vw-shadow), 0 0 0 0 rgba(14, 165, 233, 0.4);
  transition: var(--vw-transition);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
}

.voicory-launcher::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s;
}

.voicory-launcher:hover {
  transform: scale(1.08);
  box-shadow: var(--vw-shadow), 0 0 0 8px rgba(14, 165, 233, 0.15);
}

.voicory-launcher:hover::before {
  opacity: 1;
}

.voicory-launcher:active {
  transform: scale(0.95);
}

.voicory-launcher.is-open {
  transform: rotate(0deg);
}

.voicory-launcher svg {
  width: 28px;
  height: 28px;
  color: white;
  transition: var(--vw-transition);
}

.voicory-launcher.is-open svg.icon-open {
  display: none;
}

.voicory-launcher:not(.is-open) svg.icon-close {
  display: none;
}

/* Pulse animation for active call */
.voicory-launcher.is-active {
  animation: voicory-pulse 2s infinite;
}

@keyframes voicory-pulse {
  0%, 100% { box-shadow: var(--vw-shadow), 0 0 0 0 rgba(14, 165, 233, 0.4); }
  50% { box-shadow: var(--vw-shadow), 0 0 0 15px rgba(14, 165, 233, 0); }
}

/* Main Panel */
.voicory-panel {
  width: var(--vw-width);
  height: var(--vw-height);
  max-height: calc(100vh - 120px);
  background: var(--vw-bg);
  border-radius: var(--vw-radius);
  border: 1px solid var(--vw-border);
  box-shadow: var(--vw-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  transition: var(--vw-transition);
  visibility: hidden;
}

.voicory-panel.is-open {
  opacity: 1;
  transform: translateY(0) scale(1);
  visibility: visible;
}

.voicory-panel.is-minimized {
  height: 72px;
}

/* Header */
.voicory-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--vw-border);
  background: ${theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
}

.voicory-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vw-primary) 0%, var(--vw-primary-hover) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.voicory-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.voicory-avatar svg {
  width: 24px;
  height: 24px;
  color: white;
}

.voicory-header-info {
  flex: 1;
  min-width: 0;
}

.voicory-assistant-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--vw-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.voicory-status {
  font-size: 12px;
  color: var(--vw-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.voicory-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

.voicory-status-dot.is-connecting {
  background: #f59e0b;
  animation: voicory-blink 1s infinite;
}

.voicory-status-dot.is-error {
  background: #ef4444;
}

@keyframes voicory-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.voicory-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.voicory-header-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vw-text-muted);
  transition: var(--vw-transition);
}

.voicory-header-btn:hover {
  background: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
  color: var(--vw-text);
}

.voicory-header-btn svg {
  width: 18px;
  height: 18px;
}

/* Mode Tabs */
.voicory-tabs {
  display: flex;
  padding: 8px;
  gap: 4px;
  border-bottom: 1px solid var(--vw-border);
}

.voicory-tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  border-radius: var(--vw-radius-sm);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--vw-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: var(--vw-transition);
}

.voicory-tab:hover {
  background: ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
  color: var(--vw-text);
}

.voicory-tab.is-active {
  background: ${theme === 'dark' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.1)'};
  color: var(--vw-primary);
}

.voicory-tab svg {
  width: 18px;
  height: 18px;
}

/* Content Area */
.voicory-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Voice Mode */
.voicory-voice {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 24px;
}

.voicory-voice-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vw-primary) 0%, var(--vw-primary-hover) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.voicory-voice-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.voicory-voice-avatar svg {
  width: 48px;
  height: 48px;
  color: white;
}

/* Voice wave animation */
.voicory-voice-avatar.is-speaking::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 3px solid var(--vw-primary);
  animation: voicory-wave 1.5s infinite;
}

.voicory-voice-avatar.is-speaking::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid var(--vw-primary);
  opacity: 0.5;
  animation: voicory-wave 1.5s infinite 0.3s;
}

@keyframes voicory-wave {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

.voicory-voice-status {
  text-align: center;
}

.voicory-voice-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vw-text);
  margin: 0 0 4px;
}

.voicory-voice-subtitle {
  font-size: 14px;
  color: var(--vw-text-muted);
  margin: 0;
}

/* Transcript */
.voicory-transcript {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voicory-transcript-entry {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.voicory-transcript-entry.is-user {
  align-items: flex-end;
}

.voicory-transcript-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--vw-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.voicory-transcript-text {
  padding: 10px 14px;
  border-radius: var(--vw-radius-sm);
  max-width: 85%;
  font-size: 14px;
  line-height: 1.5;
}

.voicory-transcript-entry.is-user .voicory-transcript-text {
  background: var(--vw-user-bubble);
  color: white;
  border-bottom-right-radius: 4px;
}

.voicory-transcript-entry.is-assistant .voicory-transcript-text {
  background: var(--vw-assistant-bubble);
  color: var(--vw-text);
  border-bottom-left-radius: 4px;
}

.voicory-transcript-text.is-interim {
  opacity: 0.7;
  font-style: italic;
}

/* Voice Controls */
.voicory-voice-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
}

.voicory-call-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--vw-transition);
}

.voicory-call-btn.start {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.voicory-call-btn.start:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.5);
}

.voicory-call-btn.end {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.voicory-call-btn.end:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
}

.voicory-call-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.voicory-call-btn svg {
  width: 28px;
  height: 28px;
  color: white;
}

.voicory-control-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--vw-border);
  background: var(--vw-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vw-text);
  transition: var(--vw-transition);
}

.voicory-control-btn:hover {
  background: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
}

.voicory-control-btn.is-active {
  background: var(--vw-primary);
  border-color: var(--vw-primary);
  color: white;
}

.voicory-control-btn svg {
  width: 20px;
  height: 20px;
}

/* Chat Mode */
.voicory-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.voicory-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voicory-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 85%;
  animation: voicory-fade-in 0.3s ease-out;
}

@keyframes voicory-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.voicory-message.is-user {
  align-self: flex-end;
  align-items: flex-end;
}

.voicory-message.is-assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.voicory-message-bubble {
  padding: 12px 16px;
  border-radius: var(--vw-radius-sm);
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.voicory-message.is-user .voicory-message-bubble {
  background: var(--vw-user-bubble);
  color: white;
  border-bottom-right-radius: 4px;
}

.voicory-message.is-assistant .voicory-message-bubble {
  background: var(--vw-assistant-bubble);
  color: var(--vw-text);
  border-bottom-left-radius: 4px;
}

.voicory-message-time {
  font-size: 11px;
  color: var(--vw-text-muted);
}

/* Typing indicator */
.voicory-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: var(--vw-assistant-bubble);
  border-radius: var(--vw-radius-sm);
  border-bottom-left-radius: 4px;
  width: fit-content;
}

.voicory-typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vw-text-muted);
  animation: voicory-typing 1.4s infinite;
}

.voicory-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.voicory-typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes voicory-typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* Chat Input */
.voicory-input-area {
  padding: 12px 16px;
  border-top: 1px solid var(--vw-border);
  background: ${theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
}

.voicory-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
  border: 1px solid var(--vw-border);
  border-radius: var(--vw-radius-sm);
  padding: 8px 12px;
  transition: var(--vw-transition);
}

.voicory-input-wrapper:focus-within {
  border-color: var(--vw-primary);
  box-shadow: 0 0 0 3px ${theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.1)'};
}

.voicory-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--vw-text);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  min-height: 24px;
  max-height: 120px;
  outline: none;
  font-family: inherit;
}

.voicory-input::placeholder {
  color: var(--vw-text-muted);
}

.voicory-send-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--vw-primary);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  transition: var(--vw-transition);
}

.voicory-send-btn:hover {
  background: var(--vw-primary-hover);
  transform: scale(1.05);
}

.voicory-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.voicory-send-btn svg {
  width: 18px;
  height: 18px;
}

/* Footer / Branding */
.voicory-footer {
  padding: 8px 16px;
  text-align: center;
  border-top: 1px solid var(--vw-border);
}

.voicory-branding {
  font-size: 11px;
  color: var(--vw-text-muted);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: var(--vw-transition);
}

.voicory-branding:hover {
  color: var(--vw-primary);
}

.voicory-branding svg {
  width: 14px;
  height: 14px;
}

/* Empty State */
.voicory-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  color: var(--vw-text-muted);
}

.voicory-empty svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.voicory-empty p {
  margin: 0;
  font-size: 14px;
}

/* Error State */
.voicory-error {
  padding: 12px 16px;
  background: ${theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'};
  border-radius: var(--vw-radius-sm);
  margin: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  font-size: 13px;
}

.voicory-error svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Loading spinner */
.voicory-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--vw-border);
  border-top-color: var(--vw-primary);
  border-radius: 50%;
  animation: voicory-spin 0.8s linear infinite;
}

@keyframes voicory-spin {
  to { transform: rotate(360deg); }
}

/* Mobile responsive */
@media (max-width: 480px) {
  .voicory-panel {
    width: calc(100vw - 32px);
    height: calc(100vh - 100px);
    max-height: none;
    border-radius: var(--vw-radius);
  }
  
  .voicory-widget-container {
    ${position.right ? 'right: 16px;' : 'left: 16px;'}
    ${position.bottom ? 'bottom: 16px;' : 'top: 16px;'}
  }
}

/* Accessibility */
.voicory-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus visible */
.voicory-widget-root *:focus-visible {
  outline: 2px solid var(--vw-primary);
  outline-offset: 2px;
}
`;
}

export function injectStyles(config: WidgetConfig): HTMLStyleElement {
  const styleId = 'voicory-widget-styles';
  
  // Remove existing styles if present
  const existing = document.getElementById(styleId);
  if (existing) {
    existing.remove();
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = generateStyles(config);
  document.head.appendChild(styleElement);
  
  return styleElement;
}

export function removeStyles(): void {
  const styleElement = document.getElementById('voicory-widget-styles');
  if (styleElement) {
    styleElement.remove();
  }
}
