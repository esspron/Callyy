-- =====================================================
-- Migration: Lead Scoring & Qualification System
-- Description: AI-powered lead scoring for real estate
--              outbound campaigns with post-call analysis
-- =====================================================

-- ============================================
-- LEAD SCORES TABLE
-- Stores detailed scoring breakdown for each lead
-- ============================================
CREATE TABLE IF NOT EXISTS public.lead_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.campaign_leads(id) ON DELETE CASCADE,
    call_id UUID REFERENCES public.campaign_call_logs(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Overall score (0-100)
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    
    -- Timeline qualification
    timeline TEXT CHECK (timeline IN ('immediate', '1-3months', '3-6months', '6months+', 'unknown')),
    timeline_score INTEGER DEFAULT 0 CHECK (timeline_score >= 0 AND timeline_score <= 30),
    
    -- Motivation level
    motivation TEXT CHECK (motivation IN ('high', 'medium', 'low', 'unknown')),
    motivation_score INTEGER DEFAULT 0 CHECK (motivation_score >= 0 AND motivation_score <= 25),
    
    -- Price alignment (expectations match market)
    price_alignment BOOLEAN DEFAULT FALSE,
    price_alignment_score INTEGER DEFAULT 0 CHECK (price_alignment_score >= 0 AND price_alignment_score <= 15),
    
    -- Buyer-specific: Pre-approved for mortgage
    pre_approved BOOLEAN DEFAULT FALSE,
    pre_approved_score INTEGER DEFAULT 0 CHECK (pre_approved_score >= 0 AND pre_approved_score <= 10),
    
    -- Seller-specific: Must sell (life event forcing sale)
    must_sell BOOLEAN DEFAULT FALSE,
    must_sell_score INTEGER DEFAULT 0 CHECK (must_sell_score >= 0 AND must_sell_score <= 20),
    
    -- Appointment booked during call
    appointment_booked BOOLEAN DEFAULT FALSE,
    appointment_booked_score INTEGER DEFAULT 0 CHECK (appointment_booked_score >= 0 AND appointment_booked_score <= 30),
    
    -- AI-extracted insights
    objections TEXT[], -- Array of objections mentioned
    key_insights TEXT, -- Summary of important points
    life_events TEXT[], -- Relocation, divorce, inheritance, etc.
    interest_level TEXT CHECK (interest_level IN ('yes', 'maybe', 'no', 'unknown')),
    
    -- Recommended actions
    recommended_action TEXT CHECK (recommended_action IN (
        'call_immediately', 
        'schedule_followup', 
        'send_information', 
        'add_to_nurture', 
        'mark_not_interested',
        'book_appointment'
    )),
    recommended_action_reason TEXT,
    
    -- Full AI analysis (raw JSON response)
    ai_analysis JSONB DEFAULT '{}',
    
    -- Confidence score for AI analysis (0-100)
    ai_confidence INTEGER DEFAULT 0 CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    
    -- Source of score
    score_source TEXT DEFAULT 'ai' CHECK (score_source IN ('ai', 'manual', 'rules')),
    
    -- Transcript used for analysis
    transcript_hash TEXT, -- Hash to detect if transcript changed
    
    -- Metadata
    scoring_version TEXT DEFAULT 'v1.0',
    processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_lead_scores_lead_id ON public.lead_scores(lead_id);
CREATE INDEX idx_lead_scores_user_id ON public.lead_scores(user_id);
CREATE INDEX idx_lead_scores_call_id ON public.lead_scores(call_id);
CREATE INDEX idx_lead_scores_overall ON public.lead_scores(overall_score DESC);
CREATE INDEX idx_lead_scores_timeline ON public.lead_scores(timeline);
CREATE INDEX idx_lead_scores_motivation ON public.lead_scores(motivation);
CREATE INDEX idx_lead_scores_recommended_action ON public.lead_scores(recommended_action);
CREATE INDEX idx_lead_scores_created_at ON public.lead_scores(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_scores
CREATE POLICY "Users can view their own lead scores"
    ON public.lead_scores FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lead scores"
    ON public.lead_scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead scores"
    ON public.lead_scores FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead scores"
    ON public.lead_scores FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- SCORING RULES TABLE
-- Custom scoring rules per user (optional)
-- ============================================
CREATE TABLE IF NOT EXISTS public.lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rule name and description
    name TEXT NOT NULL,
    description TEXT,
    
    -- Scoring weights (can override defaults)
    timeline_weights JSONB DEFAULT '{
        "immediate": 30,
        "1-3months": 25,
        "3-6months": 15,
        "6months+": 5,
        "unknown": 0
    }',
    motivation_weights JSONB DEFAULT '{
        "high": 25,
        "medium": 15,
        "low": 5,
        "unknown": 0
    }',
    price_alignment_weight INTEGER DEFAULT 15,
    pre_approved_weight INTEGER DEFAULT 10,
    must_sell_weight INTEGER DEFAULT 20,
    appointment_booked_weight INTEGER DEFAULT 30,
    
    -- Thresholds for lead classification
    hot_lead_threshold INTEGER DEFAULT 70,
    warm_lead_threshold INTEGER DEFAULT 40,
    
    -- Active status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Only one active rule per user
    CONSTRAINT unique_active_rule_per_user UNIQUE (user_id, is_active) 
        WHERE (is_active = TRUE)
);

