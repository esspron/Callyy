// ============================================
// LEAD SCORING SERVICE
// AI-powered lead qualification for real estate
// ============================================
const { supabase, openai } = require('../../config');
const crypto = require('crypto');

// ============================================
// SCORING WEIGHTS (Default Real Estate Model)
// ============================================
const DEFAULT_SCORING_WEIGHTS = {
    timeline: {
        'immediate': 30,
        '1-3months': 25,
        '3-6months': 15,
        '6months+': 5,
        'unknown': 0
    },
    motivation: {
        'high': 25,
        'medium': 15,
        'low': 5,
        'unknown': 0
    },
    priceAlignment: 15,
    preApproved: 10,
    mustSell: 20,
    appointmentBooked: 30
};

// Grade thresholds
const GRADE_THRESHOLDS = {
    hot: 70,
    warm: 40
};

// ============================================
// AI PROMPT FOR LEAD QUALIFICATION
// ============================================
const LEAD_QUALIFICATION_PROMPT = `You are an expert real estate lead qualification analyst. Analyze the following call transcript between a real estate AI assistant and a potential client.

Extract the following information and provide a detailed assessment:

1. **Timeline**: When does the lead plan to buy/sell?
   - "immediate" = Within 30 days
   - "1-3months" = 1-3 months
   - "3-6months" = 3-6 months
   - "6months+" = More than 6 months
   - "unknown" = Not mentioned or unclear

2. **Motivation Level**: How motivated is this lead?
   - "high" = Urgent need, clear desire to move forward
   - "medium" = Interested but not urgent
   - "low" = Just exploring, no real intent
   - "unknown" = Cannot determine

3. **Price Alignment**: Do their price expectations align with market reality?
   - true = Realistic expectations
   - false = Unrealistic expectations or unknown

4. **Pre-Approved** (for buyers): Are they pre-approved for a mortgage?
   - true = Mentioned pre-approval or financing in place
   - false = Not pre-approved or unknown

5. **Must Sell** (for sellers): Is there a life event forcing the sale?
   - true = Relocation, divorce, inheritance, job change, financial pressure
   - false = No urgency mentioned

6. **Appointment Booked**: Did they agree to meet with the agent?
   - true = Agreed to showing, listing appointment, or consultation
   - false = Did not agree or declined

7. **Interest Level**: Overall interest in working with the agent
   - "yes" = Clearly interested
   - "maybe" = On the fence
   - "no" = Not interested
   - "unknown" = Cannot determine

8. **Objections**: List any objections or concerns mentioned
   - Examples: "want to sell myself", "already have an agent", "not ready", "just looking"

9. **Life Events**: Any life events mentioned
   - Examples: "relocation", "divorce", "inheritance", "new job", "retirement", "growing family", "downsizing"

10. **Key Insights**: Summarize the most important takeaways from this conversation in 2-3 sentences.

11. **Recommended Action**: Based on the analysis, what should the agent do next?
    - "call_immediately" = Hot lead, call back ASAP
    - "schedule_followup" = Warm lead, schedule follow-up
    - "send_information" = Send property info or market analysis
    - "add_to_nurture" = Add to long-term nurture campaign
    - "mark_not_interested" = Lead is not interested
    - "book_appointment" = Try to book appointment

12. **Recommended Action Reason**: Brief explanation for the recommended action.

13. **Confidence**: How confident are you in this analysis? (0-100)

IMPORTANT: Be objective and base your analysis only on what was actually said in the transcript. If something wasn't mentioned, mark it as "unknown" or false.

Respond ONLY with a valid JSON object in this exact format:
{
    "timeline": "immediate" | "1-3months" | "3-6months" | "6months+" | "unknown",
    "motivation": "high" | "medium" | "low" | "unknown",
    "priceAlignment": true | false,
    "preApproved": true | false,
    "mustSell": true | false,
    "appointmentBooked": true | false,
    "interestLevel": "yes" | "maybe" | "no" | "unknown",
    "objections": ["objection1", "objection2"],
    "lifeEvents": ["event1", "event2"],
    "keyInsights": "Summary of key insights...",
    "recommendedAction": "call_immediately" | "schedule_followup" | "send_information" | "add_to_nurture" | "mark_not_interested" | "book_appointment",
    "recommendedActionReason": "Reason for recommendation...",
    "confidence": 85
}`;

// ============================================
// CORE SCORING FUNCTIONS
// ============================================

/**
 * Calculate overall lead score based on AI analysis
 */
