// ============================================
// LEAD SCORING ROUTES
// API endpoints for lead qualification & scoring
// ============================================
const express = require('express');
const router = express.Router();
const { verifySupabaseAuth } = require('../lib/auth');
const {
    scoreLead,
    getLeadScore,
    getLeadScoreHistory,
    getCampaignScoreSummary,
    batchScoreLeads,
    updateScoringRules,
    getScoringRules,
    analyzeTranscriptWithAI
} = require('../services/lead-scoring');
const { supabase } = require('../config');

// ============================================
// LEAD SCORING ENDPOINTS
// ============================================

/**
 * Score a single lead
 * POST /api/lead-scoring/leads/:leadId/score
 */
router.post('/leads/:leadId/score', verifySupabaseAuth, async (req, res) => {
    try {
        const { leadId } = req.params;
        const { transcript, callId, forceRescore } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: 'Transcript is required' });
        }

        const result = await scoreLead(req.userId, leadId, callId, transcript, { forceRescore });

        if (result.skipped) {
            return res.json({ 
                success: true, 
                skipped: true, 
                message: 'Lead already scored with same transcript',
                existingScoreId: result.existingScoreId
            });
        }

        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error scoring lead:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get the latest score for a lead
 * GET /api/lead-scoring/leads/:leadId/score
 */
