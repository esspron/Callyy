-- ============================================
-- COMPREHENSIVE VOICE LIBRARY DATA
-- Migration: 005_voice_library_data.sql
-- ============================================
-- Populates the voice library with white-labeled voices across
-- Spark (₹2-5/min), Boost (₹6-15/min), Fusion (₹16-25/min) tiers
-- ============================================

-- First, update pricing tiers with correct pricing
UPDATE public.pricing_tiers SET
    base_price_per_min = 4.00,
    description = 'Budget-friendly voices using Google Standard/WaveNet. Perfect for high-volume IVR and notifications.'
WHERE id = 'spark';

UPDATE public.pricing_tiers SET
    base_price_per_min = 10.00,
    description = 'Professional quality with low latency streaming. Great for customer support and sales calls.'
WHERE id = 'boost';

UPDATE public.pricing_tiers SET
    base_price_per_min = 20.00,
    description = 'Premium ultra-realistic voices with best quality. Ideal for VIP customers and high-value interactions.'
WHERE id = 'fusion';

-- Add Gemini as a TTS provider
INSERT INTO public.tts_providers (id, name, display_name, api_endpoint, supports_streaming, supports_ssml, available_models, hindi_support, tamil_support, telugu_support, bengali_support, marathi_support, gujarati_support, kannada_support, malayalam_support, punjabi_support, urdu_support)
VALUES 
    ('gemini', 'gemini', 'Google Gemini TTS', 'https://generativelanguage.googleapis.com/v1', true, false,
     ARRAY['gemini-2.5-flash-tts', 'gemini-2.5-pro-tts']::TEXT[],
     true, true, true, true, true, true, true, true, true, true)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    supports_streaming = EXCLUDED.supports_streaming,
    available_models = EXCLUDED.available_models,
    updated_at = NOW();

-- ============================================
-- CLEAR EXISTING SAMPLE VOICES (optional - comment out if you want to keep existing)
-- ============================================
-- DELETE FROM public.voices WHERE tts_provider IN ('google', 'openai', 'gemini');

-- ============================================
-- SPARK TIER VOICES (₹2-5/min) - Google Standard/WaveNet
-- Target margin: 70-80% (Cost ~₹0.25-1.00/min)
-- ============================================

INSERT INTO public.voices (
    name, description, gender, 
    elevenlabs_voice_id, provider_voice_id, 
    tts_provider, provider_model, pricing_tier,
    accent, primary_language, supported_languages, tags,
    cost_per_min, is_featured, display_order,
    latency_tier, quality_tier, supports_streaming,
    language_voice_codes, preview_url
) VALUES 

-- ===== HINDI - SPARK TIER =====
('Aanya', 
 'Clear and friendly Hindi voice. Perfect for IVR systems and automated notifications.',
 'Female',
 'hi-IN-Standard-A', 'hi-IN-Standard-A',
 'google', 'standard', 'spark',
 'Indian', 'Hindi', 
 ARRAY['Hindi']::TEXT[],
 ARRAY['Clear', 'IVR', 'Notifications', 'Budget']::TEXT[],
 3.00, true, 101,
 'medium', 'good', false,
 '{"hi-IN": "hi-IN-Standard-A"}'::JSONB,
 NULL),

('Arjun', 
 'Professional male Hindi voice. Ideal for business announcements.',
 'Male',
 'hi-IN-Standard-B', 'hi-IN-Standard-B',
 'google', 'standard', 'spark',
 'Indian', 'Hindi',
 ARRAY['Hindi']::TEXT[],
 ARRAY['Professional', 'Business', 'Announcements', 'Budget']::TEXT[],
 3.00, false, 102,
 'medium', 'good', false,
 '{"hi-IN": "hi-IN-Standard-B"}'::JSONB,
 NULL),

('Priya', 
 'Warm and natural Hindi WaveNet voice. Better quality for customer-facing calls.',
 'Female',
 'hi-IN-Wavenet-A', 'hi-IN-Wavenet-A',
 'google', 'wavenet', 'spark',
 'Indian', 'Hindi',
 ARRAY['Hindi', 'English']::TEXT[],
 ARRAY['Warm', 'Natural', 'Customer Service', 'WaveNet']::TEXT[],
 4.00, true, 103,
 'medium', 'good', false,
 '{"hi-IN": "hi-IN-Wavenet-A", "en-IN": "en-IN-Wavenet-A"}'::JSONB,
 NULL),

