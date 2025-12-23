/**
 * DNC (Do Not Call) Registry Service
 * 
 * Manages internal DNC list for TCPA compliance.
 * Option A: Internal list only (no National DNC Registry integration yet)
 */

const { supabase } = require('../../config');

/**
 * Check if a phone number is on the user's DNC list
 * 
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number to check (E.164 format)
 * @returns {Promise<Object>} Check result with pass/fail
 */
async function checkDNC(userId, phoneNumber) {
  try {
    const normalizedPhone = normalizePhone(phoneNumber);
    
    const { data, error } = await supabase
      .from('dnc_list')
      .select('id, reason, source, created_at')
      .eq('user_id', userId)
      .eq('phone_number', normalizedPhone)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not "not found" error
      throw error;
    }
    
    if (data) {
      return {
        passed: false,
        onDNC: true,
        dncId: data.id,
        reason: data.reason,
        source: data.source,
        addedAt: data.created_at,
        checkedAt: new Date().toISOString()
      };
    }
    
    return {
      passed: true,
      onDNC: false,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('DNC check error:', error);
    // Fail closed - treat as on DNC if we can't verify
    return {
      passed: false,
      onDNC: true,
      error: error.message,
      reason: 'DNC check failed - blocked for safety'
    };
  }
}

/**
 * Add a phone number to the DNC list
 * 
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number to add
 * @param {Object} options - Additional options
 * @param {string} options.reason - Reason for adding (user_request, opt_out, manual_add, complaint)
 * @param {string} options.source - Source of the request (call_opt_out, sms_opt_out, web_form, manual, import)
 * @param {string} [options.notes] - Additional notes
 * @returns {Promise<Object>} Created DNC record
 */
async function addToDNC(userId, phoneNumber, options = {}) {
  const {
    reason = 'manual_add',
    source = 'manual',
    notes = null
  } = options;
  
  const normalizedPhone = normalizePhone(phoneNumber);
  
  const { data, error } = await supabase
    .from('dnc_list')
    .upsert({
      user_id: userId,
      phone_number: normalizedPhone,
      reason,
      source,
      added_by: 'user',
      notes,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,phone_number'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}

/**
 * Remove a phone number from the DNC list
 * 
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number to remove
 * @returns {Promise<boolean>} True if removed
 */
async function removeFromDNC(userId, phoneNumber) {
  const normalizedPhone = normalizePhone(phoneNumber);
  
  const { error } = await supabase
    .from('dnc_list')
    .delete()
    .eq('user_id', userId)
    .eq('phone_number', normalizedPhone);
  
  if (error) throw error;
  
  return true;
}

/**
 * Get all DNC entries for a user
 * 
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max results
 * @param {number} options.offset - Pagination offset
 * @param {string} options.search - Search term for phone number
 * @returns {Promise<Object>} DNC list with pagination
 */
async function getDNCList(userId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    search = null
  } = options;
  
  let query = supabase
    .from('dnc_list')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (search) {
    query = query.ilike('phone_number', `%${search}%`);
  }
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    entries: data || [],
    total: count || 0,
    limit,
    offset
  };
}

/**
 * Bulk add phone numbers to DNC list
 * 
 * @param {string} userId - User ID
 * @param {Array<string>} phoneNumbers - Array of phone numbers
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result with success/fail counts
 */
async function bulkAddToDNC(userId, phoneNumbers, options = {}) {
  const {
    reason = 'import',
    source = 'import'
  } = options;
  
  const records = phoneNumbers.map(phone => ({
    user_id: userId,
    phone_number: normalizePhone(phone),
    reason,
    source,
    added_by: 'user'
  }));
  
  // Use upsert to handle duplicates gracefully
  const { data, error } = await supabase
    .from('dnc_list')
    .upsert(records, {
      onConflict: 'user_id,phone_number',
      ignoreDuplicates: false
    })
    .select();
  
  if (error) throw error;
  
  return {
    added: data?.length || 0,
    total: phoneNumbers.length,
    records: data
  };
}

/**
 * Bulk check multiple phone numbers against DNC
 * 
 * @param {string} userId - User ID
 * @param {Array<string>} phoneNumbers - Array of phone numbers to check
 * @returns {Promise<Object>} Map of phone numbers to DNC status
 */
async function bulkCheckDNC(userId, phoneNumbers) {
  const normalizedPhones = phoneNumbers.map(normalizePhone);
  
  const { data, error } = await supabase
    .from('dnc_list')
    .select('phone_number, reason, source')
    .eq('user_id', userId)
    .in('phone_number', normalizedPhones);
  
  if (error) throw error;
  
  // Create lookup map
  const dncMap = {};
  (data || []).forEach(entry => {
    dncMap[entry.phone_number] = {
      onDNC: true,
      reason: entry.reason,
      source: entry.source
    };
  });
  
  // Return status for all requested numbers
  const results = {};
  normalizedPhones.forEach((phone, index) => {
    results[phoneNumbers[index]] = dncMap[phone] || { onDNC: false };
  });
  
  return results;
}

/**
 * Get DNC statistics for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} DNC statistics
 */
async function getDNCStats(userId) {
  const { data, error } = await supabase
    .from('dnc_list')
    .select('reason, source')
    .eq('user_id', userId);
  
  if (error) throw error;
  
  const stats = {
    total: data?.length || 0,
    by_reason: {},
    by_source: {}
  };
  
  (data || []).forEach(entry => {
    stats.by_reason[entry.reason] = (stats.by_reason[entry.reason] || 0) + 1;
    stats.by_source[entry.source] = (stats.by_source[entry.source] || 0) + 1;
  });
  
  return stats;
}

/**
 * Handle opt-out request (called during/after a call)
 * Automatically adds to DNC with proper tracking
 * 
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number
 * @param {string} callId - Call ID for tracking
 * @param {string} source - 'voice_opt_out' or 'sms_opt_out'
 */
async function handleOptOut(userId, phoneNumber, callId = null, source = 'voice_opt_out') {
  return await addToDNC(userId, phoneNumber, {
    reason: 'opt_out',
    source,
    notes: callId ? `Opt-out during call: ${callId}` : 'Opt-out requested'
  });
}

/**
 * Normalize phone number for consistent storage/lookup
 */
function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Ensure E.164 format for US numbers
  if (!normalized.startsWith('+')) {
    if (normalized.startsWith('1') && normalized.length === 11) {
      normalized = '+' + normalized;
    } else if (normalized.length === 10) {
      normalized = '+1' + normalized;
    } else {
      normalized = '+' + normalized;
    }
  }
  
  return normalized;
}

/**
 * Export DNC list as CSV data
 */
async function exportDNCList(userId) {
  const { data, error } = await supabase
    .from('dnc_list')
    .select('phone_number, reason, source, notes, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data || [];
}

module.exports = {
  checkDNC,
  addToDNC,
  removeFromDNC,
  getDNCList,
  bulkAddToDNC,
  bulkCheckDNC,
  getDNCStats,
  handleOptOut,
  exportDNCList,
  normalizePhone
};
