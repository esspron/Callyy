/**
 * Consent Manager Service
 * 
 * Manages TCPA consent records with Supabase Storage for proof documents.
 * Handles consent capture, verification, and revocation.
 */

const { supabase } = require('../../config');
const { normalizePhone } = require('./dncRegistry');

// Supabase Storage bucket name for consent documents
const CONSENT_BUCKET = 'tcpa-consent';

/**
 * Check if there's active consent for a phone number
 * 
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number to check
 * @returns {Promise<Object>} Consent check result
 */
async function checkConsent(userId, phoneNumber) {
  try {
    const normalizedPhone = normalizePhone(phoneNumber);
    
    const { data, error } = await supabase
      .from('tcpa_consent')
      .select('id, consent_type, consent_date, consent_source, contact_name')
      .eq('user_id', userId)
      .eq('phone_number', normalizedPhone)
      .eq('is_active', true)
      .order('consent_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (data) {
      return {
        passed: true,
        hasConsent: true,
        consentId: data.id,
        consentType: data.consent_type,
        consentDate: data.consent_date,
        consentSource: data.consent_source,
        contactName: data.contact_name,
        checkedAt: new Date().toISOString()
      };
    }
    
    return {
      passed: false,
      hasConsent: false,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Consent check error:', error);
    return {
      passed: false,
      hasConsent: false,
      error: error.message
    };
  }
}

/**
 * Record new consent
 * 
 * @param {string} userId - User ID
 * @param {Object} consentData - Consent details
 * @returns {Promise<Object>} Created consent record
 */
async function recordConsent(userId, consentData) {
  const {
    phoneNumber,
    consentType, // 'written', 'verbal', 'implied', 'web_form'
    consentSource, // 'web_form', 'manual_entry', 'crm_import', 'verbal_recording'
    consentText = null,
    contactName = null,
    contactEmail = null,
    ipAddress = null,
    userAgent = null,
    metadata = {}
  } = consentData;
  
  const normalizedPhone = normalizePhone(phoneNumber);
  
  // Deactivate any existing consent for this number first
  await supabase
    .from('tcpa_consent')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('phone_number', normalizedPhone)
    .eq('is_active', true);
  
  // Create new consent record
  const { data, error } = await supabase
    .from('tcpa_consent')
    .insert({
      user_id: userId,
      phone_number: normalizedPhone,
      consent_type: consentType,
      consent_source: consentSource,
      consent_date: new Date().toISOString(),
      consent_text: consentText,
      contact_name: contactName,
      contact_email: contactEmail,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_active: true,
      metadata
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}

/**
 * Upload consent proof document to Supabase Storage
 * 
 * @param {string} userId - User ID
 * @param {string} consentId - Consent record ID
 * @param {Buffer|Blob} file - File content
 * @param {string} fileName - Original file name
 * @param {string} fileType - MIME type
 * @returns {Promise<Object>} Upload result with path
 */
async function uploadConsentProof(userId, consentId, file, fileName, fileType) {
  // Generate unique path
  const ext = fileName.split('.').pop() || 'pdf';
  const path = `${userId}/${consentId}/${Date.now()}.${ext}`;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(CONSENT_BUCKET)
    .upload(path, file, {
      contentType: fileType,
      upsert: false
    });
  
  if (error) throw error;
  
  // Update consent record with proof path
  const proofType = getProofType(fileType);
  await supabase
    .from('tcpa_consent')
    .update({
      consent_proof_path: data.path,
      consent_proof_type: proofType,
      updated_at: new Date().toISOString()
    })
    .eq('id', consentId);
  
  return {
    path: data.path,
    type: proofType
  };
}

/**
 * Get consent proof download URL
 * 
 * @param {string} userId - User ID
 * @param {string} consentId - Consent record ID
 * @returns {Promise<string>} Signed URL for download
 */
async function getConsentProofUrl(userId, consentId) {
  // Get consent record first
  const { data: consent, error: consentError } = await supabase
    .from('tcpa_consent')
    .select('consent_proof_path')
    .eq('id', consentId)
    .eq('user_id', userId)
    .single();
  
  if (consentError || !consent?.consent_proof_path) {
    return null;
  }
  
  // Generate signed URL (valid for 1 hour)
  const { data, error } = await supabase.storage
    .from(CONSENT_BUCKET)
    .createSignedUrl(consent.consent_proof_path, 3600);
  
  if (error) throw error;
  
  return data.signedUrl;
}

/**
 * Revoke consent
 * 
 * @param {string} userId - User ID
 * @param {string} consentId - Consent record ID
 * @param {string} reason - Revocation reason
 * @returns {Promise<Object>} Updated consent record
 */
async function revokeConsent(userId, consentId, reason = 'User requested') {
  const { data, error } = await supabase
    .from('tcpa_consent')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', consentId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}

/**
 * Get all consent records for a phone number
 * 
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Array>} Consent history
 */
async function getConsentHistory(userId, phoneNumber) {
  const normalizedPhone = normalizePhone(phoneNumber);
  
  const { data, error } = await supabase
    .from('tcpa_consent')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_number', normalizedPhone)
    .order('consent_date', { ascending: false });
  
  if (error) throw error;
  
  return data || [];
}

/**
 * Get all active consents for a user with pagination
 * 
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Consents with pagination
 */
async function getActiveConsents(userId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    search = null
  } = options;
  
  let query = supabase
    .from('tcpa_consent')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('consent_date', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (search) {
    query = query.or(`phone_number.ilike.%${search}%,contact_name.ilike.%${search}%`);
  }
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    consents: data || [],
    total: count || 0,
    limit,
    offset
  };
}

/**
 * Bulk import consents (e.g., from CRM)
 * 
 * @param {string} userId - User ID
 * @param {Array<Object>} consents - Array of consent records
 * @returns {Promise<Object>} Import result
 */
async function bulkImportConsents(userId, consents) {
  const records = consents.map(c => ({
    user_id: userId,
    phone_number: normalizePhone(c.phoneNumber),
    consent_type: c.consentType || 'implied',
    consent_source: 'crm_import',
    consent_date: c.consentDate || new Date().toISOString(),
    contact_name: c.contactName || null,
    contact_email: c.contactEmail || null,
    is_active: true,
    metadata: { imported_at: new Date().toISOString(), original_data: c }
  }));
  
  const { data, error } = await supabase
    .from('tcpa_consent')
    .insert(records)
    .select();
  
  if (error) throw error;
  
  return {
    imported: data?.length || 0,
    total: consents.length
  };
}

/**
 * Generate consent text template
 * 
 * @param {string} companyName - Company name
 * @param {string} purpose - Purpose of calls
 * @returns {string} Consent text
 */
function generateConsentText(companyName, purpose = 'marketing and informational calls') {
  return `By providing my phone number, I consent to receive ${purpose} from ${companyName} using an automated dialing system. I understand that I can revoke this consent at any time by requesting to be added to the Do Not Call list. Message and data rates may apply.`;
}

/**
 * Get proof type from MIME type
 */
function getProofType(mimeType) {
  const typeMap = {
    'application/pdf': 'pdf',
    'image/png': 'image',
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'audio/mpeg': 'audio',
    'audio/wav': 'audio',
    'audio/mp3': 'audio'
  };
  return typeMap[mimeType] || 'other';
}

/**
 * Get consent statistics for a user
 */
async function getConsentStats(userId) {
  const { data, error } = await supabase
    .from('tcpa_consent')
    .select('is_active, consent_type, consent_source')
    .eq('user_id', userId);
  
  if (error) throw error;
  
  const stats = {
    total: data?.length || 0,
    active: 0,
    revoked: 0,
    by_type: {},
    by_source: {}
  };
  
  (data || []).forEach(c => {
    if (c.is_active) stats.active++;
    else stats.revoked++;
    
    stats.by_type[c.consent_type] = (stats.by_type[c.consent_type] || 0) + 1;
    stats.by_source[c.consent_source] = (stats.by_source[c.consent_source] || 0) + 1;
  });
  
  return stats;
}

module.exports = {
  checkConsent,
  recordConsent,
  uploadConsentProof,
  getConsentProofUrl,
  revokeConsent,
  getConsentHistory,
  getActiveConsents,
  bulkImportConsents,
  generateConsentText,
  getConsentStats,
  CONSENT_BUCKET
};