function calculateScore(analysis, weights = DEFAULT_SCORING_WEIGHTS) {
    let score = 0;
    const breakdown = {};

    // Timeline score
    const timelineScore = weights.timeline[analysis.timeline] || 0;
    score += timelineScore;
    breakdown.timeline = timelineScore;

    // Motivation score
    const motivationScore = weights.motivation[analysis.motivation] || 0;
    score += motivationScore;
    breakdown.motivation = motivationScore;

    // Price alignment score
    const priceScore = analysis.priceAlignment ? weights.priceAlignment : 0;
    score += priceScore;
    breakdown.priceAlignment = priceScore;

    // Pre-approved score (buyers)
    const preApprovedScore = analysis.preApproved ? weights.preApproved : 0;
    score += preApprovedScore;
    breakdown.preApproved = preApprovedScore;

    // Must sell score (sellers)
    const mustSellScore = analysis.mustSell ? weights.mustSell : 0;
    score += mustSellScore;
    breakdown.mustSell = mustSellScore;

    // Appointment booked score (capped at max 100)
    const appointmentScore = analysis.appointmentBooked ? weights.appointmentBooked : 0;
    score += appointmentScore;
    breakdown.appointmentBooked = appointmentScore;

    // Cap at 100
    score = Math.min(score, 100);

    return { score, breakdown };
}

/**
 * Determine lead grade based on score
 */
function getLeadGrade(score, thresholds = GRADE_THRESHOLDS) {
    if (score >= thresholds.hot) return 'hot';
    if (score >= thresholds.warm) return 'warm';
    return 'cold';
}

/**
 * Generate hash of transcript for change detection
 */
function hashTranscript(transcript) {
    return crypto.createHash('md5').update(transcript || '').digest('hex');
}

// ============================================
// AI ANALYSIS FUNCTION
// ============================================

/**
 * Analyze call transcript using OpenAI
 */
