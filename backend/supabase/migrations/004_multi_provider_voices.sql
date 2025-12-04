-- ============================================
-- MULTI-PROVIDER VOICE LIBRARY MIGRATION
-- ============================================
-- Adds support for multiple TTS providers (Google, OpenAI, ElevenLabs)
-- with Spark/Boost/Fusion pricing tiers
-- ============================================

-- ============================================
-- ADD NEW COLUMNS TO VOICES TABLE
-- ============================================

-- Add TTS provider column
ALTER TABLE public.voices 
ADD COLUMN IF NOT EXISTS tts_provider TEXT NOT NULL DEFAULT 'elevenlabs'
    CHECK (tts_provider IN ('elevenlabs', 'google', 'openai', 'azure', 'deepgram'));

-- Add pricing tier column (Spark/Boost/Fusion)
ALTER TABLE public.voices 
ADD COLUMN IF NOT EXISTS pricing_tier TEXT NOT NULL DEFAULT 'boost'
    CHECK (pricing_tier IN ('spark', 'boost', 'fusion'));

-- Add provider-specific model identifier
ALTER TABLE public.voices 
ADD COLUMN IF NOT EXISTS provider_model TEXT;

-- Add latency indicator (for UI display)
ALTER TABLE public.voices 
ADD COLUMN IF NOT EXISTS latency_tier TEXT DEFAULT 'medium'
    CHECK (latency_tier IN ('ultra-low', 'low', 'medium', 'high'));

-- Add quality indicator (for UI display)
ALTER TABLE public.voices 
ADD COLUMN IF NOT EXISTS quality_tier TEXT DEFAULT 'good'
    CHECK (quality_tier IN ('basic', 'good', 'premium', 'ultra'));

-- Add streaming support flag
ALTER TABLE public.voices 
ADD COLUMN IF NOT EXISTS supports_streaming BOOLEAN DEFAULT false;

-- Add language-specific voice codes for Google TTS
ALTER TABLE public.voices 
ADD COLUMN IF NOT EXISTS language_voice_codes JSONB DEFAULT '{}';

-- Comment on new columns
COMMENT ON COLUMN public.voices.tts_provider IS 'TTS provider: elevenlabs, google, openai, azure, deepgram';
COMMENT ON COLUMN public.voices.pricing_tier IS 'Pricing tier: spark (budget), boost (balanced), fusion (premium)';
COMMENT ON COLUMN public.voices.provider_model IS 'Provider-specific model: e.g., chirp3-hd, tts-1, eleven_multilingual_v2';
COMMENT ON COLUMN public.voices.latency_tier IS 'Latency classification for real-time calls';
COMMENT ON COLUMN public.voices.quality_tier IS 'Audio quality classification';
COMMENT ON COLUMN public.voices.supports_streaming IS 'Whether the voice supports real-time streaming';
COMMENT ON COLUMN public.voices.language_voice_codes IS 'Language-specific voice IDs for multi-language providers (e.g., Google)';

-- ============================================
-- RENAME ELEVENLABS-SPECIFIC COLUMNS TO GENERIC
-- ============================================

-- Rename elevenlabs_voice_id to provider_voice_id (keep both for backward compatibility)
ALTER TABLE public.voices 
ADD COLUMN IF NOT EXISTS provider_voice_id TEXT;

-- Copy existing elevenlabs_voice_id to provider_voice_id
UPDATE public.voices 
SET provider_voice_id = elevenlabs_voice_id
WHERE provider_voice_id IS NULL AND elevenlabs_voice_id IS NOT NULL;

-- Set provider_model for existing ElevenLabs voices
UPDATE public.voices 
SET provider_model = elevenlabs_model_id
WHERE provider_model IS NULL AND elevenlabs_model_id IS NOT NULL;

-- ============================================
-- CREATE PRICING TIERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.pricing_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Pricing (INR per minute)
    base_price_per_min DECIMAL(10, 2) NOT NULL,
    
    -- Features
    max_languages INTEGER DEFAULT 1,
    supports_streaming BOOLEAN DEFAULT false,
    supports_voice_cloning BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    
    -- Display
    badge_color TEXT DEFAULT 'gray',
    icon_name TEXT,
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert pricing tiers
INSERT INTO public.pricing_tiers (id, name, display_name, description, base_price_per_min, max_languages, supports_streaming, badge_color, icon_name, display_order)
VALUES 
    ('spark', 'spark', 'Spark', 'Budget-friendly voices with good quality. Perfect for high-volume use cases.', 6.00, 2, false, 'amber', 'Lightning', 1),
    ('boost', 'boost', 'Boost', 'Balanced price and quality with streaming support. Great for most use cases.', 8.00, 5, true, 'cyan', 'Rocket', 2),
    ('fusion', 'fusion', 'Fusion', 'Premium voices with ultra-low latency and best quality. Ideal for customer-facing calls.', 12.00, 10, true, 'purple', 'Sparkle', 3)
