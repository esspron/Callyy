-- =====================================================
-- WhatsApp Business API Integration Schema
-- Migration: 006_whatsapp_integration.sql
-- 
-- This migration creates tables for:
-- 1. WhatsApp Business Account configurations
-- 2. WhatsApp messages (inbound/outbound)
-- 3. WhatsApp calls
-- 4. WhatsApp contacts
-- 5. WhatsApp message templates
-- =====================================================

-- =====================================================
-- 1. WHATSAPP CONFIGURATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- WhatsApp Business Account Info
    waba_id TEXT NOT NULL,                          -- WhatsApp Business Account ID
    phone_number_id TEXT NOT NULL,                  -- Business Phone Number ID
    display_phone_number TEXT NOT NULL,             -- Formatted phone number
    display_name TEXT NOT NULL,                     -- Business display name
    
    -- Facebook/Meta App Credentials (encrypted)
    access_token TEXT NOT NULL,                     -- Encrypted access token
    app_id TEXT,                                    -- Facebook App ID
    
    -- Webhook Configuration
    webhook_verify_token TEXT NOT NULL,             -- Token for webhook verification
    webhook_url TEXT,                               -- The configured webhook URL
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected', 'error')),
    quality_rating TEXT CHECK (quality_rating IN ('GREEN', 'YELLOW', 'RED', 'UNKNOWN')),
    messaging_limit INTEGER,
    
    -- Features Enabled
    calling_enabled BOOLEAN DEFAULT FALSE,
    chatbot_enabled BOOLEAN DEFAULT FALSE,
    
    -- Calling Settings (JSONB)
    call_settings JSONB DEFAULT '{
        "inboundCallsEnabled": false,
        "outboundCallsEnabled": false,
        "callbackRequestEnabled": false
    }'::jsonb,
    
    -- Chatbot Configuration
    assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id, phone_number_id)
);

-- Index for faster lookups
CREATE INDEX idx_whatsapp_configs_user_id ON whatsapp_configs(user_id);
CREATE INDEX idx_whatsapp_configs_phone_number_id ON whatsapp_configs(phone_number_id);
CREATE INDEX idx_whatsapp_configs_status ON whatsapp_configs(status);

-- =====================================================
-- 2. WHATSAPP MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_message_id TEXT NOT NULL,                    -- WhatsApp message ID
    config_id UUID NOT NULL REFERENCES whatsapp_configs(id) ON DELETE CASCADE,
    
    -- Participants
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    
    -- Message Content
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contacts', 'interactive', 'template', 'reaction')),
    content JSONB NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
    error_code TEXT,
    error_message TEXT,
    
    -- Context (for replies)
    context_message_id TEXT,
    
    -- AI Processing
    is_from_bot BOOLEAN DEFAULT FALSE,
    assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
    
    -- Timestamps
    message_timestamp TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint on WhatsApp message ID per config
    UNIQUE(config_id, wa_message_id)
);

-- Indexes for message queries
CREATE INDEX idx_whatsapp_messages_config_id ON whatsapp_messages(config_id);
CREATE INDEX idx_whatsapp_messages_from_number ON whatsapp_messages(from_number);
CREATE INDEX idx_whatsapp_messages_to_number ON whatsapp_messages(to_number);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_timestamp ON whatsapp_messages(message_timestamp DESC);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(status);

-- =====================================================
-- 3. WHATSAPP CALLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_call_id TEXT NOT NULL,                       -- WhatsApp call ID
    config_id UUID NOT NULL REFERENCES whatsapp_configs(id) ON DELETE CASCADE,
    
    -- Participants
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    
    -- Call Status
    status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'in_progress', 'completed', 'missed', 'rejected', 'busy', 'failed')),
    
    -- Duration
    started_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- AI Integration
    handled_by_bot BOOLEAN DEFAULT FALSE,
    assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
    transcript JSONB,                               -- Array of transcript messages
    
    -- Callback Request
    callback_requested BOOLEAN DEFAULT FALSE,
    callback_scheduled_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(config_id, wa_call_id)
);

-- Indexes for call queries
CREATE INDEX idx_whatsapp_calls_config_id ON whatsapp_calls(config_id);
CREATE INDEX idx_whatsapp_calls_from_number ON whatsapp_calls(from_number);
CREATE INDEX idx_whatsapp_calls_to_number ON whatsapp_calls(to_number);
CREATE INDEX idx_whatsapp_calls_direction ON whatsapp_calls(direction);
CREATE INDEX idx_whatsapp_calls_status ON whatsapp_calls(status);
CREATE INDEX idx_whatsapp_calls_created_at ON whatsapp_calls(created_at DESC);

-- =====================================================
-- 4. WHATSAPP CONTACTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES whatsapp_configs(id) ON DELETE CASCADE,
    
    -- Contact Info
    wa_id TEXT NOT NULL,                            -- WhatsApp ID (phone number without +)
    profile_name TEXT,                              -- WhatsApp profile name
    phone_number TEXT NOT NULL,                     -- Full phone number with country code
    
    -- Customer Link
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Conversation State
    is_opted_in BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMPTZ,
    conversation_window_open BOOLEAN DEFAULT FALSE,
    window_expires_at TIMESTAMPTZ,
    
    -- Calling Permission
    calling_permission_granted BOOLEAN DEFAULT FALSE,
    calling_permission_requested_at TIMESTAMPTZ,
    
    -- Stats
    total_messages INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(config_id, wa_id)
);

