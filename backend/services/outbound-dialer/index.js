// ============================================
// OUTBOUND DIALER SERVICE - Main Entry Point
// ============================================
const { supabase } = require('../../config');
const campaignManager = require('./campaignManager');
const callQueue = require('./callQueue');
const dialer = require('./dialer');
const tcpaChecker = require('./tcpaChecker');
const leadProcessor = require('./leadProcessor');

module.exports = {
    // Campaign management
    ...campaignManager,
    
    // Call queue operations
    ...callQueue,
    
    // Dialer operations
    ...dialer,
    
    // TCPA compliance
    ...tcpaChecker,
    
    // Lead processing
    ...leadProcessor
};