ON CONFLICT (id) DO UPDATE SET
    base_price_per_min = EXCLUDED.base_price_per_min,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================
-- CREATE TTS PROVIDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.tts_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    
    -- API Configuration (stored encrypted in secrets, not here)
    api_endpoint TEXT,
    
    -- Capabilities
    supports_streaming BOOLEAN DEFAULT false,
    supports_ssml BOOLEAN DEFAULT false,
    max_characters_per_request INTEGER DEFAULT 5000,
    
    -- Supported models
    available_models TEXT[] DEFAULT '{}',
    
    -- India Language Support
    hindi_support BOOLEAN DEFAULT false,
    tamil_support BOOLEAN DEFAULT false,
    telugu_support BOOLEAN DEFAULT false,
    bengali_support BOOLEAN DEFAULT false,
    marathi_support BOOLEAN DEFAULT false,
    gujarati_support BOOLEAN DEFAULT false,
    kannada_support BOOLEAN DEFAULT false,
    malayalam_support BOOLEAN DEFAULT false,
    punjabi_support BOOLEAN DEFAULT false,
    urdu_support BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert TTS providers
INSERT INTO public.tts_providers (id, name, display_name, api_endpoint, supports_streaming, supports_ssml, available_models, hindi_support, tamil_support, telugu_support, bengali_support, marathi_support, gujarati_support, kannada_support, malayalam_support, punjabi_support, urdu_support)
VALUES 
    ('elevenlabs', 'elevenlabs', 'ElevenLabs', 'https://api.elevenlabs.io/v1', true, false, 
     ARRAY['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_flash_v2_5']::TEXT[],
     true, true, true, true, true, true, true, true, true, true),
    
    ('google', 'google', 'Google Cloud TTS', 'https://texttospeech.googleapis.com/v1', true, true,
     ARRAY['chirp3-hd', 'neural2', 'wavenet', 'standard']::TEXT[],
     true, true, true, true, true, true, true, true, true, true),
    
    ('openai', 'openai', 'OpenAI TTS', 'https://api.openai.com/v1/audio/speech', false, false,
     ARRAY['tts-1', 'tts-1-hd']::TEXT[],
     false, false, false, false, false, false, false, false, false, false)
ON CONFLICT (id) DO UPDATE SET
    supports_streaming = EXCLUDED.supports_streaming,
    available_models = EXCLUDED.available_models,
    updated_at = NOW();

-- ============================================
-- INSERT SAMPLE VOICES FOR EACH TIER
-- ============================================

-- SPARK TIER: Google WaveNet/Standard (Low Cost)
INSERT INTO public.voices (name, description, gender, elevenlabs_voice_id, provider_voice_id, tts_provider, provider_model, pricing_tier, accent, primary_language, supported_languages, tags, cost_per_min, is_featured, display_order, latency_tier, quality_tier, supports_streaming, language_voice_codes)
VALUES 
    -- Google Hindi WaveNet
    ('Priya (Spark)', 
     'Clear and professional Hindi voice. Great for IVR and automated systems.', 
     'Female',
     'hi-IN-Wavenet-A',
     'hi-IN-Wavenet-A',
     'google',
     'wavenet',
     'spark',
     'Indian',
     'Hindi',
     ARRAY['Hindi', 'English']::TEXT[],
     ARRAY['Clear', 'Professional', 'IVR']::TEXT[],
     5.00,
     true,
     1,
     'medium',
     'good',
     false,
     '{"hi-IN": "hi-IN-Wavenet-A", "en-IN": "en-IN-Wavenet-A"}'::JSONB),
    
    ('Rahul (Spark)', 
     'Friendly male Hindi voice. Perfect for customer notifications.', 
     'Male',
     'hi-IN-Wavenet-B',
     'hi-IN-Wavenet-B',
     'google',
     'wavenet',
     'spark',
     'Indian',
     'Hindi',
     ARRAY['Hindi', 'English']::TEXT[],
     ARRAY['Friendly', 'Clear', 'Notifications']::TEXT[],
     5.00,
     false,
     2,
     'medium',
     'good',
     false,
     '{"hi-IN": "hi-IN-Wavenet-B", "en-IN": "en-IN-Wavenet-B"}'::JSONB),

    -- Google English-India WaveNet
    ('Anita (Spark)', 
     'Natural Indian English voice. Ideal for business communications.', 
     'Female',
     'en-IN-Wavenet-A',
     'en-IN-Wavenet-A',
     'google',
     'wavenet',
     'spark',
     'Indian',
     'English',
     ARRAY['English', 'Hindi']::TEXT[],
     ARRAY['Natural', 'Business', 'Professional']::TEXT[],
     5.00,
     false,
     3,
     'medium',
     'good',
     false,
     '{"en-IN": "en-IN-Wavenet-A", "hi-IN": "hi-IN-Wavenet-A"}'::JSONB)

