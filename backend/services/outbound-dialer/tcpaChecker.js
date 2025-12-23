// ============================================
// TCPA COMPLIANCE CHECKER
// Basic TCPA compliance checks before placing calls
// ============================================
const { supabase } = require('../../config');

/**
 * Run all TCPA compliance checks for a phone number
 */
async function checkCompliance(userId, phoneNumber, campaignTimezone = 'America/New_York') {
    const checks = {
        timeCheck: false,
        dncCheck: false,
        consentCheck: false
    };
    
    let compliant = true;
    let reason = null;
    let timezone = campaignTimezone;
    let localTime = null;
    
    // 1. Time-of-day check (8am-9pm recipient's local time)
    // For now, we use campaign timezone. In production, use phone number geo-lookup
    const timeResult = checkCallingTime(campaignTimezone);
    checks.timeCheck = timeResult.allowed;
    localTime = timeResult.localTime;
    
    if (!timeResult.allowed) {
        compliant = false;
        reason = `Cannot call at ${timeResult.localTime} (allowed 8am-9pm)`;
    }
    
    // 2. DNC list check
    if (compliant) {
        const dncResult = await checkDNCList(userId, phoneNumber);
        checks.dncCheck = !dncResult.isOnDNC;
        
        if (dncResult.isOnDNC) {
            compliant = false;
            reason = `Number on DNC list: ${dncResult.reason || 'User opted out'}`;
        }
    }
    
    // 3. Consent check (if required by user settings)
    if (compliant) {
        const { data: settings } = await supabase
            .from('user_dialer_settings')
            .select('require_consent')
            .eq('user_id', userId)
            .single();
        
        if (settings?.require_consent) {
            const consentResult = await checkConsent(userId, phoneNumber);
            checks.consentCheck = consentResult.hasConsent;
            
            if (!consentResult.hasConsent) {
                compliant = false;
                reason = 'No valid consent on file';
            }
        } else {
            checks.consentCheck = true; // Skip if not required
        }
    }
    
    return {
        compliant,
        reason,
        checks,
        timezone,
        localTime
    };
}

/**
 * Check if current time is within TCPA calling hours (8am-9pm)
 */
function checkCallingTime(timezone) {
    const now = new Date();
    
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const hour = parseInt(parts.find(p => p.type === 'hour').value);
        const minute = parseInt(parts.find(p => p.type === 'minute').value);
        const localTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // TCPA allows calls 8am-9pm local time
        const allowed = hour >= 8 && hour < 21;
        
        return {
            allowed,
            localTime,
            hour,
            minute
        };
    } catch (err) {
        console.error('Error checking calling time:', err);
        // Default to not allowed if timezone is invalid
        return {
            allowed: false,
            localTime: 'unknown',
            hour: 0,
            minute: 0
        };
    }
}

/**
 * Check if phone number is on user's DNC list
 */
async function checkDNCList(userId, phoneNumber) {
    // Normalize phone number
    const normalized = normalizePhoneNumber(phoneNumber);
    
    const { data, error } = await supabase
        .from('dnc_list')
        .select('id, reason')
        .eq('user_id', userId)
        .eq('phone_number', normalized)
        .maybeSingle();
    
    if (error) {
        console.error('Error checking DNC list:', error);
        // Fail open - allow call if DNC check fails
        return { isOnDNC: false };
    }
    
    return {
        isOnDNC: !!data,
        reason: data?.reason
    };
}

/**
 * Check if valid consent exists for phone number
 */
async function checkConsent(userId, phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    
    const { data, error } = await supabase
        .from('tcpa_consent_records')
        .select('consent_type, consent_date')
        .eq('user_id', userId)
        .eq('phone_number', normalized)
        .eq('is_valid', true)
        .is('revoked_at', null)
        .order('consent_date', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (error) {
        console.error('Error checking consent:', error);
        // Fail closed - require consent if check fails
        return { hasConsent: false };
    }
    
    return {
        hasConsent: !!data,
        consentType: data?.consent_type,
        consentDate: data?.consent_date
    };
}

/**
 * Add phone number to DNC list
 */
async function addToDNC(userId, phoneNumber, reason = 'manual', source = 'manual') {
    const normalized = normalizePhoneNumber(phoneNumber);
    
    const { data, error } = await supabase
        .from('dnc_list')
        .upsert({
            user_id: userId,
            phone_number: normalized,
            reason,
            source
        }, {
            onConflict: 'user_id,phone_number'
        })
        .select()
        .single();
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Remove phone number from DNC list
 */
async function removeFromDNC(userId, phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    
    const { error } = await supabase
        .from('dnc_list')
        .delete()
        .eq('user_id', userId)
        .eq('phone_number', normalized);
    
    if (error) {
        throw new Error(error.message);
    }
    
    return { success: true };
}

/**
 * Record consent for a phone number
 */
async function recordConsent(userId, phoneNumber, consentData) {
    const normalized = normalizePhoneNumber(phoneNumber);
    
    const { data, error } = await supabase
        .from('tcpa_consent_records')
        .upsert({
            user_id: userId,
            phone_number: normalized,
            consent_type: consentData.type || 'implied',
            consent_source: consentData.source || 'manual_entry',
            consent_date: consentData.date || new Date().toISOString(),
            consent_proof_url: consentData.proofUrl,
            consent_ip_address: consentData.ipAddress,
            is_valid: true,
            metadata: consentData.metadata || {}
        }, {
            onConflict: 'user_id,phone_number'
        })
        .select()
        .single();
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data;
}

/**
 * Revoke consent for a phone number
 */
async function revokeConsent(userId, phoneNumber, reason = 'User requested') {
    const normalized = normalizePhoneNumber(phoneNumber);
    
    const { data, error } = await supabase
        .from('tcpa_consent_records')
        .update({
            is_valid: false,
            revoked_at: new Date().toISOString(),
            revoked_reason: reason
        })
        .eq('user_id', userId)
        .eq('phone_number', normalized)
        .select()
        .single();
    
    if (error) {
        throw new Error(error.message);
    }
    
    // Also add to DNC
    await addToDNC(userId, phoneNumber, 'Consent revoked', 'opt_out');
    
    return data;
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
        // Assume US number if 10 digits
        if (normalized.length === 10) {
            normalized = '+1' + normalized;
        } else if (normalized.length === 11 && normalized.startsWith('1')) {
            normalized = '+' + normalized;
        } else {
            normalized = '+' + normalized;
        }
    }
    
    return normalized;
}

/**
 * Get DNC list for user
 */
async function getDNCList(userId, options = {}) {
    let query = supabase
        .from('dnc_list')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });
    
    if (options.limit) {
        query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data;
}

module.exports = {
    checkCompliance,
    checkCallingTime,
    checkDNCList,
    checkConsent,
    addToDNC,
    removeFromDNC,
    recordConsent,
    revokeConsent,
    normalizePhoneNumber,
    getDNCList
};