router.get('/leads/:leadId/score', verifySupabaseAuth, async (req, res) => {
    try {
        const { leadId } = req.params;
        const score = await getLeadScore(req.userId, leadId);
        res.json({ success: true, score });
    } catch (error) {
        console.error('Error getting lead score:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get score history for a lead
 * GET /api/lead-scoring/leads/:leadId/history
 */
router.get('/leads/:leadId/history', verifySupabaseAuth, async (req, res) => {
    try {
        const { leadId } = req.params;
        const history = await getLeadScoreHistory(req.userId, leadId);
        res.json({ success: true, history });
    } catch (error) {
        console.error('Error getting lead score history:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Re-score a lead with latest call transcript
 * POST /api/lead-scoring/leads/:leadId/rescore
 */
router.post('/leads/:leadId/rescore', verifySupabaseAuth, async (req, res) => {
    try {
        const { leadId } = req.params;

        // Get the latest call with transcript for this lead
        const { data: callLog, error: callError } = await supabase
            .from('campaign_call_logs')
            .select('id, transcript')
            .eq('lead_id', leadId)
            .not('transcript', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (callError || !callLog?.transcript) {
            return res.status(400).json({ 
                error: 'No call transcript found for this lead. Lead must have a completed call with transcript to be scored.' 
            });
        }

        const result = await scoreLead(req.userId, leadId, callLog.id, callLog.transcript, { forceRescore: true });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error re-scoring lead:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CAMPAIGN SCORING ENDPOINTS
// ============================================

/**
 * Get score summary for a campaign
 * GET /api/lead-scoring/campaigns/:campaignId/summary
 */
router.get('/campaigns/:campaignId/summary', verifySupabaseAuth, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const summary = await getCampaignScoreSummary(req.userId, campaignId);
        res.json({ success: true, summary });
    } catch (error) {
        console.error('Error getting campaign score summary:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Batch score leads in a campaign
 * POST /api/lead-scoring/campaigns/:campaignId/batch-score
 */
router.post('/campaigns/:campaignId/batch-score', verifySupabaseAuth, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { limit = 50, onlyUnscored = true } = req.body;

        const results = await batchScoreLeads(req.userId, campaignId, { limit, onlyUnscored });
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error batch scoring leads:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get leads by grade for a campaign
 * GET /api/lead-scoring/campaigns/:campaignId/leads-by-grade
 */
router.get('/campaigns/:campaignId/leads-by-grade', verifySupabaseAuth, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { grade, limit = 50, offset = 0 } = req.query;

        // Verify user owns the campaign
        const { data: campaign, error: campaignError } = await supabase
            .from('outbound_campaigns')
            .select('id')
            .eq('id', campaignId)
            .eq('user_id', req.userId)
            .single();

        if (campaignError || !campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Build query
        let query = supabase
            .from('campaign_leads')
            .select(`
                *,
                latest_score:lead_scores(
                    id,
                    overall_score,
                    timeline,
                    motivation,
                    recommended_action,
                    created_at
                )
            `)
            .eq('campaign_id', campaignId)
            .order('lead_score', { ascending: false, nullsFirst: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (grade && grade !== 'all') {
            query = query.eq('lead_grade', grade);
        }

        const { data: leads, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        res.json({ success: true, leads });
    } catch (error) {
        console.error('Error getting leads by grade:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SCORING RULES ENDPOINTS
// ============================================

/**
 * Get user's scoring rules
 * GET /api/lead-scoring/rules
 */
router.get('/rules', verifySupabaseAuth, async (req, res) => {
    try {
        const rules = await getScoringRules(req.userId);
        res.json({ success: true, rules });
    } catch (error) {
        console.error('Error getting scoring rules:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update user's scoring rules
 * PUT /api/lead-scoring/rules
 */
router.put('/rules', verifySupabaseAuth, async (req, res) => {
    try {
        const rules = await updateScoringRules(req.userId, req.body);
        res.json({ success: true, rules });
    } catch (error) {
        console.error('Error updating scoring rules:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ANALYSIS ENDPOINTS
// ============================================

/**
 * Preview score analysis without saving
 * POST /api/lead-scoring/analyze-preview
 */
router.post('/analyze-preview', verifySupabaseAuth, async (req, res) => {
    try {
        const { transcript, leadContext } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: 'Transcript is required' });
        }

        const result = await analyzeTranscriptWithAI(transcript, leadContext);

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        // Calculate score preview
        const { calculateScore, getLeadGrade, DEFAULT_SCORING_WEIGHTS } = require('../services/lead-scoring');
        const { score, breakdown } = calculateScore(result.analysis, DEFAULT_SCORING_WEIGHTS);
        const grade = getLeadGrade(score);

        res.json({
            success: true,
            preview: {
                score,
                grade,
                breakdown,
                analysis: result.analysis
            },
            processingTimeMs: result.processingTimeMs
        });
    } catch (error) {
        console.error('Error previewing analysis:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get scoring weights explanation
 * GET /api/lead-scoring/weights-info
 */
router.get('/weights-info', async (req, res) => {
    const { DEFAULT_SCORING_WEIGHTS, GRADE_THRESHOLDS } = require('../services/lead-scoring');
    
    res.json({
        success: true,
        weights: DEFAULT_SCORING_WEIGHTS,
        thresholds: GRADE_THRESHOLDS,
        maxPossibleScore: 100,
        categories: {
            timeline: {
                description: 'When the lead plans to buy/sell',
                maxScore: 30,
                options: Object.entries(DEFAULT_SCORING_WEIGHTS.timeline).map(([key, value]) => ({
                    value: key,
                    score: value,
                    label: key === 'immediate' ? 'Within 30 days' :
                           key === '1-3months' ? '1-3 months' :
                           key === '3-6months' ? '3-6 months' :
                           key === '6months+' ? 'More than 6 months' : 'Unknown'
                }))
            },
            motivation: {
                description: 'How motivated is this lead',
                maxScore: 25,
                options: Object.entries(DEFAULT_SCORING_WEIGHTS.motivation).map(([key, value]) => ({
                    value: key,
                    score: value,
                    label: key.charAt(0).toUpperCase() + key.slice(1)
                }))
            },
            priceAlignment: {
                description: 'Price expectations align with market',
                maxScore: DEFAULT_SCORING_WEIGHTS.priceAlignment
            },
            preApproved: {
                description: 'Buyer is pre-approved for mortgage',
                maxScore: DEFAULT_SCORING_WEIGHTS.preApproved
            },
            mustSell: {
                description: 'Seller has life event forcing sale',
                maxScore: DEFAULT_SCORING_WEIGHTS.mustSell
            },
            appointmentBooked: {
                description: 'Agreed to meet with agent',
                maxScore: DEFAULT_SCORING_WEIGHTS.appointmentBooked
            }
        }
    });
});

module.exports = router;
