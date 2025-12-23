// ============================================
// LEAD PROCESSOR SERVICE
// Handles CSV import, lead CRUD, and bulk operations
// ============================================
const { supabase } = require('../../config');
const { normalizePhoneNumber } = require('./tcpaChecker');

/**
 * Process CSV data and import leads to a campaign
 */
async function importLeadsFromCSV(userId, campaignId, csvData, mappings) {
    const results = {
        total: csvData.length,
        imported: 0,
        skipped: 0,
        errors: []
    };
    
    // Generate batch ID for this import
    const batchId = `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Process in batches of 100
    const batchSize = 100;
    
    for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize);
        const leadsToInsert = [];
        
        for (const row of batch) {
            try {
                // Map CSV columns to lead fields
                const lead = mapRowToLead(row, mappings);
                
                // Validate required fields
                if (!lead.phone_number) {
                    results.skipped++;
                    results.errors.push({
                        row: i + batch.indexOf(row) + 1,
                        error: 'Missing phone number'
                    });
                    continue;
                }
                
                // Normalize phone number
                lead.phone_number = normalizePhoneNumber(lead.phone_number);
                
                // Add metadata
                lead.campaign_id = campaignId;
                lead.user_id = userId;
                lead.import_batch_id = batchId;
                lead.lead_source = 'csv_import';
                lead.status = 'pending';
                
                leadsToInsert.push(lead);
            } catch (err) {
                results.errors.push({
                    row: i + batch.indexOf(row) + 1,
                    error: err.message
                });
            }
        }
        
        // Bulk insert the batch
        if (leadsToInsert.length > 0) {
            const { data, error } = await supabase
                .from('campaign_leads')
                .insert(leadsToInsert)
                .select('id');
            
            if (error) {
                console.error('Batch insert error:', error);
                results.errors.push({
                    batch: Math.floor(i / batchSize) + 1,
                    error: error.message
                });
            } else {
                results.imported += data.length;
            }
        }
    }
    
    // Update campaign total leads count
    await updateCampaignLeadCount(campaignId);
    
    return {
        ...results,
        batchId
    };
}

/**
 * Map a CSV row to lead fields based on user mappings
 */
function mapRowToLead(row, mappings) {
    const lead = {
        custom_fields: {}
    };
    
    // Standard field mappings
    const standardFields = {
        phone_number: ['phone', 'phone_number', 'phonenumber', 'mobile', 'cell', 'telephone'],
        first_name: ['first_name', 'firstname', 'first', 'fname'],
        last_name: ['last_name', 'lastname', 'last', 'lname'],
        email: ['email', 'email_address', 'emailaddress'],
        company: ['company', 'company_name', 'business', 'organization'],
        property_address: ['address', 'property_address', 'street', 'street_address'],
        property_city: ['city', 'property_city'],
        property_state: ['state', 'property_state'],
        property_zip: ['zip', 'zipcode', 'zip_code', 'property_zip', 'postal_code'],
        listing_price: ['price', 'listing_price', 'list_price', 'asking_price'],
        days_on_market: ['dom', 'days_on_market', 'days_listed'],
        notes: ['notes', 'comments', 'description']
    };
    
    // Process each column in the row
    for (const [csvColumn, value] of Object.entries(row)) {
        if (!value || value.toString().trim() === '') continue;
        
        const normalizedColumn = csvColumn.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Check if user provided explicit mapping
        if (mappings && mappings[csvColumn]) {
            const targetField = mappings[csvColumn];
            if (targetField === 'skip') continue;
            
            if (standardFields[targetField]) {
                lead[targetField] = value.toString().trim();
            } else {
                lead.custom_fields[targetField] = value.toString().trim();
            }
            continue;
        }
        
        // Try to auto-map based on column name
        let mapped = false;
        for (const [field, aliases] of Object.entries(standardFields)) {
            if (aliases.includes(normalizedColumn)) {
                lead[field] = value.toString().trim();
                mapped = true;
                break;
            }
        }
        
        // Store unmapped fields in custom_fields
        if (!mapped) {
            lead.custom_fields[csvColumn] = value.toString().trim();
        }
    }
    
    // Parse numeric fields
    if (lead.listing_price) {
        lead.listing_price = parseFloat(lead.listing_price.replace(/[^0-9.]/g, '')) || null;
    }
    if (lead.days_on_market) {
        lead.days_on_market = parseInt(lead.days_on_market) || null;
    }
    
    return lead;
}

/**
 * Create a single lead
 */
async function createLead(userId, campaignId, leadData) {
    const lead = {
        campaign_id: campaignId,
        user_id: userId,
        phone_number: normalizePhoneNumber(leadData.phoneNumber),
        first_name: leadData.firstName,
        last_name: leadData.lastName,
        email: leadData.email,
        company: leadData.company,
        property_address: leadData.propertyAddress,
        property_city: leadData.propertyCity,
        property_state: leadData.propertyState,
        property_zip: leadData.propertyZip,
        lead_source: leadData.leadSource || 'manual',
        days_on_market: leadData.daysOnMarket,
        listing_price: leadData.listingPrice,
        notes: leadData.notes,
        custom_fields: leadData.customFields || {},
        priority: leadData.priority || 0,
        status: 'pending'
    };
    
    const { data, error } = await supabase
        .from('campaign_leads')
        .insert(lead)
        .select()
        .single();
    
    if (error) {
        throw new Error(error.message);
    }
    
    await updateCampaignLeadCount(campaignId);
    
    return data;
}

/**
 * Update a lead
 */
async function updateLead(userId, leadId, updates) {
    const updateData = {
        updated_at: new Date().toISOString()
    };
    
    if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.phoneNumber !== undefined) updateData.phone_number = normalizePhoneNumber(updates.phoneNumber);
    if (updates.propertyAddress !== undefined) updateData.property_address = updates.propertyAddress;
    if (updates.propertyCity !== undefined) updateData.property_city = updates.propertyCity;
    if (updates.propertyState !== undefined) updateData.property_state = updates.propertyState;
    if (updates.propertyZip !== undefined) updateData.property_zip = updates.propertyZip;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.disposition !== undefined) updateData.disposition = updates.disposition;
    if (updates.leadScore !== undefined) updateData.lead_score = updates.leadScore;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.appointmentDate !== undefined) updateData.appointment_date = updates.appointmentDate;
    if (updates.callbackDate !== undefined) updateData.callback_date = updates.callbackDate;
    if (updates.customFields !== undefined) updateData.custom_fields = updates.customFields;
    
    const { data, error } = await supabase
        .from('campaign_leads')
        .update(updateData)
        .eq('id', leadId)
        .eq('user_id', userId)
        .select()
        .single();
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Delete a lead
 */
async function deleteLead(userId, leadId) {
    // Get campaign ID first for count update
    const { data: lead } = await supabase
        .from('campaign_leads')
        .select('campaign_id')
        .eq('id', leadId)
        .eq('user_id', userId)
        .single();
    
    const { error } = await supabase
        .from('campaign_leads')
        .delete()
        .eq('id', leadId)
        .eq('user_id', userId);
    
    if (error) {
        throw new Error(error.message);
    }
    
    if (lead?.campaign_id) {
        await updateCampaignLeadCount(lead.campaign_id);
    }
    
    return { success: true };
}

/**
 * Get leads for a campaign with filtering/pagination
 */
async function getLeads(userId, campaignId, options = {}) {
    let query = supabase
        .from('campaign_leads')
        .select('*', { count: 'exact' })
        .eq('campaign_id', campaignId)
        .eq('user_id', userId);
    
    // Apply filters
    if (options.status) {
        query = query.eq('status', options.status);
    }
    if (options.disposition) {
        query = query.eq('disposition', options.disposition);
    }
    if (options.search) {
        query = query.or(`phone_number.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
    }
    
    // Sorting
    const sortField = options.sortField || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });
    
    // Pagination
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data, count, error } = await query;
    
    if (error) {
        throw new Error(error.message);
    }
    
    return {
        leads: data,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
    };
}