ON CONFLICT DO NOTHING;

-- BOOST TIER: Google Chirp3-HD + OpenAI tts-1 (Balanced)
INSERT INTO public.voices (name, description, gender, elevenlabs_voice_id, provider_voice_id, tts_provider, provider_model, pricing_tier, accent, primary_language, supported_languages, tags, cost_per_min, is_featured, display_order, latency_tier, quality_tier, supports_streaming, language_voice_codes)
VALUES 
    -- Google Chirp3-HD Hindi
    ('Kavya (Boost)', 
     'Ultra-natural Hindi voice with streaming support. Low latency for real-time calls.', 
     'Female',
     'hi-IN-Chirp3-HD-Achernar',
     'hi-IN-Chirp3-HD-Achernar',
     'google',
     'chirp3-hd',
     'boost',
     'Indian',
     'Hindi',
     ARRAY['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali']::TEXT[],
     ARRAY['Natural', 'Streaming', 'Real-time', 'Conversational']::TEXT[],
     7.00,
     true,
     10,
     'low',
     'premium',
     true,
     '{"hi-IN": "hi-IN-Chirp3-HD-Achernar", "en-IN": "en-IN-Chirp3-HD-Achernar", "ta-IN": "ta-IN-Chirp3-HD-Achernar", "te-IN": "te-IN-Chirp3-HD-Achernar", "bn-IN": "bn-IN-Chirp3-HD-Achernar"}'::JSONB),
    
    ('Arjun (Boost)', 
     'Professional male voice with excellent Hindi pronunciation. Ideal for customer support.', 
     'Male',
     'hi-IN-Chirp3-HD-Achird',
     'hi-IN-Chirp3-HD-Achird',
     'google',
     'chirp3-hd',
     'boost',
     'Indian',
     'Hindi',
     ARRAY['Hindi', 'English', 'Marathi', 'Gujarati']::TEXT[],
     ARRAY['Professional', 'Support', 'Clear', 'Authoritative']::TEXT[],
     7.00,
     true,
     11,
     'low',
     'premium',
     true,
     '{"hi-IN": "hi-IN-Chirp3-HD-Achird", "en-IN": "en-IN-Chirp3-HD-Achird", "mr-IN": "mr-IN-Chirp3-HD-Achird", "gu-IN": "gu-IN-Chirp3-HD-Achird"}'::JSONB),

    -- OpenAI TTS voices
    ('Nova (Boost)', 
     'OpenAI neural voice. Warm and expressive for engaging conversations.', 
     'Female',
     'nova',
     'nova',
     'openai',
     'tts-1',
     'boost',
     'American',
     'English',
     ARRAY['English']::TEXT[],
     ARRAY['Warm', 'Expressive', 'Engaging', 'Modern']::TEXT[],
     7.00,
     true,
     12,
     'ultra-low',
     'premium',
     false,
     '{}'::JSONB),
    
    ('Onyx (Boost)', 
     'Deep and authoritative OpenAI voice. Perfect for professional communications.', 
     'Male',
     'onyx',
     'onyx',
     'openai',
     'tts-1',
     'boost',
     'American',
     'English',
     ARRAY['English']::TEXT[],
     ARRAY['Deep', 'Authoritative', 'Professional', 'Confident']::TEXT[],
     7.00,
     false,
     13,
     'ultra-low',
     'premium',
     false,
     '{}'::JSONB),
    
    ('Alloy (Boost)', 
     'Balanced and versatile OpenAI voice. Works well for any use case.', 
     'Neutral',
     'alloy',
     'alloy',
     'openai',
     'tts-1',
     'boost',
     'American',
     'English',
     ARRAY['English']::TEXT[],
     ARRAY['Versatile', 'Balanced', 'Neutral', 'Clear']::TEXT[],
     7.00,
     false,
     14,
     'ultra-low',
     'premium',
     false,
     '{}'::JSONB)