('Raj', 
 'Confident male Hindi WaveNet voice. Great for sales and marketing.',
 'Male',
 'hi-IN-Wavenet-B', 'hi-IN-Wavenet-B',
 'google', 'wavenet', 'spark',
 'Indian', 'Hindi',
 ARRAY['Hindi', 'English']::TEXT[],
 ARRAY['Confident', 'Sales', 'Marketing', 'WaveNet']::TEXT[],
 4.00, false, 104,
 'medium', 'good', false,
 '{"hi-IN": "hi-IN-Wavenet-B", "en-IN": "en-IN-Wavenet-B"}'::JSONB,
 NULL),

('Diya', 
 'Soft and gentle Hindi voice. Perfect for healthcare and wellness.',
 'Female',
 'hi-IN-Wavenet-D', 'hi-IN-Wavenet-D',
 'google', 'wavenet', 'spark',
 'Indian', 'Hindi',
 ARRAY['Hindi']::TEXT[],
 ARRAY['Soft', 'Gentle', 'Healthcare', 'Wellness']::TEXT[],
 4.00, false, 105,
 'medium', 'good', false,
 '{"hi-IN": "hi-IN-Wavenet-D"}'::JSONB,
 NULL),

-- ===== ENGLISH (INDIA) - SPARK TIER =====
('Maya', 
 'Professional Indian English voice. Clear pronunciation for business calls.',
 'Female',
 'en-IN-Standard-A', 'en-IN-Standard-A',
 'google', 'standard', 'spark',
 'Indian', 'English',
 ARRAY['English']::TEXT[],
 ARRAY['Professional', 'Clear', 'Business', 'Budget']::TEXT[],
 3.00, true, 106,
 'medium', 'good', false,
 '{"en-IN": "en-IN-Standard-A"}'::JSONB,
 NULL),

('Dev', 
 'Authoritative male Indian English voice. Great for corporate communications.',
 'Male',
 'en-IN-Standard-B', 'en-IN-Standard-B',
 'google', 'standard', 'spark',
 'Indian', 'English',
 ARRAY['English']::TEXT[],
 ARRAY['Authoritative', 'Corporate', 'Professional']::TEXT[],
 3.00, false, 107,
 'medium', 'good', false,
 '{"en-IN": "en-IN-Standard-B"}'::JSONB,
 NULL),

('Anita', 
 'Natural Indian English WaveNet voice. Warm and engaging.',
 'Female',
 'en-IN-Wavenet-A', 'en-IN-Wavenet-A',
 'google', 'wavenet', 'spark',
 'Indian', 'English',
 ARRAY['English', 'Hindi']::TEXT[],
 ARRAY['Natural', 'Warm', 'Engaging', 'WaveNet']::TEXT[],
 4.00, false, 108,
 'medium', 'good', false,
 '{"en-IN": "en-IN-Wavenet-A", "hi-IN": "hi-IN-Wavenet-A"}'::JSONB,
 NULL),

('Kiran', 
 'Versatile male Indian English WaveNet voice.',
 'Male',
 'en-IN-Wavenet-B', 'en-IN-Wavenet-B',
 'google', 'wavenet', 'spark',
 'Indian', 'English',
 ARRAY['English', 'Hindi']::TEXT[],
 ARRAY['Versatile', 'Clear', 'WaveNet']::TEXT[],
 4.00, false, 109,
 'medium', 'good', false,
 '{"en-IN": "en-IN-Wavenet-B", "hi-IN": "hi-IN-Wavenet-B"}'::JSONB,
 NULL),

-- ===== TAMIL - SPARK TIER =====
('Lakshmi', 
 'Professional Tamil voice. Perfect for South Indian customers.',
 'Female',
 'ta-IN-Standard-A', 'ta-IN-Standard-A',
 'google', 'standard', 'spark',
 'South Indian', 'Tamil',
 ARRAY['Tamil']::TEXT[],
 ARRAY['Professional', 'Tamil', 'South India']::TEXT[],
 3.00, true, 110,
 'medium', 'good', false,
 '{"ta-IN": "ta-IN-Standard-A"}'::JSONB,
 NULL),

('Senthil', 
 'Clear male Tamil voice for business communications.',
 'Male',
 'ta-IN-Standard-B', 'ta-IN-Standard-B',
 'google', 'standard', 'spark',
 'South Indian', 'Tamil',
 ARRAY['Tamil']::TEXT[],
 ARRAY['Clear', 'Business', 'Tamil']::TEXT[],
 3.00, false, 111,
 'medium', 'good', false,
 '{"ta-IN": "ta-IN-Standard-B"}'::JSONB,
 NULL),

