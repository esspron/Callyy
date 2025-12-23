// ============================================
// CALL QUEUE SERVICE
// Redis-based queue for managing outbound calls
// ============================================
const { supabase } = require('../../config');

// In-memory queue fallback (use Redis in production for scaling)
const activeCallsMap = new Map(); // campaignId -> Set of leadIds currently being called
const campaignQueues = new Map(); // campaignId -> Array of leadIds to call

/**
 * Initialize queue for a campaign
 */
async function initializeCampaignQueue(campaignId) {
    // Get all pending leads for the campaign
    const { data: leads, error } = await supabase
        .from('campaign_leads')
        .select('id, priority, next_call_at')
        .eq('campaign_id', campaignId)
        .in('status', ['pending', 'callback'])
        .or('next_call_at.is.null,next_call_at.lte.now()')
        .order('priority', { ascending: false })
        .order('next_call_at', { ascending: true, nullsFirst: true });
    
    if (error) {
        console.error('Error initializing queue:', error);
        throw new Error(error.message);
    }
    
    // Initialize the queue
    campaignQueues.set(campaignId, leads.map(l => l.id));
    activeCallsMap.set(campaignId, new Set());
    
    console.log(`Queue initialized for campaign ${campaignId}: ${leads.length} leads`);
    
    return leads.length;
}

/**
 * Get next lead from queue
 */
async function getNextLead(campaignId) {
    const queue = campaignQueues.get(campaignId);
    const activeCalls = activeCallsMap.get(campaignId);
    
    if (!queue || queue.length === 0) {
        return null;
    }
    
    // Get the first lead that's not currently being called
    for (let i = 0; i < queue.length; i++) {
        const leadId = queue[i];
        if (!activeCalls.has(leadId)) {
            // Mark as active
            activeCalls.add(leadId);
            
            // Get lead details
            const { data: lead, error } = await supabase
                .from('campaign_leads')
                .select('*')
                .eq('id', leadId)
                .single();
            
            if (error || !lead) {
                // Remove from queue if not found
                queue.splice(i, 1);
                activeCalls.delete(leadId);
                continue;
            }
            
            // Update lead status to queued
            await supabase
                .from('campaign_leads')
                .update({ status: 'queued', updated_at: new Date().toISOString() })
                .eq('id', leadId);
            
            return lead;
        }
    }
    
    return null;
}

/**
 * Mark lead as calling
 */
async function markLeadCalling(campaignId, leadId) {
    await supabase
        .from('campaign_leads')
        .update({ 
            status: 'calling',
            updated_at: new Date().toISOString()
        })
        .eq('id', leadId);
}

/**
 * Complete lead call
 */
async function completeLeadCall(campaignId, leadId, result) {
    const queue = campaignQueues.get(campaignId);
    const activeCalls = activeCallsMap.get(campaignId);
    
    // Remove from active calls
    if (activeCalls) {
        activeCalls.delete(leadId);
    }
    
    // Remove from queue
    if (queue) {
        const index = queue.indexOf(leadId);
        if (index > -1) {
            queue.splice(index, 1);
        }
    }
    
    // Update lead based on result
    const updateData = {
        call_attempts: supabase.sql`call_attempts + 1`,
        last_call_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    if (result.outcome) updateData.outcome = result.outcome;
    if (result.disposition) updateData.disposition = result.disposition;
    if (result.notes) updateData.notes = result.notes;
    if (result.leadScore !== undefined) updateData.lead_score = result.leadScore;
    if (result.appointmentDate) updateData.appointment_date = result.appointmentDate;
    
    // Determine status based on outcome
    if (result.outcome === 'answered' || result.disposition === 'dnc' || result.disposition === 'not_interested') {
        updateData.status = 'completed';
    } else if (result.disposition === 'callback') {
        updateData.status = 'callback';
        updateData.next_call_at = result.callbackDate || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    } else if (result.shouldRetry) {
        // Check if max attempts reached
        const { data: lead } = await supabase
            .from('campaign_leads')
            .select('call_attempts')
            .eq('id', leadId)
            .single();
        
        const { data: campaign } = await supabase
            .from('outbound_campaigns')
            .select('max_attempts, retry_delay_hours')
            .eq('id', campaignId)
            .single();
        
        if (lead && campaign && lead.call_attempts < campaign.max_attempts) {
            updateData.status = 'pending';
            updateData.next_call_at = new Date(Date.now() + (campaign.retry_delay_hours || 4) * 60 * 60 * 1000).toISOString();
        } else {
            updateData.status = 'completed';
        }
    } else {
        updateData.status = 'completed';
    }
    
    await supabase
        .from('campaign_leads')
        .update(updateData)
        .eq('id', leadId);
    
    // Update campaign stats
    await updateCampaignCallStats(campaignId, result);
}

/**
 * Update campaign call statistics
 */
async function updateCampaignCallStats(campaignId, result) {
    const updates = {
        calls_made: supabase.sql`calls_made + 1`,
        updated_at: new Date().toISOString()
    };
    
    if (result.outcome === 'answered') {
        updates.calls_answered = supabase.sql`calls_answered + 1`;
    } else if (result.outcome === 'voicemail') {
        updates.calls_voicemail = supabase.sql`calls_voicemail + 1`;
    } else if (result.outcome === 'no_answer') {
        updates.calls_no_answer = supabase.sql`calls_no_answer + 1`;
    } else if (result.outcome === 'failed') {
        updates.calls_failed = supabase.sql`calls_failed + 1`;
    }
    
    if (result.appointmentBooked) {
        updates.appointments_booked = supabase.sql`appointments_booked + 1`;
    }
    
    if (result.duration) {
        updates.total_talk_time_seconds = supabase.sql`total_talk_time_seconds + ${result.duration}`;
    }
    
    await supabase
        .from('outbound_campaigns')
        .update(updates)
        .eq('id', campaignId);
}

/**
 * Fail a lead call
 */
async function failLeadCall(campaignId, leadId, error) {
    await completeLeadCall(campaignId, leadId, {
        outcome: 'failed',
        notes: error.message || 'Call failed',
        shouldRetry: true
    });
}

/**
 * Get queue status
 */
function getQueueStatus(campaignId) {
    const queue = campaignQueues.get(campaignId);
    const activeCalls = activeCallsMap.get(campaignId);
    
    return {
        queueLength: queue?.length || 0,
        activeCalls: activeCalls?.size || 0,
        isInitialized: campaignQueues.has(campaignId)
    };
}

/**
 * Get active call count
 */
function getActiveCallCount(campaignId) {
    const activeCalls = activeCallsMap.get(campaignId);
    return activeCalls?.size || 0;
}

/**
 * Clear campaign queue (when stopping/completing)
 */
function clearCampaignQueue(campaignId) {
    campaignQueues.delete(campaignId);
    activeCallsMap.delete(campaignId);
}

/**
 * Add lead back to queue (for retries)
 */
function requeueLead(campaignId, leadId, priority = 0) {
    let queue = campaignQueues.get(campaignId);
    if (!queue) {
        queue = [];
        campaignQueues.set(campaignId, queue);
    }
    
    // Add at appropriate position based on priority
    if (priority > 0) {
        queue.unshift(leadId); // High priority - front of queue
    } else {
        queue.push(leadId); // Normal - back of queue
    }
}

module.exports = {
    initializeCampaignQueue,
    getNextLead,
    markLeadCalling,
    completeLeadCall,
    failLeadCall,
    getQueueStatus,
    getActiveCallCount,
    clearCampaignQueue,
    requeueLead
};
