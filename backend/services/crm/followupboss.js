/**
 * Follow Up Boss CRM Service
 * 
 * Handles all API interactions with Follow Up Boss CRM.
 * API Docs: https://docs.followupboss.com/reference/getting-started
 * 
 * Authentication: HTTP Basic Auth (API Key as username, blank password)
 * Base URL: https://api.followupboss.com/v1/
 */

const FUB_API_BASE = 'https://api.followupboss.com/v1';
const SYSTEM_NAME = 'Voicory'; // Required X-System header

/**
 * Create Basic Auth header from API key
 */
function createAuthHeader(apiKey) {
    const credentials = Buffer.from(`${apiKey}:`).toString('base64');
    return `Basic ${credentials}`;
}

/**
 * Make authenticated request to Follow Up Boss API
 */
async function fubRequest(apiKey, method, endpoint, body = null) {
    const url = `${FUB_API_BASE}${endpoint}`;
    
    const headers = {
        'Authorization': createAuthHeader(apiKey),
        'Content-Type': 'application/json',
        'X-System': SYSTEM_NAME,
        'X-System-Key': process.env.FUB_SYSTEM_KEY || 'voicory-integration',
    };

    const options = {
        method,
        headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch {
            errorData = { message: errorText };
        }
        
        const error = new Error(errorData.message || `FUB API Error: ${response.status}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return null;
    }

    return response.json();
}

// ============================================
// Connection & Identity
// ============================================

/**
 * Test connection and get current user info
 */
async function testConnection(apiKey) {
    try {
        const result = await fubRequest(apiKey, 'GET', '/me');
        return {
            success: true,
            provider: 'followupboss',
            message: 'Successfully connected to Follow Up Boss',
            userInfo: {
                id: result.id,
                name: result.name,
                email: result.email,
            },
        };
    } catch (error) {
        return {
            success: false,
            provider: 'followupboss',
            message: error.message || 'Failed to connect to Follow Up Boss',
            userInfo: null,
        };
    }
}

/**
 * Get current user identity
 */
async function getIdentity(apiKey) {
    return fubRequest(apiKey, 'GET', '/me');
}

// ============================================
// People (Contacts)
// ============================================

/**
 * Search for a person by phone number
 */
async function findPersonByPhone(apiKey, phone) {
    // Normalize phone number (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, '');
    
    const result = await fubRequest(apiKey, 'GET', `/people?phone=${encodeURIComponent(normalizedPhone)}`);
    
    if (result.people && result.people.length > 0) {
        return result.people[0];
    }
    return null;
}

/**
 * Search for a person by email
 */
async function findPersonByEmail(apiKey, email) {
    const result = await fubRequest(apiKey, 'GET', `/people?email=${encodeURIComponent(email)}`);
    
    if (result.people && result.people.length > 0) {
        return result.people[0];
    }
    return null;
}

/**
 * Get a person by ID
 */
async function getPerson(apiKey, personId) {
    return fubRequest(apiKey, 'GET', `/people/${personId}`);
}

/**
 * Create a new person (lead/contact)
 */
async function createPerson(apiKey, personData) {
    return fubRequest(apiKey, 'POST', '/people', personData);
}

/**
 * Update an existing person
 */
async function updatePerson(apiKey, personId, personData) {
    return fubRequest(apiKey, 'PUT', `/people/${personId}`, personData);
}

/**
 * Find or create a person by phone number
 */
async function findOrCreatePerson(apiKey, { phone, email, firstName, lastName, source = 'Voicory AI Call' }) {
    // First try to find by phone
    if (phone) {
        const existingByPhone = await findPersonByPhone(apiKey, phone);
        if (existingByPhone) {
            return { person: existingByPhone, created: false };
        }
    }
    
    // Then try by email
    if (email) {
        const existingByEmail = await findPersonByEmail(apiKey, email);
        if (existingByEmail) {
            return { person: existingByEmail, created: false };
        }
    }
    
    // Create new person
    const personData = {
        firstName: firstName || '',
        lastName: lastName || '',
        source,
        phones: phone ? [{ value: phone, type: 'mobile' }] : [],
        emails: email ? [{ value: email }] : [],
    };
    
    const newPerson = await createPerson(apiKey, personData);
    return { person: newPerson, created: true };
}

// ============================================
// Calls
// ============================================

/**
 * Log a call in Follow Up Boss
 */
async function createCall(apiKey, callData) {
    return fubRequest(apiKey, 'POST', '/calls', callData);
}

/**
 * Get a call by ID
 */
async function getCall(apiKey, callId) {
    return fubRequest(apiKey, 'GET', `/calls/${callId}`);
}

/**
 * Update a call
 */
async function updateCall(apiKey, callId, callData) {
    return fubRequest(apiKey, 'PUT', `/calls/${callId}`, callData);
}

/**
 * Push a Voicory call log to Follow Up Boss
 * This is the main function called after a call ends
 */
async function pushCallToFUB(apiKey, callLog, options = {}) {
    const { autoCreateContact = true } = options;
    
    // Find or create the contact
    let person;
    let createdContact = false;
    
    if (autoCreateContact) {
        const result = await findOrCreatePerson(apiKey, {
            phone: callLog.customerPhone,
            email: callLog.customerEmail,
            firstName: callLog.customerName?.split(' ')[0],
            lastName: callLog.customerName?.split(' ').slice(1).join(' '),
            source: 'Voicory AI Call',
        });
        person = result.person;
        createdContact = result.created;
    } else {
        person = await findPersonByPhone(apiKey, callLog.customerPhone);
        if (!person && callLog.customerEmail) {
            person = await findPersonByEmail(apiKey, callLog.customerEmail);
        }
    }
    
    if (!person) {
        throw new Error('Contact not found and autoCreateContact is disabled');
    }
    
    // Create the call log
    const fubCallData = {
        personId: person.id,
        duration: callLog.duration || 0, // seconds
        outcome: mapOutcomeToFUB(callLog.outcome),
        note: buildCallNote(callLog),
        isIncoming: callLog.direction === 'inbound',
        phone: callLog.customerPhone,
        recording: callLog.recordingUrl,
    };
    
    const fubCall = await createCall(apiKey, fubCallData);
    
    return {
        success: true,
        remoteCallId: fubCall.id?.toString(),
        remoteContactId: person.id?.toString(),
        createdContact,
    };
}

/**
 * Map Voicory call outcome to FUB outcome
 */
function mapOutcomeToFUB(outcome) {
    const outcomeMap = {
        'completed': 'Contacted',
        'no_answer': 'No Answer',
        'busy': 'Busy',
        'voicemail': 'Left Voicemail',
        'failed': 'Wrong Number',
        'cancelled': 'No Answer',
    };
    return outcomeMap[outcome] || 'Contacted';
}

/**
 * Build call note from Voicory call log
 */
function buildCallNote(callLog) {
    let note = '🤖 AI Call via Voicory\n\n';
    
    if (callLog.summary) {
        note += `📝 Summary:\n${callLog.summary}\n\n`;
    }
    
    if (callLog.outcome) {
        note += `📊 Outcome: ${callLog.outcome}\n`;
    }
    
    note += `⏱️ Duration: ${formatDuration(callLog.duration)}\n`;
    note += `📅 Date: ${new Date(callLog.startedAt).toLocaleString()}\n`;
    
    if (callLog.transcript) {
        // Truncate transcript if too long
        const maxTranscriptLength = 2000;
        const transcript = callLog.transcript.length > maxTranscriptLength 
            ? callLog.transcript.substring(0, maxTranscriptLength) + '...' 
            : callLog.transcript;
        note += `\n📜 Transcript:\n${transcript}`;
    }
    
    return note;
}

/**
 * Format duration in seconds to readable format
 */
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// Notes
// ============================================

/**
 * Create a note for a person
 */
async function createNote(apiKey, noteData) {
    return fubRequest(apiKey, 'POST', '/notes', noteData);
}

/**
 * Get notes for a person
 */
async function getPersonNotes(apiKey, personId, limit = 10) {
    return fubRequest(apiKey, 'GET', `/notes?personId=${personId}&limit=${limit}`);
}

// ============================================
// Events (for lead ingestion)
// ============================================

/**
 * Send an event (for lead tracking)
 * This is useful for tracking website visits, property inquiries, etc.
 */
async function createEvent(apiKey, eventData) {
    return fubRequest(apiKey, 'POST', '/events', eventData);
}

// ============================================
// Webhooks
// ============================================

/**
 * List all webhooks
 */
async function listWebhooks(apiKey) {
    return fubRequest(apiKey, 'GET', '/webhooks');
}

/**
 * Create a webhook
 */
async function createWebhook(apiKey, event, callbackUrl) {
    return fubRequest(apiKey, 'POST', '/webhooks', {
        event,
        url: callbackUrl,
    });
}

/**
 * Delete a webhook
 */
async function deleteWebhook(apiKey, webhookId) {
    return fubRequest(apiKey, 'DELETE', `/webhooks/${webhookId}`);
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, systemKey) {
    const crypto = require('crypto');
    const calculated = crypto
        .createHmac('sha256', systemKey)
        .update(Buffer.from(JSON.stringify(payload)).toString('base64'))
        .digest('hex');
    return signature === calculated;
}

// ============================================
// Users
// ============================================

/**
 * Get all users in the account
 */
async function getUsers(apiKey) {
    return fubRequest(apiKey, 'GET', '/users');
}

/**
 * Get a specific user
 */
async function getUser(apiKey, userId) {
    return fubRequest(apiKey, 'GET', `/users/${userId}`);
}

// ============================================
// Stages
// ============================================

/**
 * Get all stages
 */
async function getStages(apiKey) {
    return fubRequest(apiKey, 'GET', '/stages');
}

module.exports = {
    // Connection
    testConnection,
    getIdentity,
    
    // People
    findPersonByPhone,
    findPersonByEmail,
    getPerson,
    createPerson,
    updatePerson,
    findOrCreatePerson,
    
    // Calls
    createCall,
    getCall,
    updateCall,
    pushCallToFUB,
    
    // Notes
    createNote,
    getPersonNotes,
    
    // Events
    createEvent,
    
    // Webhooks
    listWebhooks,
    createWebhook,
    deleteWebhook,
    verifyWebhookSignature,
    
    // Users & Stages
    getUsers,
    getUser,
    getStages,
};
