/**
 * TCPA Time Restrictions Service
 * 
 * Enforces 8am-9pm calling restrictions in recipient's local time.
 * Handles timezone conversion and state-specific time windows.
 */

const { supabase } = require('../../config');

// Timezone lookup by US area code (common ones)
const AREA_CODE_TIMEZONES = {
  // Eastern Time
  '201': 'America/New_York', '202': 'America/New_York', '203': 'America/New_York',
  '212': 'America/New_York', '215': 'America/New_York', '216': 'America/New_York',
  '301': 'America/New_York', '302': 'America/New_York', '304': 'America/New_York',
  '305': 'America/New_York', '312': 'America/Chicago', '313': 'America/Detroit',
  '315': 'America/New_York', '317': 'America/Indiana/Indianapolis',
  '401': 'America/New_York', '404': 'America/New_York', '407': 'America/New_York',
  '410': 'America/New_York', '412': 'America/New_York', '413': 'America/New_York',
  '414': 'America/Chicago', '415': 'America/Los_Angeles', '416': 'America/Toronto',
  '503': 'America/Los_Angeles', '504': 'America/Chicago', '505': 'America/Denver',
  '508': 'America/New_York', '510': 'America/Los_Angeles', '512': 'America/Chicago',
  '513': 'America/New_York', '516': 'America/New_York', '518': 'America/New_York',
  '602': 'America/Phoenix', '603': 'America/New_York', '609': 'America/New_York',
  '610': 'America/New_York', '612': 'America/Chicago', '614': 'America/New_York',
  '615': 'America/Chicago', '617': 'America/New_York', '619': 'America/Los_Angeles',
  '702': 'America/Los_Angeles', '703': 'America/New_York', '704': 'America/New_York',
  '713': 'America/Chicago', '714': 'America/Los_Angeles', '718': 'America/New_York',
  '719': 'America/Denver', '720': 'America/Denver', '801': 'America/Denver',
  '802': 'America/New_York', '803': 'America/New_York', '804': 'America/New_York',
  '805': 'America/Los_Angeles', '808': 'Pacific/Honolulu', '810': 'America/Detroit',
  '813': 'America/New_York', '814': 'America/New_York', '815': 'America/Chicago',
  '816': 'America/Chicago', '817': 'America/Chicago', '818': 'America/Los_Angeles',
  '901': 'America/Chicago', '903': 'America/Chicago', '904': 'America/New_York',
  '907': 'America/Anchorage', '908': 'America/New_York', '909': 'America/Los_Angeles',
  '910': 'America/New_York', '912': 'America/New_York', '913': 'America/Chicago',
  '914': 'America/New_York', '915': 'America/Denver', '916': 'America/Los_Angeles',
  '917': 'America/New_York', '918': 'America/Chicago', '919': 'America/New_York',
  '920': 'America/Chicago', '925': 'America/Los_Angeles', '949': 'America/Los_Angeles',
  '954': 'America/New_York', '956': 'America/Chicago', '972': 'America/Chicago',
  '973': 'America/New_York'
};

// Default federal TCPA time window
const DEFAULT_START_TIME = '08:00';
const DEFAULT_END_TIME = '21:00';

/**
 * Check if current time in recipient's timezone is within allowed calling hours
 * 
 * @param {string} recipientTimezone - IANA timezone string
 * @param {string} [stateCode] - 2-letter state code for state-specific rules
 * @returns {Promise<Object>} Check result with pass/fail and time details
 */
async function checkCallTime(recipientTimezone, stateCode = null) {
  try {
    // Get current time in recipient's timezone
    const now = new Date();
    const localTime = getLocalTime(now, recipientTimezone);
    
    // Get allowed time window
    let startTime = DEFAULT_START_TIME;
    let endTime = DEFAULT_END_TIME;
    
    // Check for state-specific rules
    if (stateCode) {
      const stateRules = await getStateTimeRules(stateCode);
      if (stateRules) {
        startTime = stateRules.call_start_time || DEFAULT_START_TIME;
        endTime = stateRules.call_end_time || DEFAULT_END_TIME;
      }
    }
    
    // Check if current time is within window
    const passed = isTimeInWindow(localTime, startTime, endTime);
    
    return {
      passed,
      localTime,
      timezone: recipientTimezone,
      allowedStart: startTime,
      allowedEnd: endTime,
      checkedAt: now.toISOString(),
      stateCode: stateCode || null
    };
  } catch (error) {
    console.error('Time restriction check error:', error);
    // Fail closed - block call if we can't verify time
    return {
      passed: false,
      error: error.message,
      localTime: 'unknown',
      timezone: recipientTimezone,
      allowedStart: DEFAULT_START_TIME,
      allowedEnd: DEFAULT_END_TIME
    };
  }
}

