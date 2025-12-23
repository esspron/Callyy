/**
 * TCPA Compliance API Routes
 * 
 * Endpoints for managing TCPA compliance:
 * - DNC list management
 * - Consent management
 * - Compliance checking
 * - Settings management
 * - State rules lookup
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifySupabaseAuth: authenticate } = require('../lib/auth');
const tcpaService = require('../services/tcpa');

// Configure multer for consent document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'audio/mpeg', 'audio/wav'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, PNG, JPEG, MP3, WAV'));
    }
  }
});

// ===========================================
// COMPLIANCE CHECK ENDPOINTS
// ===========================================

/**
 * POST /api/tcpa/check
 * Perform full TCPA compliance check before making a call
 */
router.post('/check', authenticate, async (req, res) => {
  try {
    const { phoneNumber, recipientTimezone, stateCode, campaignId, requireConsent } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await tcpaService.checkCompliance({
      userId: req.user.id,
      phoneNumber,
      recipientTimezone: recipientTimezone || 'America/New_York',
      stateCode,
      campaignId,
      requireConsent: requireConsent !== false
    });
    
    res.json(result);
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Failed to perform compliance check' });
  }
});

/**
 * POST /api/tcpa/check-bulk
 * Check multiple phone numbers at once
 */
router.post('/check-bulk', authenticate, async (req, res) => {
  try {
    const { phoneNumbers, recipientTimezone } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return res.status(400).json({ error: 'Phone numbers array is required' });
    }
    
    if (phoneNumbers.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 phone numbers per request' });
    }
    
    const results = await Promise.all(
      phoneNumbers.map(phone =>
        tcpaService.checkCompliance({
          userId: req.user.id,
          phoneNumber: phone,
          recipientTimezone: recipientTimezone || 'America/New_York',
          requireConsent: false // Skip consent for bulk check
        })
      )
    );
    
    // Create summary
    const summary = {
      total: results.length,
      compliant: results.filter(r => r.compliant).length,
      blocked: results.filter(r => r.blocked).length
    };
    
    res.json({ results, summary });
  } catch (error) {
    console.error('Bulk compliance check error:', error);
    res.status(500).json({ error: 'Failed to perform bulk compliance check' });
  }
});

// ===========================================
// DNC LIST ENDPOINTS
// ===========================================

/**
 * GET /api/tcpa/dnc
 * Get user's DNC list with pagination
 */
router.get('/dnc', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;
    
    const result = await tcpaService.dncRegistry.getDNCList(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      search
    });
    
    res.json(result);
  } catch (error) {
    console.error('Get DNC list error:', error);
    res.status(500).json({ error: 'Failed to get DNC list' });
  }
});

/**
 * POST /api/tcpa/dnc/check
 * Check if a phone number is on DNC
 */
router.post('/dnc/check', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await tcpaService.dncRegistry.checkDNC(req.user.id, phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('DNC check error:', error);
    res.status(500).json({ error: 'Failed to check DNC status' });
  }
});

/**
 * POST /api/tcpa/dnc/check-bulk
 * Check multiple phone numbers against DNC
 */
router.post('/dnc/check-bulk', authenticate, async (req, res) => {
  try {
    const { phoneNumbers } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return res.status(400).json({ error: 'Phone numbers array is required' });
    }
    
    if (phoneNumbers.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 phone numbers per request' });
    }
    
    const results = await tcpaService.dncRegistry.bulkCheckDNC(req.user.id, phoneNumbers);
    res.json(results);
  } catch (error) {
    console.error('Bulk DNC check error:', error);
    res.status(500).json({ error: 'Failed to check DNC status' });
  }
});

/**
 * POST /api/tcpa/dnc
 * Add phone number to DNC list
 */