-- ===== TELUGU - SPARK TIER =====
('Padma', 
 'Warm Telugu voice. Great for AP and Telangana customers.',
 'Female',
 'te-IN-Standard-A', 'te-IN-Standard-A',
 'google', 'standard', 'spark',
 'South Indian', 'Telugu',
 ARRAY['Telugu']::TEXT[],
 ARRAY['Warm', 'Telugu', 'Andhra', 'Telangana']::TEXT[],
 3.00, true, 112,
 'medium', 'good', false,
 '{"te-IN": "te-IN-Standard-A"}'::JSONB,
 NULL),

('Ravi', 
 'Professional male Telugu voice.',
 'Male',
 'te-IN-Standard-B', 'te-IN-Standard-B',
 'google', 'standard', 'spark',
 'South Indian', 'Telugu',
 ARRAY['Telugu']::TEXT[],
 ARRAY['Professional', 'Telugu', 'Business']::TEXT[],
 3.00, false, 113,
 'medium', 'good', false,
 '{"te-IN": "te-IN-Standard-B"}'::JSONB,
 NULL),

-- ===== BENGALI - SPARK TIER =====
('Swati', 
 'Friendly Bengali voice. Perfect for West Bengal and Northeast customers.',
 'Female',
 'bn-IN-Standard-A', 'bn-IN-Standard-A',
 'google', 'standard', 'spark',
 'Eastern Indian', 'Bengali',
 ARRAY['Bengali']::TEXT[],
 ARRAY['Friendly', 'Bengali', 'Northeast']::TEXT[],
 3.00, true, 114,
 'medium', 'good', false,
 '{"bn-IN": "bn-IN-Standard-A"}'::JSONB,
 NULL),

('Dipak', 
 'Clear male Bengali voice.',
 'Male',
 'bn-IN-Standard-B', 'bn-IN-Standard-B',
 'google', 'standard', 'spark',
 'Eastern Indian', 'Bengali',
 ARRAY['Bengali']::TEXT[],
 ARRAY['Clear', 'Bengali', 'Professional']::TEXT[],
 3.00, false, 115,
 'medium', 'good', false,
 '{"bn-IN": "bn-IN-Standard-B"}'::JSONB,
 NULL),

-- ===== GUJARATI - SPARK TIER =====
('Heena', 
 'Warm Gujarati voice. Great for Gujarat business customers.',
 'Female',
 'gu-IN-Standard-A', 'gu-IN-Standard-A',
 'google', 'standard', 'spark',
 'Western Indian', 'Gujarati',
 ARRAY['Gujarati']::TEXT[],
 ARRAY['Warm', 'Gujarati', 'Business']::TEXT[],
 3.00, true, 116,
 'medium', 'good', false,
 '{"gu-IN": "gu-IN-Standard-A"}'::JSONB,
 NULL),

('Nirav', 
 'Professional male Gujarati voice.',
 'Male',
 'gu-IN-Standard-B', 'gu-IN-Standard-B',
 'google', 'standard', 'spark',
 'Western Indian', 'Gujarati',
 ARRAY['Gujarati']::TEXT[],
 ARRAY['Professional', 'Gujarati', 'Clear']::TEXT[],
 3.00, false, 117,
 'medium', 'good', false,
 '{"gu-IN": "gu-IN-Standard-B"}'::JSONB,
 NULL),

-- ===== MARATHI - SPARK TIER =====
('Sneha', 
 'Pleasant Marathi voice. Perfect for Maharashtra customers.',
 'Female',
 'mr-IN-Standard-A', 'mr-IN-Standard-A',
 'google', 'standard', 'spark',
 'Western Indian', 'Marathi',
 ARRAY['Marathi']::TEXT[],
 ARRAY['Pleasant', 'Marathi', 'Maharashtra']::TEXT[],
 3.00, true, 118,
 'medium', 'good', false,
 '{"mr-IN": "mr-IN-Standard-A"}'::JSONB,
 NULL),

('Sagar', 
 'Clear male Marathi voice.',
 'Male',
 'mr-IN-Standard-B', 'mr-IN-Standard-B',
 'google', 'standard', 'spark',
 'Western Indian', 'Marathi',
 ARRAY['Marathi']::TEXT[],
 ARRAY['Clear', 'Marathi', 'Professional']::TEXT[],
 3.00, false, 119,
 'medium', 'good', false,
 '{"mr-IN": "mr-IN-Standard-B"}'::JSONB,
 NULL),

