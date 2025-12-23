/**
 * TCPA Compliance Module - Main Service
 * 
 * Provides comprehensive TCPA compliance checking for outbound calls:
 * - Time-of-day restrictions (8am-9pm recipient's local time)
 * - DNC (Do Not Call) list management
 * - Consent verification
 * - State-specific rules
 * - Audit trail logging
 */

const { supabase } = require('../../config');
const timeRestrictions = require('./timeRestrictions');
const dncRegistry = require('./dncRegistry');
const consentManager = require('./consentManager');
const stateRules = require('./stateRules');

/**
 * Perform full TCPA compliance check before making a call
 * 
 * @param {Object} params
 * @param {string} params.userId - User initiating the call
 * @param {string} params.phoneNumber - Phone number to call (E.164 format)
 * @param {string} params.recipientTimezone - IANA timezone (e.g., 'America/New_York')
 * @param {string} [params.stateCode] - 2-letter state code (optional, for state rules)
 * @param {string} [params.campaignId] - Campaign ID if from outbound campaign
 * @param {boolean} [params.requireConsent=true] - Whether to require consent
 * @returns {Promise<Object>} Compliance result with pass/fail and details
 */
async function checkCompliance({
  userId,
  phoneNumber,
  recipientTimezone,
  stateCode = null,
  campaignId = null,
  requireConsent = true
}) {
  const result = {
    compliant: true,
    blocked: false,
    checks: {},
    failureReason: null,
    timestamp: new Date().toISOString()
  };

  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // 1. TIME RESTRICTION CHECK
    const timeCheck = await timeRestrictions.checkCallTime(recipientTimezone, stateCode);
    result.checks.time_check = timeCheck;
    
    if (!timeCheck.passed) {
      result.compliant = false;
      result.blocked = true;
      result.failureReason = `Call outside allowed hours. Local time: ${timeCheck.localTime}. Allowed: ${timeCheck.allowedStart}-${timeCheck.allowedEnd}`;
      
      // Log the blocked call
      await logComplianceCheck(userId, normalizedPhone, result, campaignId);
      return result;
    }

    // 2. DNC LIST CHECK
    const dncCheck = await dncRegistry.checkDNC(userId, normalizedPhone);
    result.checks.dnc_check = dncCheck;
    
    if (!dncCheck.passed) {
      result.compliant = false;
      result.blocked = true;
      result.failureReason = `Phone number is on DNC list. Reason: ${dncCheck.reason}`;
      
      await logComplianceCheck(userId, normalizedPhone, result, campaignId);
      return result;
    }

    // 3. CONSENT CHECK (if required)
    if (requireConsent) {
      const consentCheck = await consentManager.checkConsent(userId, normalizedPhone);
      result.checks.consent_check = consentCheck;
      
      if (!consentCheck.passed) {
        result.compliant = false;
        result.blocked = true;
        result.failureReason = 'No active consent on file for this phone number';
        
        await logComplianceCheck(userId, normalizedPhone, result, campaignId);
        return result;
      }
    } else {
      result.checks.consent_check = { passed: true, skipped: true, reason: 'Consent not required for this call type' };
    }

    // 4. STATE-SPECIFIC RULES CHECK
    if (stateCode) {
      const stateCheck = await stateRules.checkStateRules(userId, normalizedPhone, stateCode);
      result.checks.state_rules = stateCheck;
      
      if (!stateCheck.passed) {
        result.compliant = false;
        result.blocked = true;
        result.failureReason = `State-specific rule violation: ${stateCheck.reason}`;
        
        await logComplianceCheck(userId, normalizedPhone, result, campaignId);
        return result;
      }
    } else {
      result.checks.state_rules = { passed: true, skipped: true, reason: 'No state code provided' };
    }

    // All checks passed
    await logComplianceCheck(userId, normalizedPhone, result, campaignId);
    return result;

  } catch (error) {
    console.error('TCPA compliance check error:', error);
    result.compliant = false;
    result.blocked = true;
    result.failureReason = `Compliance check error: ${error.message}`;
    result.checks.error = { passed: false, error: error.message };
    
    return result;
  }
}

/**
 * Log compliance check to audit trail
 */
async function logComplianceCheck(userId, phoneNumber, result, campaignId = null) {
  try {
    const timeCheck = result.checks.time_check || {};
    
    await supabase.from('tcpa_call_log').insert({
      user_id: userId,
      campaign_id: campaignId,
      phone_number: phoneNumber,
      call_initiated_at: new Date().toISOString(),
      recipient_timezone: timeCheck.timezone || 'America/New_York',
      recipient_local_time: timeCheck.localTime || '00:00',
      tcpa_compliant: result.compliant,
      compliance_checks: result.checks,
      failure_reason: result.failureReason,
      blocked: result.blocked
    });
  } catch (error) {
    console.error('Failed to log compliance check:', error);
    // Don't throw - logging failure shouldn't block the call
  }
}

/**
 * Get user's TCPA settings
 */
async function getUserSettings(userId) {
  const { data, error } = await supabase
    .from('tcpa_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is okay
    throw error;
  }

  // Return defaults if no settings exist
  return data || {
    enforce_time_restrictions: true,
    enforce_dnc_check: true,
    require_consent: true,
    default_call_start_time: '09:00',
    default_call_end_time: '20:00',
    default_timezone: 'America/New_York',
    play_recording_disclosure: true,
    recording_disclosure_text: 'This call may be recorded for quality and training purposes.',
    enable_opt_out_prompt: true,
    opt_out_phrase: 'Press 9 to be removed from our call list.',
    auto_dnc_on_opt_out: true
  };
}

/**
 * Update user's TCPA settings
 */
async function updateUserSettings(userId, settings) {
  const { data, error } = await supabase
    .from('tcpa_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get compliance statistics for a user
 */
async function getComplianceStats(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('tcpa_call_log')
    .select('tcpa_compliant, blocked, failure_reason')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const stats = {
    total_checks: data?.length || 0,
    compliant: 0,
    non_compliant: 0,
    blocked: 0,
    failure_reasons: {}
  };

  data?.forEach(log => {
    if (log.tcpa_compliant) {
      stats.compliant++;
    } else {
      stats.non_compliant++;
    }
    if (log.blocked) {
      stats.blocked++;
    }
    if (log.failure_reason) {
      stats.failure_reasons[log.failure_reason] = (stats.failure_reasons[log.failure_reason] || 0) + 1;
    }
  });

  stats.compliance_rate = stats.total_checks > 0 
    ? ((stats.compliant / stats.total_checks) * 100).toFixed(1) 
    : '100.0';

  return stats;
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If starts with +, keep it; otherwise add +1 for US numbers
  if (!normalized.startsWith('+')) {
    // Remove leading 1 if present, then add +1
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
 * Generate TCPA-compliant recording disclosure script
 */
function getRecordingDisclosure(settings) {
  if (!settings.play_recording_disclosure) {
    return null;
  }
  return settings.recording_disclosure_text || 'This call may be recorded for quality and training purposes.';
}

/**
 * Generate opt-out prompt for calls
 */
function getOptOutPrompt(settings) {
  if (!settings.enable_opt_out_prompt) {
    return null;
  }
  return settings.opt_out_phrase || 'Press 9 to be removed from our call list.';
}

module.exports = {
  checkCompliance,
  getUserSettings,
  updateUserSettings,
  getComplianceStats,
  normalizePhoneNumber,
  getRecordingDisclosure,
  getOptOutPrompt,
  // Re-export sub-modules for direct access
  timeRestrictions,
  dncRegistry,
  consentManager,
  stateRules
};