router.post('/dnc', authenticate, async (req, res) => {
  try {
    const { phoneNumber, reason, source, notes } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await tcpaService.dncRegistry.addToDNC(req.user.id, phoneNumber, {
      reason: reason || 'manual_add',
      source: source || 'manual',
      notes
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Add to DNC error:', error);
    res.status(500).json({ error: 'Failed to add to DNC list' });
  }
});

/**
 * POST /api/tcpa/dnc/bulk
 * Bulk add phone numbers to DNC list
 */
router.post('/dnc/bulk', authenticate, async (req, res) => {
  try {
    const { phoneNumbers, reason, source } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return res.status(400).json({ error: 'Phone numbers array is required' });
    }
    
    if (phoneNumbers.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 phone numbers per request' });
    }
    
    const result = await tcpaService.dncRegistry.bulkAddToDNC(req.user.id, phoneNumbers, {
      reason: reason || 'import',
      source: source || 'import'
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Bulk add to DNC error:', error);
    res.status(500).json({ error: 'Failed to bulk add to DNC list' });
  }
});

/**
 * DELETE /api/tcpa/dnc/:phoneNumber
 * Remove phone number from DNC list
 */
router.delete('/dnc/:phoneNumber', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    await tcpaService.dncRegistry.removeFromDNC(req.user.id, phoneNumber);
    res.json({ success: true, message: 'Removed from DNC list' });
  } catch (error) {
    console.error('Remove from DNC error:', error);
    res.status(500).json({ error: 'Failed to remove from DNC list' });
  }
});

/**
 * GET /api/tcpa/dnc/stats
 * Get DNC statistics
 */
router.get('/dnc/stats', authenticate, async (req, res) => {
  try {
    const stats = await tcpaService.dncRegistry.getDNCStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Get DNC stats error:', error);
    res.status(500).json({ error: 'Failed to get DNC stats' });
  }
});

/**
 * GET /api/tcpa/dnc/export
 * Export DNC list as JSON (for CSV conversion on frontend)
 */
router.get('/dnc/export', authenticate, async (req, res) => {
  try {
    const data = await tcpaService.dncRegistry.exportDNCList(req.user.id);
    res.json(data);
  } catch (error) {
    console.error('Export DNC error:', error);
    res.status(500).json({ error: 'Failed to export DNC list' });
  }
});

// ===========================================
// CONSENT MANAGEMENT ENDPOINTS
// ===========================================

/**
 * GET /api/tcpa/consent
 * Get active consents with pagination
 */
router.get('/consent', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;
    
    const result = await tcpaService.consentManager.getActiveConsents(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      search
    });
    
    res.json(result);
  } catch (error) {
    console.error('Get consents error:', error);
    res.status(500).json({ error: 'Failed to get consents' });
  }
});

/**
 * POST /api/tcpa/consent/check
 * Check if there's active consent for a phone number
 */
router.post('/consent/check', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await tcpaService.consentManager.checkConsent(req.user.id, phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('Consent check error:', error);
    res.status(500).json({ error: 'Failed to check consent' });
  }
});

/**
 * POST /api/tcpa/consent
 * Record new consent
 */