/**
 * Bulk update leads
 */
async function bulkUpdateLeads(userId, leadIds, updates) {
    const updateData = {
        updated_at: new Date().toISOString()
    };
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.disposition !== undefined) updateData.disposition = updates.disposition;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    
    const { data, error } = await supabase
        .from('campaign_leads')
        .update(updateData)
        .in('id', leadIds)
        .eq('user_id', userId)
        .select();
    
    if (error) {
        throw new Error(error.message);
    }
    
    return { updated: data.length };
}

/**
 * Bulk delete leads
 */
async function bulkDeleteLeads(userId, leadIds) {
    // Get campaign IDs for count updates
    const { data: leads } = await supabase
        .from('campaign_leads')
        .select('campaign_id')
        .in('id', leadIds)
        .eq('user_id', userId);
    
    const { error } = await supabase
        .from('campaign_leads')
        .delete()
        .in('id', leadIds)
        .eq('user_id', userId);
    
    if (error) {
        throw new Error(error.message);
    }
    
    // Update campaign counts
    const campaignIds = [...new Set(leads?.map(l => l.campaign_id) || [])];
    for (const campaignId of campaignIds) {
        await updateCampaignLeadCount(campaignId);
    }
    
    return { deleted: leadIds.length };
}

/**
 * Update campaign lead count
 */
async function updateCampaignLeadCount(campaignId) {
    const { count } = await supabase
        .from('campaign_leads')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);
    
    await supabase
        .from('outbound_campaigns')
        .update({
            total_leads: count || 0,
            updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);
}

/**
 * Get lead call history
 */
async function getLeadCallHistory(userId, leadId) {
    const { data, error } = await supabase
        .from('campaign_call_logs')
        .select('*')
        .eq('lead_id', leadId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data;
}

module.exports = {
    importLeadsFromCSV,
    mapRowToLead,
    createLead,
    updateLead,
    deleteLead,
    getLeads,
    bulkUpdateLeads,
    bulkDeleteLeads,
    getLeadCallHistory
};
