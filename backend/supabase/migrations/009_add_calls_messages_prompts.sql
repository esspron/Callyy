-- =====================================================
-- Migration: Add Calls & Messages Tab Support
-- Description: Adds separate prompts for inbound calls,
--              outbound calls, and messaging channels
-- =====================================================

-- Add outbound call configuration columns
ALTER TABLE assistants
ADD COLUMN IF NOT EXISTS outbound_system_prompt TEXT,
ADD COLUMN IF NOT EXISTS outbound_first_message TEXT;

-- Add messaging configuration columns  
ALTER TABLE assistants
ADD COLUMN IF NOT EXISTS messaging_system_prompt TEXT,
ADD COLUMN IF NOT EXISTS messaging_first_message TEXT;

-- Add comments for documentation
COMMENT ON COLUMN assistants.outbound_system_prompt IS 'System prompt used when assistant makes outbound calls to customers';
COMMENT ON COLUMN assistants.outbound_first_message IS 'Opening message when assistant initiates outbound call';
COMMENT ON COLUMN assistants.messaging_system_prompt IS 'System prompt used for WhatsApp/SMS messaging channel';
COMMENT ON COLUMN assistants.messaging_first_message IS 'Opening message for messaging channel conversations';

-- Rename existing columns for clarity (these are the inbound defaults)
COMMENT ON COLUMN assistants.system_prompt IS 'System prompt for inbound calls (when customer calls the assistant)';
COMMENT ON COLUMN assistants.first_message IS 'Opening message for inbound calls';