-- ===== KANNADA - SPARK TIER =====
('Kavitha', 
 'Professional Kannada voice. Great for Karnataka customers.',
 'Female',
 'kn-IN-Standard-A', 'kn-IN-Standard-A',
 'google', 'standard', 'spark',
 'South Indian', 'Kannada',
 ARRAY['Kannada']::TEXT[],
 ARRAY['Professional', 'Kannada', 'Karnataka']::TEXT[],
 3.00, true, 120,
 'medium', 'good', false,
 '{"kn-IN": "kn-IN-Standard-A"}'::JSONB,
 NULL),

('Arun', 
 'Clear male Kannada voice.',
 'Male',
 'kn-IN-Standard-B', 'kn-IN-Standard-B',
 'google', 'standard', 'spark',
 'South Indian', 'Kannada',
 ARRAY['Kannada']::TEXT[],
 ARRAY['Clear', 'Kannada', 'Business']::TEXT[],
 3.00, false, 121,
 'medium', 'good', false,
 '{"kn-IN": "kn-IN-Standard-B"}'::JSONB,
 NULL),

-- ===== MALAYALAM - SPARK TIER =====
('Reshma', 
 'Warm Malayalam voice. Perfect for Kerala customers.',
 'Female',
 'ml-IN-Standard-A', 'ml-IN-Standard-A',
 'google', 'standard', 'spark',
 'South Indian', 'Malayalam',
 ARRAY['Malayalam']::TEXT[],
 ARRAY['Warm', 'Malayalam', 'Kerala']::TEXT[],
 3.00, true, 122,
 'medium', 'good', false,
 '{"ml-IN": "ml-IN-Standard-A"}'::JSONB,
 NULL),

('Vishnu', 
 'Professional male Malayalam voice.',
 'Male',
 'ml-IN-Standard-B', 'ml-IN-Standard-B',
 'google', 'standard', 'spark',
 'South Indian', 'Malayalam',
 ARRAY['Malayalam']::TEXT[],
 ARRAY['Professional', 'Malayalam', 'Clear']::TEXT[],
 3.00, false, 123,
 'medium', 'good', false,
 '{"ml-IN": "ml-IN-Standard-B"}'::JSONB,
 NULL)

