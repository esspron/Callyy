-- Migration: Add dynamic_variables column to assistants table
-- This adds ElevenLabs-style dynamic variable support
-- Version: 008

-- Add dynamic_variables JSONB column to assistants table
ALTER TABLE assistants 
ADD COLUMN IF NOT EXISTS dynamic_variables JSONB DEFAULT '{"variables": [], "enableSystemVariables": true}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN assistants.dynamic_variables IS 'Dynamic variables configuration for template personalization (ElevenLabs-style). Contains: variables array (name, type, description, placeholder, isSecret) and enableSystemVariables boolean.';

-- Create index for faster JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_assistants_dynamic_variables 
ON assistants USING GIN (dynamic_variables);
