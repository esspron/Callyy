/**
 * State-Specific TCPA Rules Service
 * 
 * Handles state-by-state TCPA variations and additional requirements.
 * Some states have stricter rules than federal TCPA.
 */

const { supabase } = require('../../config');

// Two-party consent states (both parties must consent to recording)
const TWO_PARTY_CONSENT_STATES = [
  'CA', 'CT', 'FL', 'IL', 'MD', 'MA', 'MI', 'MT', 'NV', 'NH', 'PA', 'WA'
];

// States with additional telemarketing restrictions
const STRICT_TELEMARKETING_STATES = ['CA', 'FL', 'NY', 'IL', 'CT', 'MA', 'NJ'];

/**
 * Check state-specific rules for a call
 * 
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number being called
 * @param {string} stateCode - 2-letter state code
 * @returns {Promise<Object>} State rules check result
 */
async function checkStateRules(userId, phoneNumber, stateCode) {
  try {
    const upperState = stateCode.toUpperCase();
    
    // Get state rules from database
    const { data: rules, error } = await supabase
      .from('tcpa_state_rules')
      .select('*')
      .eq('state_code', upperState)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    const result = {
      passed: true,
      stateCode: upperState,
      rules_applied: [],
      warnings: [],
      checkedAt: new Date().toISOString()
    };
    
    // Check two-party consent requirement
    if (TWO_PARTY_CONSENT_STATES.includes(upperState)) {
      result.rules_applied.push('two_party_consent');
      result.warnings.push(`${upperState} requires two-party consent for call recording`);
      result.requiresRecordingDisclosure = true;
    }
    
    // Check if state has specific max calls per day
    if (rules?.max_calls_per_day) {
      const callCount = await getCallCountToday(userId, phoneNumber);
      if (callCount >= rules.max_calls_per_day) {
        result.passed = false;
        result.reason = `Maximum daily calls (${rules.max_calls_per_day}) reached for this number in ${upperState}`;
        return result;
      }
      result.rules_applied.push('max_calls_per_day');
    }
    
    // Check if state has specific max calls per week
    if (rules?.max_calls_per_week) {
      const weekCallCount = await getCallCountThisWeek(userId, phoneNumber);
      if (weekCallCount >= rules.max_calls_per_week) {
        result.passed = false;
        result.reason = `Maximum weekly calls (${rules.max_calls_per_week}) reached for this number in ${upperState}`;
        return result;
      }
      result.rules_applied.push('max_calls_per_week');
    }
    
    // Check if state requires written consent
    if (rules?.requires_written_consent) {
      const hasWrittenConsent = await checkWrittenConsent(userId, phoneNumber);
      if (!hasWrittenConsent) {
        result.passed = false;
        result.reason = `${upperState} requires written consent for this type of call`;
        return result;
      }
      result.rules_applied.push('written_consent_required');
    }
    
    // Add any additional state rules from database
    if (rules?.additional_rules) {
      result.additionalRules = rules.additional_rules;
    }
    
    // Add state notes as warning
    if (rules?.notes) {
      result.warnings.push(rules.notes);
    }
    
    return result;
    
  } catch (error) {
    console.error('State rules check error:', error);
    return {
      passed: true, // Don't block on state rule check failure
      stateCode,
      error: error.message,
      warning: 'State rules check failed, proceeding with federal rules only'
    };
  }
}

/**
 * Get all state rules
 * 
 * @returns {Promise<Array>} All state rules
 */
async function getAllStateRules() {
  const { data, error } = await supabase
    .from('tcpa_state_rules')
    .select('*')
    .eq('is_active', true)
    .order('state_code');
  
  if (error) throw error;
  
  return data || [];
}

/**
 * Get rules for a specific state
 * 
 * @param {string} stateCode - 2-letter state code
 * @returns {Promise<Object>} State rules
 */
async function getStateRules(stateCode) {
  const { data, error } = await supabase
    .from('tcpa_state_rules')
    .select('*')
    .eq('state_code', stateCode.toUpperCase())
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data || getDefaultStateRules(stateCode);
}

/**
 * Get default rules for states not in database
 */