ON CONFLICT (elevenlabs_voice_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cost_per_min = EXCLUDED.cost_per_min,
    provider_model = EXCLUDED.provider_model,
    pricing_tier = EXCLUDED.pricing_tier,
    updated_at = NOW();

-- ============================================
-- BOOST TIER VOICES (₹6-15/min) - Google Chirp3-HD + OpenAI + ElevenLabs Flash
-- Target margin: 70-80% (Cost ~₹1-3/min)
-- ============================================

INSERT INTO public.voices (
    name, description, gender, 
    elevenlabs_voice_id, provider_voice_id, 
    tts_provider, provider_model, pricing_tier,
    accent, primary_language, supported_languages, tags,
    cost_per_min, is_featured, display_order,
    latency_tier, quality_tier, supports_streaming,
    language_voice_codes, preview_url
) VALUES 

-- ===== HINDI - BOOST TIER (Google Chirp3-HD) =====
('Kavya', 
 'Premium Hindi voice with streaming support. Ultra-natural conversational quality.',
 'Female',
 'hi-IN-Chirp3-HD-Achernar', 'hi-IN-Chirp3-HD-Achernar',
 'google', 'chirp3-hd', 'boost',
 'Indian', 'Hindi',
 ARRAY['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam']::TEXT[],
 ARRAY['Premium', 'Natural', 'Streaming', 'Conversational', 'Real-time']::TEXT[],
 8.00, true, 201,
 'low', 'premium', true,
 '{"hi-IN": "hi-IN-Chirp3-HD-Achernar", "en-IN": "en-IN-Chirp3-HD-Achernar", "ta-IN": "ta-IN-Chirp3-HD-Achernar", "te-IN": "te-IN-Chirp3-HD-Achernar", "bn-IN": "bn-IN-Chirp3-HD-Achernar", "mr-IN": "mr-IN-Chirp3-HD-Achernar", "gu-IN": "gu-IN-Chirp3-HD-Achernar", "kn-IN": "kn-IN-Chirp3-HD-Achernar", "ml-IN": "ml-IN-Chirp3-HD-Achernar"}'::JSONB,
 NULL),

('Vikram', 
 'Professional male Hindi voice. Ideal for enterprise customer support.',
 'Male',
 'hi-IN-Chirp3-HD-Puck', 'hi-IN-Chirp3-HD-Puck',
 'google', 'chirp3-hd', 'boost',
 'Indian', 'Hindi',
 ARRAY['Hindi', 'English', 'Marathi', 'Gujarati']::TEXT[],
 ARRAY['Professional', 'Enterprise', 'Support', 'Confident']::TEXT[],
 8.00, true, 202,
 'low', 'premium', true,
 '{"hi-IN": "hi-IN-Chirp3-HD-Puck", "en-IN": "en-IN-Chirp3-HD-Puck", "mr-IN": "mr-IN-Chirp3-HD-Puck", "gu-IN": "gu-IN-Chirp3-HD-Puck"}'::JSONB,
 NULL),

('Neha', 
 'Warm and empathetic Hindi voice. Great for healthcare and support.',
 'Female',
 'hi-IN-Chirp3-HD-Kore', 'hi-IN-Chirp3-HD-Kore',
 'google', 'chirp3-hd', 'boost',
 'Indian', 'Hindi',
 ARRAY['Hindi', 'English']::TEXT[],
 ARRAY['Warm', 'Empathetic', 'Healthcare', 'Support']::TEXT[],
 8.00, false, 203,
 'low', 'premium', true,
 '{"hi-IN": "hi-IN-Chirp3-HD-Kore", "en-IN": "en-IN-Chirp3-HD-Kore"}'::JSONB,
 NULL),

('Rohan', 
 'Energetic male Hindi voice. Perfect for sales and marketing.',
 'Male',
 'hi-IN-Chirp3-HD-Achird', 'hi-IN-Chirp3-HD-Achird',
 'google', 'chirp3-hd', 'boost',
 'Indian', 'Hindi',
 ARRAY['Hindi', 'English']::TEXT[],
 ARRAY['Energetic', 'Sales', 'Marketing', 'Dynamic']::TEXT[],
 8.00, false, 204,
 'low', 'premium', true,
 '{"hi-IN": "hi-IN-Chirp3-HD-Achird", "en-IN": "en-IN-Chirp3-HD-Achird"}'::JSONB,
 NULL),

-- ===== ENGLISH - BOOST TIER (OpenAI) =====
('Emma', 
 'OpenAI Nova voice. Friendly and engaging for conversations.',
 'Female',
 'nova', 'nova',
 'openai', 'tts-1', 'boost',
 'American', 'English',
 ARRAY['English']::TEXT[],
 ARRAY['Friendly', 'Engaging', 'Modern', 'Conversational']::TEXT[],
 8.00, true, 205,
 'ultra-low', 'premium', false,
 '{}'::JSONB,
 NULL),

('James', 
 'OpenAI Onyx voice. Deep and authoritative for professional calls.',
 'Male',
 'onyx', 'onyx',
 'openai', 'tts-1', 'boost',
 'American', 'English',
 ARRAY['English']::TEXT[],
 ARRAY['Deep', 'Authoritative', 'Professional', 'Confident']::TEXT[],
 8.00, true, 206,
 'ultra-low', 'premium', false,
 '{}'::JSONB,
 NULL),

('Sarah', 
 'OpenAI Shimmer voice. Soft and calming for customer service.',
 'Female',
 'shimmer', 'shimmer',
 'openai', 'tts-1', 'boost',
 'American', 'English',
 ARRAY['English']::TEXT[],
 ARRAY['Soft', 'Calming', 'Service', 'Gentle']::TEXT[],
 8.00, false, 207,
 'ultra-low', 'premium', false,
 '{}'::JSONB,
 NULL),

('Alex', 
 'OpenAI Alloy voice. Versatile and balanced for any use case.',
 'Neutral',
 'alloy', 'alloy',
 'openai', 'tts-1', 'boost',
 'American', 'English',
 ARRAY['English']::TEXT[],
 ARRAY['Versatile', 'Balanced', 'Neutral', 'Clear']::TEXT[],
 8.00, false, 208,
 'ultra-low', 'premium', false,
 '{}'::JSONB,
 NULL),

('David', 
 'OpenAI Echo voice. Warm and expressive storytelling voice.',
 'Male',
 'echo', 'echo',
 'openai', 'tts-1', 'boost',
 'American', 'English',
 ARRAY['English']::TEXT[],
 ARRAY['Warm', 'Expressive', 'Storytelling', 'Narrative']::TEXT[],
 8.00, false, 209,
 'ultra-low', 'premium', false,
 '{}'::JSONB,
 NULL),

('Luna', 
 'OpenAI Fable voice. Expressive and animated.',
 'Neutral',
 'fable', 'fable',
 'openai', 'tts-1', 'boost',
 'British', 'English',
 ARRAY['English']::TEXT[],
 ARRAY['Expressive', 'Animated', 'British', 'Engaging']::TEXT[],
 8.00, false, 210,
 'ultra-low', 'premium', false,
 '{}'::JSONB,
 NULL),

-- ===== ENGLISH (INDIA) - BOOST TIER (Google Chirp3-HD) =====
('Aarav', 
 'Premium Indian English voice. Natural and professional.',
 'Male',
 'en-IN-Chirp3-HD-Puck', 'en-IN-Chirp3-HD-Puck',
 'google', 'chirp3-hd', 'boost',
 'Indian', 'English',
 ARRAY['English', 'Hindi']::TEXT[],
 ARRAY['Natural', 'Professional', 'Indian', 'Premium']::TEXT[],
 8.00, false, 211,
 'low', 'premium', true,
 '{"en-IN": "en-IN-Chirp3-HD-Puck", "hi-IN": "hi-IN-Chirp3-HD-Puck"}'::JSONB,
 NULL),

('Nisha', 
 'Warm Indian English voice. Great for customer engagement.',
 'Female',
 'en-IN-Chirp3-HD-Kore', 'en-IN-Chirp3-HD-Kore',
 'google', 'chirp3-hd', 'boost',
 'Indian', 'English',
 ARRAY['English', 'Hindi']::TEXT[],
 ARRAY['Warm', 'Engaging', 'Customer', 'Friendly']::TEXT[],
 8.00, false, 212,
 'low', 'premium', true,
 '{"en-IN": "en-IN-Chirp3-HD-Kore", "hi-IN": "hi-IN-Chirp3-HD-Kore"}'::JSONB,
 NULL),

-- ===== TAMIL - BOOST TIER (Google Chirp3-HD) =====
('Meera', 
 'Premium Tamil voice with streaming. Perfect for Chennai enterprises.',
 'Female',
 'ta-IN-Chirp3-HD-Achernar', 'ta-IN-Chirp3-HD-Achernar',
 'google', 'chirp3-hd', 'boost',
 'South Indian', 'Tamil',
 ARRAY['Tamil', 'English']::TEXT[],
 ARRAY['Premium', 'Streaming', 'Enterprise', 'Tamil Nadu']::TEXT[],
 8.00, true, 213,
 'low', 'premium', true,
 '{"ta-IN": "ta-IN-Chirp3-HD-Achernar", "en-IN": "en-IN-Chirp3-HD-Achernar"}'::JSONB,
 NULL),

('Kumar', 
 'Professional Tamil male voice. Great for corporate calls.',
 'Male',
 'ta-IN-Chirp3-HD-Puck', 'ta-IN-Chirp3-HD-Puck',
 'google', 'chirp3-hd', 'boost',
 'South Indian', 'Tamil',
 ARRAY['Tamil', 'English']::TEXT[],
 ARRAY['Professional', 'Corporate', 'Tamil', 'Authoritative']::TEXT[],
 8.00, false, 214,
 'low', 'premium', true,
 '{"ta-IN": "ta-IN-Chirp3-HD-Puck", "en-IN": "en-IN-Chirp3-HD-Puck"}'::JSONB,
 NULL),

-- ===== TELUGU - BOOST TIER (Google Chirp3-HD) =====
('Sravani', 
 'Premium Telugu voice. Natural and expressive.',
 'Female',
 'te-IN-Chirp3-HD-Achernar', 'te-IN-Chirp3-HD-Achernar',
 'google', 'chirp3-hd', 'boost',
 'South Indian', 'Telugu',
 ARRAY['Telugu', 'English']::TEXT[],
 ARRAY['Premium', 'Natural', 'Expressive', 'Telugu']::TEXT[],
 8.00, true, 215,
 'low', 'premium', true,
 '{"te-IN": "te-IN-Chirp3-HD-Achernar", "en-IN": "en-IN-Chirp3-HD-Achernar"}'::JSONB,
 NULL),

('Harsha', 
 'Professional Telugu male voice.',
 'Male',
 'te-IN-Chirp3-HD-Puck', 'te-IN-Chirp3-HD-Puck',
 'google', 'chirp3-hd', 'boost',
 'South Indian', 'Telugu',
 ARRAY['Telugu', 'English']::TEXT[],
 ARRAY['Professional', 'Telugu', 'Corporate']::TEXT[],
 8.00, false, 216,
 'low', 'premium', true,
 '{"te-IN": "te-IN-Chirp3-HD-Puck", "en-IN": "en-IN-Chirp3-HD-Puck"}'::JSONB,
 NULL)

ON CONFLICT (elevenlabs_voice_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cost_per_min = EXCLUDED.cost_per_min,
    provider_model = EXCLUDED.provider_model,
    pricing_tier = EXCLUDED.pricing_tier,
    updated_at = NOW();

-- ============================================
-- FUSION TIER VOICES (₹16-25/min) - ElevenLabs Multilingual v2
-- Target margin: 70-80% (Cost ~₹3-5/min)
-- ============================================

INSERT INTO public.voices (
    name, description, gender, 
    elevenlabs_voice_id, provider_voice_id, 
    tts_provider, provider_model, pricing_tier,
    accent, primary_language, supported_languages, tags,
    cost_per_min, is_featured, display_order,
    latency_tier, quality_tier, supports_streaming,
    language_voice_codes, preview_url
) VALUES 

-- ===== HINDI - FUSION TIER (ElevenLabs) =====
('Aaradhya', 
 'Ultra-realistic Hindi voice. Premium quality for VIP customers and high-value interactions.',
 'Female',
 'EXAVITQu4vr4xnSDxMaL', 'EXAVITQu4vr4xnSDxMaL',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'Indian', 'Hindi',
 ARRAY['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu']::TEXT[],
 ARRAY['Ultra-Realistic', 'VIP', 'Premium', 'Human-like', 'Emotional']::TEXT[],
 18.00, true, 301,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

('Advait', 
 'Ultra-realistic male Hindi voice. Perfect for enterprise sales and VIP support.',
 'Male',
 'ErXwobaYiN019PkySvjV', 'ErXwobaYiN019PkySvjV',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'Indian', 'Hindi',
 ARRAY['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam']::TEXT[],
 ARRAY['Ultra-Realistic', 'Enterprise', 'Sales', 'VIP', 'Confident']::TEXT[],
 18.00, true, 302,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

('Ishita', 
 'Warm and empathetic female voice. Ideal for healthcare and sensitive conversations.',
 'Female',
 'MF3mGyEYCl7XYWbV9V6O', 'MF3mGyEYCl7XYWbV9V6O',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'Indian', 'Hindi',
 ARRAY['Hindi', 'English', 'Marathi', 'Gujarati']::TEXT[],
 ARRAY['Warm', 'Empathetic', 'Healthcare', 'Sensitive', 'Caring']::TEXT[],
 18.00, false, 303,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

('Ishaan', 
 'Dynamic and engaging male voice. Great for marketing and promotions.',
 'Male',
 'GBv7mTt0atIp3Br8iCZE', 'GBv7mTt0atIp3Br8iCZE',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'Indian', 'English',
 ARRAY['English', 'Hindi', 'Tamil', 'Telugu']::TEXT[],
 ARRAY['Dynamic', 'Engaging', 'Marketing', 'Promotions', 'Energetic']::TEXT[],
 18.00, false, 304,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

-- ===== ENGLISH - FUSION TIER (ElevenLabs) =====
('Charlotte', 
 'Sophisticated British English voice. Premium quality for luxury brands.',
 'Female',
 'XB0fDUnXU5powFXDhCwa', 'XB0fDUnXU5powFXDhCwa',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'British', 'English',
 ARRAY['English', 'Hindi', 'French', 'German', 'Spanish']::TEXT[],
 ARRAY['Sophisticated', 'Luxury', 'British', 'Premium', 'Elegant']::TEXT[],
 18.00, true, 305,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

('William', 
 'Authoritative British male voice. Perfect for financial and legal services.',
 'Male',
 'pFZP5JQG7iQjIQuC4Bku', 'pFZP5JQG7iQjIQuC4Bku',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'British', 'English',
 ARRAY['English', 'Hindi', 'German']::TEXT[],
 ARRAY['Authoritative', 'Financial', 'Legal', 'Professional', 'Trustworthy']::TEXT[],
 18.00, false, 306,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

('Sophia', 
 'Elegant American voice. Great for high-end customer service.',
 'Female',
 'TX3LPaxmHKxFdv7VOQHJ', 'TX3LPaxmHKxFdv7VOQHJ',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'American', 'English',
 ARRAY['English', 'Spanish', 'Portuguese']::TEXT[],
 ARRAY['Elegant', 'High-end', 'Service', 'American', 'Polished']::TEXT[],
 18.00, false, 307,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

('Michael', 
 'Confident American male voice. Ideal for executive communications.',
 'Male',
 'flq6f7yk4E4fJM5XTYuZ', 'flq6f7yk4E4fJM5XTYuZ',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'American', 'English',
 ARRAY['English', 'Spanish']::TEXT[],
 ARRAY['Confident', 'Executive', 'American', 'Professional', 'C-Suite']::TEXT[],
 18.00, false, 308,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

-- ===== TAMIL - FUSION TIER (ElevenLabs) =====
('Ananya', 
 'Premium Tamil female voice. Ultra-realistic for South Indian enterprises.',
 'Female',
 'pMsXgVXv3BLzUgSXRplE', 'pMsXgVXv3BLzUgSXRplE',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'South Indian', 'Tamil',
 ARRAY['Tamil', 'English', 'Hindi', 'Telugu', 'Kannada', 'Malayalam']::TEXT[],
 ARRAY['Premium', 'Tamil', 'Ultra-Realistic', 'Enterprise', 'South India']::TEXT[],
 18.00, true, 309,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

('Surya', 
 'Authoritative Tamil male voice. Perfect for banking and insurance.',
 'Male',
 'bIHbv24MWmeRgasZH58o', 'bIHbv24MWmeRgasZH58o',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'South Indian', 'Tamil',
 ARRAY['Tamil', 'English', 'Hindi']::TEXT[],
 ARRAY['Authoritative', 'Banking', 'Insurance', 'Tamil', 'Professional']::TEXT[],
 18.00, false, 310,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

-- ===== TELUGU - FUSION TIER (ElevenLabs) =====
('Harika', 
 'Premium Telugu female voice. Warm and engaging.',
 'Female',
 'LcfcDJNUP1GQjkzn1xUU', 'LcfcDJNUP1GQjkzn1xUU',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'South Indian', 'Telugu',
 ARRAY['Telugu', 'English', 'Hindi', 'Tamil']::TEXT[],
 ARRAY['Premium', 'Telugu', 'Warm', 'Engaging', 'Hyderabad']::TEXT[],
 18.00, true, 311,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL),

('Pranav', 
 'Professional Telugu male voice for corporate communications.',
 'Male',
 'g5CIjZEefAph4nQFvHAz', 'g5CIjZEefAph4nQFvHAz',
 'elevenlabs', 'eleven_multilingual_v2', 'fusion',
 'South Indian', 'Telugu',
 ARRAY['Telugu', 'English', 'Hindi']::TEXT[],
 ARRAY['Professional', 'Corporate', 'Telugu', 'Andhra', 'Telangana']::TEXT[],
 18.00, false, 312,
 'low', 'ultra', true,
 '{}'::JSONB,
 NULL)

ON CONFLICT (elevenlabs_voice_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cost_per_min = EXCLUDED.cost_per_min,
    provider_model = EXCLUDED.provider_model,
    pricing_tier = EXCLUDED.pricing_tier,
    updated_at = NOW();

-- ============================================
-- ADD INDEXES FOR NEW QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_voices_provider_tier ON public.voices(tts_provider, pricing_tier);
CREATE INDEX IF NOT EXISTS idx_voices_language_tier ON public.voices(primary_language, pricing_tier);
CREATE INDEX IF NOT EXISTS idx_voices_featured_tier ON public.voices(is_featured, pricing_tier);

-- ============================================
-- SUMMARY VIEW FOR ADMIN
-- ============================================

CREATE OR REPLACE VIEW public.voice_library_summary AS
SELECT 
    pricing_tier,
    tts_provider,
    COUNT(*) as voice_count,
    ROUND(AVG(cost_per_min)::numeric, 2) as avg_cost_per_min,
    array_agg(DISTINCT primary_language) as languages
FROM public.voices
WHERE is_active = true
GROUP BY pricing_tier, tts_provider
ORDER BY 
    CASE pricing_tier 
        WHEN 'spark' THEN 1 
        WHEN 'boost' THEN 2 
        WHEN 'fusion' THEN 3 
    END,
    tts_provider;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:
--
-- Voice count by tier:
-- SELECT pricing_tier, COUNT(*) FROM voices GROUP BY pricing_tier;
--
-- Voice count by provider and tier:
-- SELECT * FROM voice_library_summary;
--
-- Featured voices:
-- SELECT name, pricing_tier, tts_provider, cost_per_min 
-- FROM voices WHERE is_featured = true ORDER BY pricing_tier, display_order;
--
-- Hindi voices by tier:
-- SELECT name, pricing_tier, cost_per_min 
-- FROM voices WHERE primary_language = 'Hindi' ORDER BY pricing_tier;