router.post('/consent', authenticate, async (req, res) => {
  try {
    const {
      phoneNumber,
      consentType,
      consentSource,
      consentText,
      contactName,
      contactEmail,
      ipAddress,
      userAgent,
      metadata
    } = req.body;
    
    if (!phoneNumber || !consentType || !consentSource) {
      return res.status(400).json({
        error: 'Phone number, consent type, and consent source are required'
      });
    }
    
    const validTypes = ['written', 'verbal', 'implied', 'web_form'];
    if (!validTypes.includes(consentType)) {
      return res.status(400).json({
        error: `Invalid consent type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    const result = await tcpaService.consentManager.recordConsent(req.user.id, {
      phoneNumber,
      consentType,
      consentSource,
      consentText,
      contactName,
      contactEmail,
      ipAddress,
      userAgent,
      metadata
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Record consent error:', error);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

/**
 * POST /api/tcpa/consent/:consentId/proof
 * Upload consent proof document
 */
router.post('/consent/:consentId/proof', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { consentId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const result = await tcpaService.consentManager.uploadConsentProof(
      req.user.id,
      consentId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    
    res.json(result);
  } catch (error) {
    console.error('Upload consent proof error:', error);
    res.status(500).json({ error: 'Failed to upload consent proof' });
  }
});

/**
 * GET /api/tcpa/consent/:consentId/proof
 * Get consent proof download URL
 */
router.get('/consent/:consentId/proof', authenticate, async (req, res) => {
  try {
    const { consentId } = req.params;
    
    const url = await tcpaService.consentManager.getConsentProofUrl(req.user.id, consentId);
    
    if (!url) {
      return res.status(404).json({ error: 'No proof document found' });
    }
    
    res.json({ url });
  } catch (error) {
    console.error('Get consent proof error:', error);
    res.status(500).json({ error: 'Failed to get consent proof' });
  }
});

/**
 * GET /api/tcpa/consent/history/:phoneNumber
 * Get consent history for a phone number
 */
router.get('/consent/history/:phoneNumber', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const history = await tcpaService.consentManager.getConsentHistory(req.user.id, phoneNumber);
    res.json(history);
  } catch (error) {
    console.error('Get consent history error:', error);
    res.status(500).json({ error: 'Failed to get consent history' });
  }
});

/**
 * POST /api/tcpa/consent/:consentId/revoke
 * Revoke consent
 */
router.post('/consent/:consentId/revoke', authenticate, async (req, res) => {
  try {
    const { consentId } = req.params;
    const { reason } = req.body;
    
    const result = await tcpaService.consentManager.revokeConsent(
      req.user.id,
      consentId,
      reason || 'User requested'
    );
    
    res.json(result);
  } catch (error) {
    console.error('Revoke consent error:', error);
    res.status(500).json({ error: 'Failed to revoke consent' });
  }
});

/**
 * POST /api/tcpa/consent/bulk-import
 * Bulk import consents (e.g., from CRM)
 */
router.post('/consent/bulk-import', authenticate, async (req, res) => {
  try {
    const { consents } = req.body;
    
    if (!consents || !Array.isArray(consents)) {
      return res.status(400).json({ error: 'Consents array is required' });
    }
    
    if (consents.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 consents per request' });
    }
    
    const result = await tcpaService.consentManager.bulkImportConsents(req.user.id, consents);
    res.status(201).json(result);
  } catch (error) {
    console.error('Bulk import consents error:', error);
    res.status(500).json({ error: 'Failed to import consents' });
  }
});

/**
 * GET /api/tcpa/consent/stats
 * Get consent statistics
 */
router.get('/consent/stats', authenticate, async (req, res) => {
  try {
    const stats = await tcpaService.consentManager.getConsentStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Get consent stats error:', error);
    res.status(500).json({ error: 'Failed to get consent stats' });
  }
});

/**
 * GET /api/tcpa/consent/template
 * Get consent text template
 */
router.get('/consent/template', authenticate, async (req, res) => {
  try {
    const { companyName, purpose } = req.query;
    
    const template = tcpaService.consentManager.generateConsentText(
      companyName || 'Our Company',
      purpose
    );
    
    res.json({ template });
  } catch (error) {
    console.error('Get consent template error:', error);
    res.status(500).json({ error: 'Failed to generate consent template' });
  }
});

// ===========================================
// SETTINGS ENDPOINTS
// ===========================================

/**
 * GET /api/tcpa/settings
 * Get user's TCPA settings
 */
router.get('/settings', authenticate, async (req, res) => {
  try {
    const settings = await tcpaService.getUserSettings(req.user.id);
    res.json(settings);
  } catch (error) {
    console.error('Get TCPA settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * PUT /api/tcpa/settings
 * Update user's TCPA settings
 */
router.put('/settings', authenticate, async (req, res) => {
  try {
    const settings = await tcpaService.updateUserSettings(req.user.id, req.body);
    res.json(settings);
  } catch (error) {
    console.error('Update TCPA settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ===========================================
// STATE RULES ENDPOINTS
// ===========================================

/**
 * GET /api/tcpa/state-rules
 * Get all state rules
 */
router.get('/state-rules', authenticate, async (req, res) => {
  try {
    const rules = await tcpaService.stateRules.getAllStateRules();
    res.json(rules);
  } catch (error) {
    console.error('Get state rules error:', error);
    res.status(500).json({ error: 'Failed to get state rules' });
  }
});

/**
 * GET /api/tcpa/state-rules/:stateCode
 * Get rules for a specific state
 */
router.get('/state-rules/:stateCode', authenticate, async (req, res) => {
  try {
    const { stateCode } = req.params;
    const rules = await tcpaService.stateRules.getStateRules(stateCode);
    res.json(rules);
  } catch (error) {
    console.error('Get state rules error:', error);
    res.status(500).json({ error: 'Failed to get state rules' });
  }
});

/**
 * GET /api/tcpa/state-rules/:stateCode/recording-disclosure
 * Get recording disclosure requirements for a state
 */
router.get('/state-rules/:stateCode/recording-disclosure', authenticate, async (req, res) => {
  try {
    const { stateCode } = req.params;
    const requirements = tcpaService.stateRules.getRecordingDisclosureRequirement(stateCode);
    res.json(requirements);
  } catch (error) {
    console.error('Get recording disclosure error:', error);
    res.status(500).json({ error: 'Failed to get recording disclosure requirements' });
  }
});

// ===========================================
// TIME RESTRICTION ENDPOINTS
// ===========================================

/**
 * GET /api/tcpa/timezones
 * Get all US timezones with current call status
 */
router.get('/timezones', authenticate, async (req, res) => {
  try {
    const timezones = tcpaService.timeRestrictions.getAllUSTimezones();
    res.json(timezones);
  } catch (error) {
    console.error('Get timezones error:', error);
    res.status(500).json({ error: 'Failed to get timezones' });
  }
});

/**
 * POST /api/tcpa/check-time
 * Check if current time allows calling in a timezone
 */
router.post('/check-time', authenticate, async (req, res) => {
  try {
    const { timezone, stateCode } = req.body;
    
    if (!timezone) {
      return res.status(400).json({ error: 'Timezone is required' });
    }
    
    const result = await tcpaService.timeRestrictions.checkCallTime(timezone, stateCode);
    res.json(result);
  } catch (error) {
    console.error('Check time error:', error);
    res.status(500).json({ error: 'Failed to check call time' });
  }
});

/**
 * POST /api/tcpa/next-call-time
 * Get next allowed call time for a timezone
 */
router.post('/next-call-time', authenticate, async (req, res) => {
  try {
    const { timezone, stateCode } = req.body;
    
    if (!timezone) {
      return res.status(400).json({ error: 'Timezone is required' });
    }
    
    const result = tcpaService.timeRestrictions.getNextAllowedCallTime(timezone, stateCode);
    res.json(result);
  } catch (error) {
    console.error('Get next call time error:', error);
    res.status(500).json({ error: 'Failed to get next call time' });
  }
});

// ===========================================
// STATISTICS ENDPOINTS
// ===========================================

/**
 * GET /api/tcpa/stats
 * Get overall compliance statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await tcpaService.getComplianceStats(req.user.id, parseInt(days));
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get compliance stats' });
  }
});

// ===========================================
// OPT-OUT HANDLING (for voice agent)
// ===========================================

/**
 * POST /api/tcpa/opt-out
 * Handle opt-out request from call
 */
router.post('/opt-out', authenticate, async (req, res) => {
  try {
    const { phoneNumber, callId, source } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await tcpaService.dncRegistry.handleOptOut(
      req.user.id,
      phoneNumber,
      callId,
      source || 'voice_opt_out'
    );
    
    res.json({ success: true, dncRecord: result });
  } catch (error) {
    console.error('Opt-out error:', error);
    res.status(500).json({ error: 'Failed to process opt-out' });
  }
});

module.exports = router;