function getDefaultStateRules(stateCode) {
  return {
    state_code: stateCode.toUpperCase(),
    state_name: 'Unknown',
    call_start_time: '08:00',
    call_end_time: '21:00',
    requires_written_consent: false,
    requires_call_recording_disclosure: TWO_PARTY_CONSENT_STATES.includes(stateCode.toUpperCase()),
    max_calls_per_day: null,
    max_calls_per_week: null,
    notes: 'Using federal TCPA defaults',
    is_default: true
  };
}

/**
 * Check if state requires two-party consent for recordings
 * 
 * @param {string} stateCode - 2-letter state code
 * @returns {boolean} True if two-party consent required
 */
function requiresTwoPartyConsent(stateCode) {
  return TWO_PARTY_CONSENT_STATES.includes(stateCode.toUpperCase());
}

/**
 * Check if state has strict telemarketing laws
 * 
 * @param {string} stateCode - 2-letter state code
 * @returns {boolean} True if state is strict
 */
function isStrictTelemarketingState(stateCode) {
  return STRICT_TELEMARKETING_STATES.includes(stateCode.toUpperCase());
}

/**
 * Get call count to a number today
 */
async function getCallCountToday(userId, phoneNumber) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count, error } = await supabase
    .from('tcpa_call_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .gte('call_initiated_at', today.toISOString());
  
  if (error) {
    console.error('Error getting daily call count:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Get call count to a number this week
 */
async function getCallCountThisWeek(userId, phoneNumber) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const { count, error } = await supabase
    .from('tcpa_call_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .gte('call_initiated_at', weekAgo.toISOString());
  
  if (error) {
    console.error('Error getting weekly call count:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Check if there's written consent for a phone number
 */
async function checkWrittenConsent(userId, phoneNumber) {
  const { data, error } = await supabase
    .from('tcpa_consent')
    .select('id')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .eq('consent_type', 'written')
    .eq('is_active', true)
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error checking written consent:', error);
    return false;
  }
  
  return !!data;
}

/**
 * Get recording disclosure requirement for a state
 * 
 * @param {string} stateCode - 2-letter state code
 * @returns {Object} Disclosure requirements
 */
function getRecordingDisclosureRequirement(stateCode) {
  const upperState = stateCode.toUpperCase();
  const requiresTwoParty = TWO_PARTY_CONSENT_STATES.includes(upperState);
  
  return {
    required: true, // Always required for TCPA compliance
    twoPartyConsent: requiresTwoParty,
    disclosureText: requiresTwoParty
      ? 'This call is being recorded. By continuing, you consent to this recording.'
      : 'This call may be recorded for quality and training purposes.',
    timing: 'at_start' // Must be at start of call
  };
}

/**
 * Get state from phone number area code
 * (Simplified mapping - production should use more comprehensive lookup)
 */
function guessStateFromAreaCode(areaCode) {
  const areaCodeToState = {
    // Sample mapping - expand as needed
    '212': 'NY', '718': 'NY', '917': 'NY', '646': 'NY',
    '213': 'CA', '310': 'CA', '415': 'CA', '408': 'CA', '510': 'CA',
    '312': 'IL', '773': 'IL', '847': 'IL',
    '305': 'FL', '786': 'FL', '954': 'FL', '561': 'FL',
    '214': 'TX', '713': 'TX', '281': 'TX', '832': 'TX', '972': 'TX',
    '404': 'GA', '770': 'GA', '678': 'GA',
    '215': 'PA', '267': 'PA', '412': 'PA',
    '602': 'AZ', '480': 'AZ', '623': 'AZ',
    '303': 'CO', '720': 'CO', '719': 'CO',
    '206': 'WA', '425': 'WA', '253': 'WA',
    '617': 'MA', '508': 'MA', '781': 'MA'
  };
  
  return areaCodeToState[areaCode] || null;
}

module.exports = {
  checkStateRules,
  getAllStateRules,
  getStateRules,
  getDefaultStateRules,
  requiresTwoPartyConsent,
  isStrictTelemarketingState,
  getRecordingDisclosureRequirement,
  guessStateFromAreaCode,
  TWO_PARTY_CONSENT_STATES,
  STRICT_TELEMARKETING_STATES
};