ON CONFLICT DO NOTHING;

-- FUSION TIER: ElevenLabs Premium (Best Quality)
INSERT INTO public.voices (name, description, gender, elevenlabs_voice_id, provider_voice_id, tts_provider, provider_model, pricing_tier, accent, primary_language, supported_languages, tags, cost_per_min, is_featured, display_order, latency_tier, quality_tier, supports_streaming, language_voice_codes)
VALUES 
    ('Aditi (Fusion)', 
     'Premium ElevenLabs voice with exceptional Hindi and English quality. Best for high-value customer interactions.', 
     'Female',
     'EXAVITQu4vr4xnSDxMaL',
     'EXAVITQu4vr4xnSDxMaL',
     'elevenlabs',
     'eleven_multilingual_v2',
     'fusion',
     'Indian',
     'Hindi',
     ARRAY['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi']::TEXT[],
     ARRAY['Premium', 'Natural', 'Multilingual', 'Expressive', 'Human-like']::TEXT[],
     10.00,
     true,
     20,
     'low',
     'ultra',
     true,
     '{}'::JSONB),
    
    ('Raj (Fusion)', 
     'Ultra-realistic ElevenLabs male voice. Perfect for sales and VIP customer support.', 
     'Male',
     'ErXwobaYiN019PkySvjV',
     'ErXwobaYiN019PkySvjV',
     'elevenlabs',
     'eleven_multilingual_v2',
     'fusion',
     'Indian',
     'English',
     ARRAY['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi']::TEXT[],
     ARRAY['Premium', 'Professional', 'Clear', 'Confident', 'VIP']::TEXT[],
     10.00,
     true,
     21,
     'low',
     'ultra',
     true,
     '{}'::JSONB),
    
    ('Meera (Fusion)', 
     'Warm and empathetic ElevenLabs voice. Excellent for healthcare and sensitive communications.', 
     'Female',
     'MF3mGyEYCl7XYWbV9V6O',
     'MF3mGyEYCl7XYWbV9V6O',
     'elevenlabs',
     'eleven_multilingual_v2',
     'fusion',
     'South Indian',
     'Tamil',
     ARRAY['Tamil', 'English', 'Hindi', 'Telugu', 'Kannada', 'Malayalam']::TEXT[],
     ARRAY['Warm', 'Empathetic', 'Calm', 'Healthcare', 'Sensitive']::TEXT[],
     10.00,
     false,
     22,
     'low',
     'ultra',
     true,
     '{}'::JSONB)

ON CONFLICT DO NOTHING;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_voices_tts_provider ON public.voices(tts_provider);
CREATE INDEX IF NOT EXISTS idx_voices_pricing_tier ON public.voices(pricing_tier);
CREATE INDEX IF NOT EXISTS idx_voices_latency_tier ON public.voices(latency_tier);
CREATE INDEX IF NOT EXISTS idx_voices_quality_tier ON public.voices(quality_tier);
CREATE INDEX IF NOT EXISTS idx_voices_supports_streaming ON public.voices(supports_streaming);

-- ============================================
-- ADD TRIGGER FOR UPDATED_AT ON NEW TABLES
-- ============================================

CREATE TRIGGER update_pricing_tiers_updated_at 
    BEFORE UPDATE ON public.pricing_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tts_providers_updated_at 
    BEFORE UPDATE ON public.tts_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_providers ENABLE ROW LEVEL SECURITY;

-- Everyone can read pricing tiers and providers
CREATE POLICY "Anyone can view pricing tiers"
    ON public.pricing_tiers FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view tts providers"
    ON public.tts_providers FOR SELECT
    USING (is_active = true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:
--
-- SELECT name, tts_provider, pricing_tier, cost_per_min, latency_tier, quality_tier 
-- FROM public.voices 
-- ORDER BY pricing_tier, display_order;
--
-- SELECT * FROM public.pricing_tiers ORDER BY display_order;
-- SELECT * FROM public.tts_providers;
