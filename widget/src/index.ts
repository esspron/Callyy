/**
 * Voicory Widget SDK
 * Embeddable voice and chat widget for websites
 * 
 * @example
 * // Using the global API
 * window.Voicory.init({
 *   apiKey: 'your-public-api-key',
 *   assistantId: 'your-assistant-id',
 *   mode: 'both', // 'voice', 'chat', or 'both'
 *   theme: 'dark',
 * });
 * 
 * // Or using ES modules
 * import { VoicoryWidget } from '@voicory/widget';
 * 
 * const widget = new VoicoryWidget({
 *   apiKey: 'your-public-api-key',
 *   assistantId: 'your-assistant-id',
 * });
 * 
 * widget.on('message', (event) => {
 *   console.log('Message:', event.data);
 * });
 */

import { VoicoryWidget } from './widget';
import type {
  WidgetConfig,
  WidgetState,
  VoicoryWidgetInstance,
  WidgetEventType,
  WidgetEventCallback,
  WidgetEvent,
  ChatMessage,
  TranscriptEntry,
} from './types';

// Global widget instance
let globalInstance: VoicoryWidgetInstance | null = null;

/**
 * Initialize the Voicory widget
 * @param config Widget configuration
 * @returns Widget instance
 */
function init(config: WidgetConfig): VoicoryWidgetInstance {
  // Destroy existing instance if present
  if (globalInstance) {
    globalInstance.destroy();
  }
  
  // Create new instance
  globalInstance = new VoicoryWidget(config);
  return globalInstance;
}

/**
 * Get the current widget instance
 * @returns Widget instance or null
 */
function getInstance(): VoicoryWidgetInstance | null {
  return globalInstance;
}

/**
 * Destroy the current widget instance
 */
function destroy(): void {
  if (globalInstance) {
    globalInstance.destroy();
    globalInstance = null;
  }
}

// Export for ES modules
export { VoicoryWidget };
export { init, getInstance, destroy };
export type {
  WidgetConfig,
  WidgetState,
  VoicoryWidgetInstance,
  WidgetEventType,
  WidgetEventCallback,
  WidgetEvent,
  ChatMessage,
  TranscriptEntry,
};

// Global API for script tag usage
const VoicorySDK = {
  VoicoryWidget,
  init,
  getInstance,
  destroy,
};

// Expose to window for script tag usage
if (typeof window !== 'undefined') {
  (window as any).Voicory = VoicorySDK;
  (window as any).VoicoryWidget = VoicoryWidget;
  
  // Auto-init if config is present
  const autoConfig = (window as any).VoicoryConfig;
  if (autoConfig) {
    init(autoConfig);
  }
}

export default VoicorySDK;
