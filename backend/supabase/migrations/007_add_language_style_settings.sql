-- Add Language & Style Settings columns to assistants table
-- Migration: 007_add_language_style_settings.sql

-- Add language_settings JSONB column
ALTER TABLE assistants 
ADD COLUMN IF NOT EXISTS language_settings JSONB DEFAULT '{
    "default": "en",
    "autoDetect": true,
    "supported": []
}'::jsonb;

-- Add style_settings JSONB column  
ALTER TABLE assistants
ADD COLUMN IF NOT EXISTS style_settings JSONB DEFAULT '{
    "mode": "friendly",
    "adaptiveConfig": {
        "mirrorFormality": true,
        "mirrorLength": true,
        "mirrorVocabulary": true
    }
}'::jsonb;

-- Add timezone column if not exists
ALTER TABLE assistants
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';

-- Add comment for documentation
COMMENT ON COLUMN assistants.language_settings IS 'Language configuration: default language, auto-detect toggle, supported languages array';
COMMENT ON COLUMN assistants.style_settings IS 'Communication style: mode (professional/friendly/concise/adaptive), adaptive config options';
COMMENT ON COLUMN assistants.timezone IS 'Timezone for the assistant (IANA timezone name)';
