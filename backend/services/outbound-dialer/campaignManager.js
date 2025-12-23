// ============================================
// CAMPAIGN MANAGER SERVICE
// Handles campaign CRUD and lifecycle management
// ============================================
const { supabase } = require('../../config');

/**
 * Create a new outbound campaign
 */
async function createCampaign(userId, campaignData) {
    const { data, error } = await supabase
        .from('outbound_campaigns')
        .insert({
            user_id: userId,
            name: campaignData.name,
            description: campaignData.description,
            campaign_type: campaignData.campaignType || 'general',
            assistant_id: campaignData.assistantId,
            phone_number_id: campaignData.phoneNumberId,
            start_date: campaignData.startDate,
            end_date: campaignData.endDate,
            call_days: campaignData.callDays || [1, 2, 3, 4, 5],
            call_start_time: campaignData.callStartTime || '09:00',
            call_end_time: campaignData.callEndTime || '20:00',
            timezone: campaignData.timezone || 'America/New_York',
            max_calls_per_hour: campaignData.maxCallsPerHour || 50,
            max_calls_per_day: campaignData.maxCallsPerDay || 500,
            max_concurrent_calls: campaignData.maxConcurrentCalls || 5,
            max_attempts: campaignData.maxAttempts || 3,
            retry_delay_hours: campaignData.retryDelayHours || 4,
            ring_timeout_seconds: campaignData.ringTimeoutSeconds || 30,
            status: 'draft'
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating campaign:', error);
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Update an existing campaign
 */
async function updateCampaign(userId, campaignId, updates) {
    // Build update object, only including provided fields
    const updateData = {
        updated_at: new Date().toISOString()
    };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.campaignType !== undefined) updateData.campaign_type = updates.campaignType;
    if (updates.assistantId !== undefined) updateData.assistant_id = updates.assistantId;
    if (updates.phoneNumberId !== undefined) updateData.phone_number_id = updates.phoneNumberId;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.callDays !== undefined) updateData.call_days = updates.callDays;
    if (updates.callStartTime !== undefined) updateData.call_start_time = updates.callStartTime;
    if (updates.callEndTime !== undefined) updateData.call_end_time = updates.callEndTime;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.maxCallsPerHour !== undefined) updateData.max_calls_per_hour = updates.maxCallsPerHour;
    if (updates.maxCallsPerDay !== undefined) updateData.max_calls_per_day = updates.maxCallsPerDay;
    if (updates.maxConcurrentCalls !== undefined) updateData.max_concurrent_calls = updates.maxConcurrentCalls;
    if (updates.maxAttempts !== undefined) updateData.max_attempts = updates.maxAttempts;
    if (updates.retryDelayHours !== undefined) updateData.retry_delay_hours = updates.retryDelayHours;
    if (updates.ringTimeoutSeconds !== undefined) updateData.ring_timeout_seconds = updates.ringTimeoutSeconds;
    if (updates.status !== undefined) updateData.status = updates.status;
    
    const { data, error } = await supabase
        .from('outbound_campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .eq('user_id', userId)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating campaign:', error);
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Get a single campaign with stats
 */
async function getCampaign(userId, campaignId) {
    const { data, error } = await supabase
        .from('outbound_campaigns')
        .select(`
            *,
            assistant:assistants(id, name),
            phone_number:phone_numbers(id, number, label)
        `)
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();
    
    if (error) {
        console.error('Error fetching campaign:', error);
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * List all campaigns for a user
 */
async function listCampaigns(userId, options = {}) {
    let query = supabase
        .from('outbound_campaigns')
        .select(`
            *,
            assistant:assistants(id, name),
            phone_number:phone_numbers(id, number, label)
        `)
        .eq('user_id', userId);
    
    // Filter by status if provided
    if (options.status) {
        query = query.eq('status', options.status);
    }
    
    // Filter by campaign type if provided
    if (options.campaignType) {
        query = query.eq('campaign_type', options.campaignType);
    }
    
    // Order by most recent
    query = query.order('created_at', { ascending: false });
    
    // Pagination
    if (options.limit) {
        query = query.limit(options.limit);
    }
    if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error listing campaigns:', error);
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Delete a campaign and all related data
 */
async function deleteCampaign(userId, campaignId) {
    // Leads and call logs will be cascade deleted
    const { error } = await supabase
        .from('outbound_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error deleting campaign:', error);
        throw new Error(error.message);
    }
    
    return { success: true };
}

/**
 * Start a campaign - changes status to active
 */
async function startCampaign(userId, campaignId) {
    // First check if campaign has leads
    const { data: leadCount } = await supabase
        .from('campaign_leads')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);
    
    if (!leadCount || leadCount.length === 0) {
        throw new Error('Cannot start campaign with no leads');
    }
    
    // Check if campaign has an assistant assigned
    const { data: campaign } = await supabase
        .from('outbound_campaigns')
        .select('assistant_id, phone_number_id')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();
    
    if (!campaign?.assistant_id) {
        throw new Error('Campaign must have an assistant assigned');
    }
    
    if (!campaign?.phone_number_id) {
        throw new Error('Campaign must have a phone number assigned');
    }
    
    // Update status to active
    const { data, error } = await supabase
        .from('outbound_campaigns')
        .update({
            status: 'active',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('user_id', userId)
        .select()
        .single();
    
    if (error) {
        console.error('Error starting campaign:', error);
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Pause a campaign
 */
async function pauseCampaign(userId, campaignId) {
    const { data, error } = await supabase
        .from('outbound_campaigns')
        .update({
            status: 'paused',
            updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('user_id', userId)
        .select()
        .single();
    
    if (error) {
        console.error('Error pausing campaign:', error);
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Resume a paused campaign
 */
async function resumeCampaign(userId, campaignId) {
    const { data, error } = await supabase
        .from('outbound_campaigns')
        .update({
            status: 'active',
            updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('user_id', userId)
        .eq('status', 'paused')
        .select()
        .single();
    
    if (error) {
        console.error('Error resuming campaign:', error);
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Complete a campaign
 */
async function completeCampaign(userId, campaignId) {
    const { data, error } = await supabase
        .from('outbound_campaigns')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('user_id', userId)
        .select()
        .single();
    
    if (error) {
        console.error('Error completing campaign:', error);
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Get campaign statistics
 */
async function getCampaignStats(userId, campaignId) {
    const { data: campaign, error } = await supabase
        .from('outbound_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();
    
    if (error) throw new Error(error.message);
    
    // Get lead breakdown
    const { data: leads } = await supabase
        .from('campaign_leads')
        .select('status, disposition, lead_score')
        .eq('campaign_id', campaignId);
    
    // Calculate conversion metrics
    const stats = {
        // Basic stats from campaign
        totalLeads: campaign.total_leads,
        leadsPending: campaign.leads_pending,
        leadsCompleted: campaign.leads_completed,
        callsMade: campaign.calls_made,
        callsAnswered: campaign.calls_answered,
        callsVoicemail: campaign.calls_voicemail,
        callsNoAnswer: campaign.calls_no_answer,
        callsFailed: campaign.calls_failed,
        appointmentsBooked: campaign.appointments_booked,
        totalTalkTimeSeconds: campaign.total_talk_time_seconds,
        
        // Calculated rates
        answerRate: campaign.calls_made > 0 
            ? ((campaign.calls_answered / campaign.calls_made) * 100).toFixed(1) 
            : 0,
        appointmentRate: campaign.calls_answered > 0 
            ? ((campaign.appointments_booked / campaign.calls_answered) * 100).toFixed(1) 
            : 0,
        
        // Lead disposition breakdown
        dispositionBreakdown: leads?.reduce((acc, lead) => {
            const disp = lead.disposition || 'unknown';
            acc[disp] = (acc[disp] || 0) + 1;
            return acc;
        }, {}) || {},
        
        // Average lead score
        averageLeadScore: leads?.length > 0
            ? (leads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / leads.length).toFixed(0)
            : 0
    };
    
    return stats;
}

module.exports = {
    createCampaign,
    updateCampaign,
    getCampaign,
    listCampaigns,
    deleteCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    completeCampaign,
    getCampaignStats
};