async function analyzeTranscriptWithAI(transcript, leadContext = {}) {
    const startTime = Date.now();

    // Build context string
    let contextStr = '';
    if (leadContext.firstName || leadContext.lastName) {
        contextStr += `\nLead Name: ${leadContext.firstName || ''} ${leadContext.lastName || ''}`.trim();
    }
    if (leadContext.propertyAddress) {
        contextStr += `\nProperty: ${leadContext.propertyAddress}`;
    }
    if (leadContext.leadSource) {
        contextStr += `\nLead Source: ${leadContext.leadSource}`;
    }
    if (leadContext.listingPrice) {
        contextStr += `\nListing Price: $${leadContext.listingPrice.toLocaleString()}`;
    }

    const userMessage = `${contextStr ? `LEAD CONTEXT:${contextStr}\n\n` : ''}CALL TRANSCRIPT:\n${transcript}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Fast and cost-effective
            messages: [
                { role: 'system', content: LEAD_QUALIFICATION_PROMPT },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.3, // Lower temperature for consistent analysis
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from OpenAI');
        }

        const analysis = JSON.parse(content);
        const processingTime = Date.now() - startTime;

        return {
            success: true,
            analysis,
            processingTimeMs: processingTime,
            tokensUsed: response.usage?.total_tokens || 0
        };
    } catch (error) {
        console.error('Error analyzing transcript with AI:', error);
        return {
            success: false,
            error: error.message,
            processingTimeMs: Date.now() - startTime
        };
    }
}

// ============================================
// MAIN SCORING FUNCTIONS
// ============================================

/**
 * Score a lead based on call transcript
 */
async function scoreLead(userId, leadId, callId, transcript, options = {}) {
    const { forceRescore = false, customWeights = null } = options;

    // Get lead data
    const { data: lead, error: leadError } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('id', leadId)
        .eq('user_id', userId)
        .single();

    if (leadError || !lead) {
        throw new Error('Lead not found or access denied');
    }

    // Check if already scored with same transcript
    const transcriptHash = hashTranscript(transcript);
    if (!forceRescore) {
        const { data: existingScore } = await supabase
            .from('lead_scores')
            .select('id, transcript_hash')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existingScore && existingScore.transcript_hash === transcriptHash) {
            console.log('Lead already scored with same transcript, skipping');
            return { skipped: true, existingScoreId: existingScore.id };
        }
    }

    // Get custom scoring weights if user has them
    let weights = DEFAULT_SCORING_WEIGHTS;
    if (!customWeights) {
        const { data: userRules } = await supabase
            .from('lead_scoring_rules')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (userRules) {
            weights = {
                timeline: userRules.timeline_weights || DEFAULT_SCORING_WEIGHTS.timeline,
                motivation: userRules.motivation_weights || DEFAULT_SCORING_WEIGHTS.motivation,
                priceAlignment: userRules.price_alignment_weight || DEFAULT_SCORING_WEIGHTS.priceAlignment,
                preApproved: userRules.pre_approved_weight || DEFAULT_SCORING_WEIGHTS.preApproved,
                mustSell: userRules.must_sell_weight || DEFAULT_SCORING_WEIGHTS.mustSell,
                appointmentBooked: userRules.appointment_booked_weight || DEFAULT_SCORING_WEIGHTS.appointmentBooked
            };
        }
    } else {
        weights = customWeights;
    }

    // Analyze transcript with AI
    const aiResult = await analyzeTranscriptWithAI(transcript, {
        firstName: lead.first_name,
        lastName: lead.last_name,
        propertyAddress: lead.property_address,
        leadSource: lead.lead_source,
        listingPrice: lead.listing_price
    });

    if (!aiResult.success) {
        throw new Error(`AI analysis failed: ${aiResult.error}`);
    }

    const analysis = aiResult.analysis;

    // Calculate score
    const { score, breakdown } = calculateScore(analysis, weights);
    const grade = getLeadGrade(score);

    // Insert score record
    const { data: scoreRecord, error: insertError } = await supabase
        .from('lead_scores')
        .insert({
            lead_id: leadId,
            call_id: callId,
            user_id: userId,
            overall_score: score,
            timeline: analysis.timeline,
            timeline_score: breakdown.timeline,
            motivation: analysis.motivation,
            motivation_score: breakdown.motivation,
            price_alignment: analysis.priceAlignment,
            price_alignment_score: breakdown.priceAlignment,
            pre_approved: analysis.preApproved,
            pre_approved_score: breakdown.preApproved,
            must_sell: analysis.mustSell,
            must_sell_score: breakdown.mustSell,
            appointment_booked: analysis.appointmentBooked,
            appointment_booked_score: breakdown.appointmentBooked,
            objections: analysis.objections || [],
            key_insights: analysis.keyInsights,
            life_events: analysis.lifeEvents || [],
            interest_level: analysis.interestLevel,
            recommended_action: analysis.recommendedAction,
            recommended_action_reason: analysis.recommendedActionReason,
            ai_analysis: analysis,
            ai_confidence: analysis.confidence || 0,
            score_source: 'ai',
            transcript_hash: transcriptHash,
            processing_time_ms: aiResult.processingTimeMs
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error inserting lead score:', insertError);
        throw new Error(insertError.message);
    }

    return {
        success: true,
        scoreId: scoreRecord.id,
        score,
        grade,
        breakdown,
        analysis,
        processingTimeMs: aiResult.processingTimeMs
    };
}

/**
 * Get the latest score for a lead
 */
async function getLeadScore(userId, leadId) {
    const { data, error } = await supabase
        .from('lead_scores')
        .select('*')
        .eq('lead_id', leadId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
    }

    return data;
}

/**
 * Get all scores for a lead (score history)
 */
async function getLeadScoreHistory(userId, leadId) {
    const { data, error } = await supabase
        .from('lead_scores')
        .select('*')
        .eq('lead_id', leadId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
}

/**
 * Get score summary for a campaign
 */
async function getCampaignScoreSummary(userId, campaignId) {
    // Verify user owns the campaign
    const { data: campaign, error: campaignError } = await supabase
        .from('outbound_campaigns')
        .select('id')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();

    if (campaignError || !campaign) {
        throw new Error('Campaign not found or access denied');
    }

    // Get score summary using the database function
    const { data, error } = await supabase
        .rpc('get_campaign_score_summary', { p_campaign_id: campaignId });

    if (error) {
        throw new Error(error.message);
    }

    return data?.[0] || {
        total_leads: 0,
        scored_leads: 0,
        hot_leads: 0,
        warm_leads: 0,
        cold_leads: 0,
        average_score: null,
        score_distribution: {}
    };
}

/**
 * Batch score multiple leads (for re-scoring campaigns)
 */
async function batchScoreLeads(userId, campaignId, options = {}) {
    const { limit = 50, onlyUnscored = true } = options;

    // Get leads to score
    let query = supabase
        .from('campaign_leads')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
        .limit(limit);

    if (onlyUnscored) {
        query = query.is('lead_score', null);
    }

    const { data: leads, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    const results = {
        total: leads?.length || 0,
        scored: 0,
        skipped: 0,
        errors: []
    };

    for (const lead of leads || []) {
        try {
            // Get the latest call with transcript for this lead
            const { data: callLog } = await supabase
                .from('campaign_call_logs')
                .select('id, transcript')
                .eq('lead_id', lead.id)
                .not('transcript', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!callLog?.transcript) {
                results.skipped++;
                continue;
            }

            const result = await scoreLead(userId, lead.id, callLog.id, callLog.transcript);
            if (result.skipped) {
                results.skipped++;
            } else {
                results.scored++;
            }
        } catch (err) {
            results.errors.push({ leadId: lead.id, error: err.message });
        }
    }

    return results;
}

/**
 * Update user's scoring rules
 */
async function updateScoringRules(userId, rules) {
    const { data, error } = await supabase
        .from('lead_scoring_rules')
        .upsert({
            user_id: userId,
            name: rules.name || 'Custom Rules',
            description: rules.description,
            timeline_weights: rules.timelineWeights,
            motivation_weights: rules.motivationWeights,
            price_alignment_weight: rules.priceAlignmentWeight,
            pre_approved_weight: rules.preApprovedWeight,
            must_sell_weight: rules.mustSellWeight,
            appointment_booked_weight: rules.appointmentBookedWeight,
            hot_lead_threshold: rules.hotLeadThreshold,
            warm_lead_threshold: rules.warmLeadThreshold,
            is_active: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,is_active'
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

/**
 * Get user's scoring rules
 */
async function getScoringRules(userId) {
    const { data, error } = await supabase
        .from('lead_scoring_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
    }

    return data || {
        timelineWeights: DEFAULT_SCORING_WEIGHTS.timeline,
        motivationWeights: DEFAULT_SCORING_WEIGHTS.motivation,
        priceAlignmentWeight: DEFAULT_SCORING_WEIGHTS.priceAlignment,
        preApprovedWeight: DEFAULT_SCORING_WEIGHTS.preApproved,
        mustSellWeight: DEFAULT_SCORING_WEIGHTS.mustSell,
        appointmentBookedWeight: DEFAULT_SCORING_WEIGHTS.appointmentBooked,
        hotLeadThreshold: GRADE_THRESHOLDS.hot,
        warmLeadThreshold: GRADE_THRESHOLDS.warm,
        isDefault: true
    };
}

/**
 * Auto-score a lead after call completion
 * Called from outbound dialer status callback
 * This runs asynchronously and doesn't block the call flow
 */
async function autoScoreAfterCall(userId, leadId, callLogId) {
    try {
        console.log(`[AutoScore] Starting auto-score for lead ${leadId}, call ${callLogId}`);
        
        // Get the call log with transcript
        const { data: callLog, error: callError } = await supabase
            .from('campaign_call_logs')
            .select('id, transcript, duration_seconds, outcome, lead:campaign_leads(id, campaign_id)')
            .eq('id', callLogId)
            .single();

        if (callError || !callLog) {
            console.log(`[AutoScore] Call log not found: ${callLogId}`);
            return { success: false, reason: 'call_not_found' };
        }

        // Only score calls with transcripts and meaningful duration (30+ seconds)
        if (!callLog.transcript || callLog.duration_seconds < 30) {
            console.log(`[AutoScore] Skipping - no transcript or call too short (${callLog.duration_seconds}s)`);
            return { 
                success: false, 
                reason: callLog.transcript ? 'call_too_short' : 'no_transcript',
                duration: callLog.duration_seconds
            };
        }

        // Only score answered calls
        if (callLog.outcome !== 'answered') {
            console.log(`[AutoScore] Skipping - call outcome was: ${callLog.outcome}`);
            return { success: false, reason: 'not_answered', outcome: callLog.outcome };
        }

        // Score the lead
        const result = await scoreLead(userId, leadId, callLogId, callLog.transcript, {
            forceRescore: false // Don't rescore if already scored with same transcript
        });

        if (result.skipped) {
            console.log(`[AutoScore] Already scored with same transcript: ${leadId}`);
            return { success: true, skipped: true, reason: 'already_scored' };
        }

        console.log(`[AutoScore] Scored lead ${leadId}: ${result.score} (${result.grade})`);
        
        return {
            success: true,
            leadId,
            callLogId,
            score: result.score,
            grade: result.grade,
            processingTimeMs: result.processingTimeMs
        };
    } catch (error) {
        console.error(`[AutoScore] Error scoring lead ${leadId}:`, error);
        return { success: false, reason: 'error', error: error.message };
    }
}

/**
 * Check if lead has a score
 */
async function hasLeadScore(leadId) {
    const { count, error } = await supabase
        .from('lead_scores')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', leadId);

    if (error) {
        return false;
    }

    return count > 0;
}

module.exports = {
    scoreLead,
    getLeadScore,
    getLeadScoreHistory,
    getCampaignScoreSummary,
    batchScoreLeads,
    updateScoringRules,
    getScoringRules,
    analyzeTranscriptWithAI,
    calculateScore,
    getLeadGrade,
    autoScoreAfterCall,
    hasLeadScore,
    DEFAULT_SCORING_WEIGHTS,
    GRADE_THRESHOLDS
};