-- Indexes for contact queries
CREATE INDEX idx_whatsapp_contacts_config_id ON whatsapp_contacts(config_id);
CREATE INDEX idx_whatsapp_contacts_wa_id ON whatsapp_contacts(wa_id);
CREATE INDEX idx_whatsapp_contacts_customer_id ON whatsapp_contacts(customer_id);
CREATE INDEX idx_whatsapp_contacts_phone_number ON whatsapp_contacts(phone_number);

-- =====================================================
-- 5. WHATSAPP TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES whatsapp_configs(id) ON DELETE CASCADE,
    
    -- Template Info
    template_name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    category TEXT NOT NULL CHECK (category IN ('AUTHENTICATION', 'MARKETING', 'UTILITY')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED', 'DISABLED')),
    
    -- Template Structure
    components JSONB NOT NULL,
    
    -- Meta Info
    quality_score TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(config_id, template_name, language)
);

-- Indexes for template queries
CREATE INDEX idx_whatsapp_templates_config_id ON whatsapp_templates(config_id);
CREATE INDEX idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX idx_whatsapp_templates_category ON whatsapp_templates(category);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- WhatsApp Configs Policies
CREATE POLICY "Users can view their own WhatsApp configs"
    ON whatsapp_configs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp configs"
    ON whatsapp_configs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp configs"
    ON whatsapp_configs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp configs"
    ON whatsapp_configs FOR DELETE
    USING (auth.uid() = user_id);

-- WhatsApp Messages Policies (via config)
CREATE POLICY "Users can view messages for their configs"
    ON whatsapp_messages FOR SELECT
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert messages for their configs"
    ON whatsapp_messages FOR INSERT
    WITH CHECK (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can update messages for their configs"
    ON whatsapp_messages FOR UPDATE
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

-- WhatsApp Calls Policies (via config)
CREATE POLICY "Users can view calls for their configs"
    ON whatsapp_calls FOR SELECT
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert calls for their configs"
    ON whatsapp_calls FOR INSERT
    WITH CHECK (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can update calls for their configs"
    ON whatsapp_calls FOR UPDATE
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

-- WhatsApp Contacts Policies (via config)
CREATE POLICY "Users can view contacts for their configs"
    ON whatsapp_contacts FOR SELECT
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert contacts for their configs"
    ON whatsapp_contacts FOR INSERT
    WITH CHECK (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can update contacts for their configs"
    ON whatsapp_contacts FOR UPDATE
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete contacts for their configs"
    ON whatsapp_contacts FOR DELETE
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

-- WhatsApp Templates Policies (via config)
CREATE POLICY "Users can view templates for their configs"
    ON whatsapp_templates FOR SELECT
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert templates for their configs"
    ON whatsapp_templates FOR INSERT
    WITH CHECK (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can update templates for their configs"
    ON whatsapp_templates FOR UPDATE
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete templates for their configs"
    ON whatsapp_templates FOR DELETE
    USING (config_id IN (SELECT id FROM whatsapp_configs WHERE user_id = auth.uid()));

-- =====================================================
-- 7. UPDATE TRIGGERS
-- =====================================================

-- Auto-update updated_at for whatsapp_configs
CREATE TRIGGER update_whatsapp_configs_updated_at
    BEFORE UPDATE ON whatsapp_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for whatsapp_calls
CREATE TRIGGER update_whatsapp_calls_updated_at
    BEFORE UPDATE ON whatsapp_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for whatsapp_contacts
CREATE TRIGGER update_whatsapp_contacts_updated_at
    BEFORE UPDATE ON whatsapp_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for whatsapp_templates
CREATE TRIGGER update_whatsapp_templates_updated_at
    BEFORE UPDATE ON whatsapp_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. HELPER FUNCTION: Update Contact Stats
-- =====================================================

-- Function to update contact message/call counts
CREATE OR REPLACE FUNCTION update_whatsapp_contact_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'whatsapp_messages' THEN
        -- Update message count for the contact
        UPDATE whatsapp_contacts
        SET 
            total_messages = total_messages + 1,
            last_message_at = NEW.message_timestamp,
            conversation_window_open = TRUE,
            window_expires_at = NEW.message_timestamp + INTERVAL '24 hours',
            updated_at = NOW()
        WHERE config_id = NEW.config_id 
        AND (wa_id = REPLACE(NEW.from_number, '+', '') OR wa_id = REPLACE(NEW.to_number, '+', ''));
    
    ELSIF TG_TABLE_NAME = 'whatsapp_calls' THEN
        -- Update call count for the contact
        UPDATE whatsapp_contacts
        SET 
            total_calls = total_calls + 1,
            updated_at = NOW()
        WHERE config_id = NEW.config_id 
        AND (wa_id = REPLACE(NEW.from_number, '+', '') OR wa_id = REPLACE(NEW.to_number, '+', ''));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for messages
CREATE TRIGGER update_contact_on_message
    AFTER INSERT ON whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_contact_stats();

-- Trigger for calls
CREATE TRIGGER update_contact_on_call
    AFTER INSERT ON whatsapp_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_contact_stats();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