-- Enable RLS
ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own scoring rules"
    ON public.lead_scoring_rules FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- UPDATE campaign_leads TABLE
-- Add scoring-related columns if not exist
-- ============================================
ALTER TABLE public.campaign_leads
ADD COLUMN IF NOT EXISTS lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100),
ADD COLUMN IF NOT EXISTS lead_grade TEXT CHECK (lead_grade IN ('hot', 'warm', 'cold', 'unscored')),
ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS score_version TEXT;

-- Create index for lead_score queries
CREATE INDEX IF NOT EXISTS idx_campaign_leads_score ON public.campaign_leads(lead_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_grade ON public.campaign_leads(lead_grade);

-- ============================================
-- FUNCTION: Update lead score on campaign_leads
-- Called after inserting a new score
-- ============================================
CREATE OR REPLACE FUNCTION update_lead_score_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.campaign_leads
    SET 
        lead_score = NEW.overall_score,
        lead_grade = CASE 
            WHEN NEW.overall_score >= 70 THEN 'hot'
            WHEN NEW.overall_score >= 40 THEN 'warm'
            ELSE 'cold'
        END,
        last_scored_at = NEW.created_at,
        score_version = NEW.scoring_version,
        updated_at = NOW()
    WHERE id = NEW.lead_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_lead_score ON public.lead_scores;
CREATE TRIGGER trigger_update_lead_score
    AFTER INSERT ON public.lead_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_score_on_insert();

-- ============================================
-- FUNCTION: Get lead score summary for a campaign
-- ============================================
CREATE OR REPLACE FUNCTION get_campaign_score_summary(p_campaign_id UUID)
RETURNS TABLE (
    total_leads BIGINT,
    scored_leads BIGINT,
    hot_leads BIGINT,
    warm_leads BIGINT,
    cold_leads BIGINT,
    average_score NUMERIC,
    score_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_leads,
        COUNT(lead_score)::BIGINT as scored_leads,
        COUNT(*) FILTER (WHERE lead_grade = 'hot')::BIGINT as hot_leads,
        COUNT(*) FILTER (WHERE lead_grade = 'warm')::BIGINT as warm_leads,
        COUNT(*) FILTER (WHERE lead_grade = 'cold')::BIGINT as cold_leads,
        ROUND(AVG(lead_score), 1) as average_score,
        jsonb_build_object(
            '0-20', COUNT(*) FILTER (WHERE lead_score BETWEEN 0 AND 20),
            '21-40', COUNT(*) FILTER (WHERE lead_score BETWEEN 21 AND 40),
            '41-60', COUNT(*) FILTER (WHERE lead_score BETWEEN 41 AND 60),
            '61-80', COUNT(*) FILTER (WHERE lead_score BETWEEN 61 AND 80),
            '81-100', COUNT(*) FILTER (WHERE lead_score BETWEEN 81 AND 100)
        ) as score_distribution
    FROM public.campaign_leads
    WHERE campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.lead_scores IS 'AI-powered lead scoring with detailed qualification breakdown for real estate campaigns';
COMMENT ON COLUMN public.lead_scores.timeline IS 'When the lead plans to buy/sell: immediate, 1-3months, 3-6months, 6months+, unknown';
COMMENT ON COLUMN public.lead_scores.motivation IS 'How motivated is the lead: high, medium, low, unknown';
COMMENT ON COLUMN public.lead_scores.must_sell IS 'For sellers: life event forcing sale (relocation, divorce, inheritance, etc.)';
COMMENT ON COLUMN public.lead_scores.pre_approved IS 'For buyers: already pre-approved for mortgage';
COMMENT ON COLUMN public.lead_scores.objections IS 'Array of objections mentioned during the call';
COMMENT ON COLUMN public.lead_scores.life_events IS 'Life events detected: relocation, divorce, inheritance, new job, etc.';