/**
 * Get local time string (HH:MM format) in specified timezone
 */
function getLocalTime(date, timezone) {
  try {
    const options = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleTimeString('en-US', options);
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    console.warn(`Invalid timezone: ${timezone}, falling back to America/New_York`);
    return date.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}

/**
 * Check if a time string is within the allowed window
 */
function isTimeInWindow(timeStr, startStr, endStr) {
  const toMinutes = (str) => {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };
  
  const current = toMinutes(timeStr);
  const start = toMinutes(startStr);
  const end = toMinutes(endStr);
  
  return current >= start && current <= end;
}

/**
 * Get state-specific time rules from database
 */
async function getStateTimeRules(stateCode) {
  const { data, error } = await supabase
    .from('tcpa_state_rules')
    .select('call_start_time, call_end_time')
    .eq('state_code', stateCode.toUpperCase())
    .eq('is_active', true)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching state rules:', error);
  }
  
  return data;
}

/**
 * Guess timezone from phone number area code
 * Used as fallback when timezone is not provided
 */
function guessTimezoneFromPhone(phoneNumber) {
  if (!phoneNumber) return 'America/New_York';
  
  // Extract area code (assumes E.164 format or 10-digit US number)
  const digits = phoneNumber.replace(/\D/g, '');
  let areaCode;
  
  if (digits.startsWith('1') && digits.length === 11) {
    areaCode = digits.substring(1, 4);
  } else if (digits.length === 10) {
    areaCode = digits.substring(0, 3);
  } else {
    return 'America/New_York'; // Default for non-US numbers
  }
  
  return AREA_CODE_TIMEZONES[areaCode] || 'America/New_York';
}

/**
 * Get next allowed call time if current time is outside window
 */
function getNextAllowedCallTime(recipientTimezone, stateCode = null) {
  const now = new Date();
  const localTime = getLocalTime(now, recipientTimezone);
  
  const [currentHour] = localTime.split(':').map(Number);
  
  // If before 8am, can call at 8am today
  if (currentHour < 8) {
    return {
      canCallAt: 'today at 8:00 AM',
      waitMinutes: (8 - currentHour) * 60
    };
  }
  
  // If after 9pm, can call at 8am tomorrow
  if (currentHour >= 21) {
    return {
      canCallAt: 'tomorrow at 8:00 AM',
      waitMinutes: (24 - currentHour + 8) * 60
    };
  }
  
  // Currently in allowed window
  return {
    canCallAt: 'now',
    waitMinutes: 0
  };
}

/**
 * Get all US timezones and their current local times
 * Useful for scheduling campaigns
 */
function getAllUSTimezones() {
  const timezones = [
    { id: 'America/New_York', name: 'Eastern Time (ET)', states: 'NY, FL, GA, NC, etc.' },
    { id: 'America/Chicago', name: 'Central Time (CT)', states: 'TX, IL, MN, etc.' },
    { id: 'America/Denver', name: 'Mountain Time (MT)', states: 'CO, AZ, NM, etc.' },
    { id: 'America/Los_Angeles', name: 'Pacific Time (PT)', states: 'CA, WA, OR, NV' },
    { id: 'America/Anchorage', name: 'Alaska Time (AKT)', states: 'AK' },
    { id: 'Pacific/Honolulu', name: 'Hawaii Time (HST)', states: 'HI' }
  ];
  
  const now = new Date();
  return timezones.map(tz => ({
    ...tz,
    currentTime: getLocalTime(now, tz.id),
    canCallNow: isTimeInWindow(getLocalTime(now, tz.id), DEFAULT_START_TIME, DEFAULT_END_TIME)
  }));
}

module.exports = {
  checkCallTime,
  getLocalTime,
  isTimeInWindow,
  guessTimezoneFromPhone,
  getNextAllowedCallTime,
  getAllUSTimezones,
  DEFAULT_START_TIME,
  DEFAULT_END_TIME
};
