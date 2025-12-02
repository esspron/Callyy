/**
 * Widget Tab - Quick overview and link to full widget configuration
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Code,
  ArrowSquareOut,
  Copy,
  Check,
  ChatCircle,
  Phone,
  Globe,
  Palette,
  Lightning,
} from '@phosphor-icons/react';
import { supabase } from '../../services/supabase';
import { useClipboard } from '../../hooks';
import { Button, Card, Skeleton } from '../ui';

interface WidgetTabProps {
  assistantId?: string;
  assistantName?: string;
}

interface ApiKeyInfo {
  id: string;
  key: string;
  label: string;
}

export default function WidgetTab({ assistantId, assistantName }: WidgetTabProps) {
  const { copy, copied } = useClipboard();
  const [loading, setLoading] = useState(true);
  const [publicKey, setPublicKey] = useState<ApiKeyInfo | null>(null);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const { data } = await supabase
        .from('api_keys')
        .select('id, key, label')
        .eq('type', 'public')
        .limit(1)
        .single();
      
      setPublicKey(data as ApiKeyInfo | null);
    } catch {
      // No public key found
    } finally {
      setLoading(false);
    }
  };

  const quickEmbedCode = publicKey && assistantId
    ? `<script>
  window.VoicoryConfig = {
    apiKey: '${publicKey.key}',
    assistantId: '${assistantId}'${assistantName ? `,
    assistantName: '${assistantName}'` : ''}
  };
</script>
<script src="https://cdn.voicory.com/widget/v1/voicory-widget.iife.js" async></script>`
    : '';

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Show message if assistant not saved yet
  if (!assistantId) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
            <Lightning size={32} weight="fill" className="text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-textMain mb-2">Save Assistant First</h3>
          <p className="text-textMuted">
            Save your assistant to generate the widget embed code.
          </p>
        </Card>
      </div>
    );
  }

  // Show message if no API key
  if (!publicKey) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
            <Lightning size={32} weight="fill" className="text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-textMain mb-2">API Key Required</h3>
          <p className="text-textMuted mb-4">
            Create a public API key to use the widget embed feature.
          </p>
          <Link to="/api-keys">
            <Button>
              Go to API Keys
              <ArrowSquareOut size={16} />
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-textMain">Website Widget</h2>
          <p className="text-sm text-textMuted mt-1">
            Embed this AI assistant on your website with voice and chat capabilities
          </p>
        </div>
        <Link to={`/assistants/${assistantId}/widget`}>
          <Button>
            Full Configuration
            <ArrowSquareOut size={16} />
          </Button>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3">
            <ChatCircle size={20} weight="fill" className="text-primary" />
          </div>
          <h3 className="font-medium text-textMain">Chat Mode</h3>
          <p className="text-xs text-textMuted mt-1">
            Text-based conversations with your AI assistant
          </p>
        </Card>
        
        <Card className="p-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center mb-3">
            <Phone size={20} weight="fill" className="text-emerald-500" />
          </div>
          <h3 className="font-medium text-textMain">Voice Mode</h3>
          <p className="text-xs text-textMuted mt-1">
            Real-time voice calls directly in the browser
          </p>
        </Card>
        
        <Card className="p-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center mb-3">
            <Palette size={20} weight="fill" className="text-purple-500" />
          </div>
          <h3 className="font-medium text-textMain">Customizable</h3>
          <p className="text-xs text-textMuted mt-1">
            Match your brand with themes and colors
          </p>
        </Card>
      </div>

      {/* Quick Embed Code */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code size={20} weight="bold" className="text-primary" />
            <h3 className="font-semibold text-textMain">Quick Embed Code</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(quickEmbedCode)}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <pre className="p-4 bg-black/50 rounded-xl text-sm text-green-400 overflow-x-auto font-mono">
          <code>{quickEmbedCode}</code>
        </pre>
        <p className="text-xs text-textMuted mt-3">
          Add this code to your website before the closing <code className="px-1 py-0.5 bg-white/5 rounded">&lt;/body&gt;</code> tag
        </p>
      </Card>

      {/* Customize Banner */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Globe size={24} weight="fill" className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-textMain">Need more customization?</h3>
            <p className="text-sm text-textMuted">
              Configure themes, behavior, security settings, and more in the full widget configuration page.
            </p>
          </div>
          <Link to={`/assistants/${assistantId}/widget`}>
            <Button variant="outline">
              Open Full Settings
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
