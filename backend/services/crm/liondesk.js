/**
 * LionDesk CRM Service
 * 
 * Handles all API interactions with LionDesk CRM.
 * API Docs: https://developers.liondesk.com/docs/getting-started
 * 
 * Authentication: OAuth 2.0 (Bearer token)
 * Base URL: https://api-v2.liondesk.com/
 */

const LIONDESK_API_BASE = 'https://api-v2.liondesk.com';
const LIONDESK_AUTH_BASE = 'https://api-v2.liondesk.com/oauth';

/**
 * Make authenticated request to LionDesk API
 */
async function lionDeskRequest(accessToken, method, endpoint, body = null) {
    const url = `${LIONDESK_API_BASE}${endpoint}`;
    
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
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
        
        const error = new Error(errorData.message || errorData.error || `LionDesk API Error: ${response.status}`);
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
// OAuth Authentication
// ============================================

/**
 * Generate OAuth authorization URL
 */
function getAuthorizationUrl(clientId, redirectUri, state) {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state,
    });
    
    return `${LIONDESK_AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(clientId, clientSecret, code, redirectUri) {
    const response = await fetch(`${LIONDESK_AUTH_BASE}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
        }).toString(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || 'Failed to exchange code for token');
    }

    return response.json();
}

/**
 * Refresh access token
 */
async function refreshAccessToken(clientId, clientSecret, refreshToken) {
    const response = await fetch(`${LIONDESK_AUTH_BASE}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
        }).toString(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || 'Failed to refresh token');
    }

    return response.json();
}

// ============================================
// Connection & Identity
// ============================================

/**
 * Test connection and get current user info
 */
async function testConnection(accessToken) {
    try {
        const result = await lionDeskRequest(accessToken, 'GET', '/users/me');
        return {
            success: true,
            provider: 'liondesk',
            message: 'Successfully connected to LionDesk',
            userInfo: {
                id: result.id,
                name: `${result.first_name || ''} ${result.last_name || ''}`.trim(),
                email: result.email,
            },
        };
    } catch (error) {
        return {
            success: false,
            provider: 'liondesk',
            message: error.message || 'Failed to connect to LionDesk',
            userInfo: null,
        };
    }
}

/**
 * Get current user
 */
async function getCurrentUser(accessToken) {
    return lionDeskRequest(accessToken, 'GET', '/users/me');
}

// ============================================
// Contacts
// ============================================

/**
 * Search for a contact by phone number
 */
async function findContactByPhone(accessToken, phone) {
    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');
    
    // LionDesk allows searching multiple phone fields
    const result = await lionDeskRequest(accessToken, 'GET', `/contacts?mobile_phone=${encodeURIComponent(normalizedPhone)}`);
    
    if (result.data && result.data.length > 0) {
        return result.data[0];
    }
    
    // Try home phone
    const resultHome = await lionDeskRequest(accessToken, 'GET', `/contacts?home_phone=${encodeURIComponent(normalizedPhone)}`);
    if (resultHome.data && resultHome.data.length > 0) {
        return resultHome.data[0];
    }
    
    // Try office phone
    const resultOffice = await lionDeskRequest(accessToken, 'GET', `/contacts?office_phone=${encodeURIComponent(normalizedPhone)}`);
    if (resultOffice.data && resultOffice.data.length > 0) {
        return resultOffice.data[0];
    }
    
    return null;
}

/**
 * Search for a contact by email
 */
async function findContactByEmail(accessToken, email) {
    const result = await lionDeskRequest(accessToken, 'GET', `/contacts?email=${encodeURIComponent(email)}`);
    
    if (result.data && result.data.length > 0) {
        return result.data[0];
    }
    return null;
}

/**
 * Get a contact by ID
 */
async function getContact(accessToken, contactId) {
    return lionDeskRequest(accessToken, 'GET', `/contacts/${contactId}`);
}

/**
 * Create a new contact
 */
async function createContact(accessToken, contactData) {
    return lionDeskRequest(accessToken, 'POST', '/contacts', contactData);
}

/**
 * Update an existing contact
 */
async function updateContact(accessToken, contactId, contactData) {
    return lionDeskRequest(accessToken, 'PATCH', `/contacts/${contactId}`, contactData);
}

/**
 * Find or create a contact by phone number
 */
async function findOrCreateContact(accessToken, { phone, email, firstName, lastName, tags = 'Voicory AI' }) {
    // First try to find by phone
    if (phone) {
        const existingByPhone = await findContactByPhone(accessToken, phone);
        if (existingByPhone) {
            return { contact: existingByPhone, created: false };
        }
    }
    
    // Then try by email
    if (email) {
        const existingByEmail = await findContactByEmail(accessToken, email);
        if (existingByEmail) {
            return { contact: existingByEmail, created: false };
        }
    }
    
    // Create new contact
    const contactData = {
        first_name: firstName || '',
        last_name: lastName || '',
        mobile_phone: phone || '',
        email: email || '',
        tags: tags,
    };
    
    const newContact = await createContact(accessToken, contactData);
    return { contact: newContact, created: true };
}

/**
 * Get all contacts with pagination
 */
async function getContacts(accessToken, { limit = 50, skip = 0, sort = '-created_at' } = {}) {
    return lionDeskRequest(accessToken, 'GET', `/contacts?$limit=${limit}&$skip=${skip}&$sort[created_at]=${sort === '-created_at' ? -1 : 1}`);
}

// ============================================
// Tasks
// ============================================

/**
 * Create a task for a contact
 */
async function createTask(accessToken, taskData) {
    return lionDeskRequest(accessToken, 'POST', '/tasks', taskData);
}

/**
 * Get tasks for a contact
 */
async function getContactTasks(accessToken, contactId) {
    return lionDeskRequest(accessToken, 'GET', `/contacts/${contactId}/tasks`);
}

/**
 * Update a task
 */
async function updateTask(accessToken, taskId, taskData) {
    return lionDeskRequest(accessToken, 'PATCH', `/tasks/${taskId}`, taskData);
}

// ============================================
// Tags
// ============================================

/**
 * Get all tags
 */
async function getTags(accessToken) {
    return lionDeskRequest(accessToken, 'GET', '/tags');
}

/**
 * Add tag to contact
 */
async function addTagToContact(accessToken, contactId, tag) {
    const contact = await getContact(accessToken, contactId);
    const currentTags = contact.tags || '';
    const tagList = currentTags.split(',').map(t => t.trim()).filter(Boolean);
    
    if (!tagList.includes(tag)) {
        tagList.push(tag);
        await updateContact(accessToken, contactId, { tags: tagList.join(', ') });
    }
    
    return { success: true };
}

// ============================================
// Hotness (Lead Temperature)
// ============================================

/**
 * Get all hotness levels
 */
async function getHotnessLevels(accessToken) {
    return lionDeskRequest(accessToken, 'GET', '/hotnesses');
}

/**
 * Update contact hotness
 */
async function updateContactHotness(accessToken, contactId, hotnessId) {
    return updateContact(accessToken, contactId, { hotness_id: hotnessId });
}

// ============================================
// Sources
// ============================================

/**
 * Get all sources
 */
async function getSources(accessToken) {
    return lionDeskRequest(accessToken, 'GET', '/sources');
}

/**
 * Create a source
 */
async function createSource(accessToken, name) {
    return lionDeskRequest(accessToken, 'POST', '/sources', { name });
}

/**
 * Find or create the Voicory source
 */
async function findOrCreateVoicorySource(accessToken) {
    const sourcesResponse = await getSources(accessToken);
    const sources = sourcesResponse.data || [];
    
    const voicorySource = sources.find(s => s.name === 'Voicory AI Call');
    if (voicorySource) {
        return voicorySource;
    }
    
    return createSource(accessToken, 'Voicory AI Call');
}

// ============================================
// Push Call to LionDesk
// ============================================

/**
 * Push a Voicory call log to LionDesk
 * Since LionDesk doesn't have a direct call log endpoint like FUB,
 * we create a task/note with the call details
 */
async function pushCallToLionDesk(accessToken, callLog, options = {}) {
    const { autoCreateContact = true } = options;
    
    // Find or create the contact
    let contact;
    let createdContact = false;
    
    if (autoCreateContact) {
        const result = await findOrCreateContact(accessToken, {
            phone: callLog.customerPhone,
            email: callLog.customerEmail,
            firstName: callLog.customerName?.split(' ')[0],
            lastName: callLog.customerName?.split(' ').slice(1).join(' '),
            tags: 'Voicory AI',
        });
        contact = result.contact;
        createdContact = result.created;
    } else {
        contact = await findContactByPhone(accessToken, callLog.customerPhone);
        if (!contact && callLog.customerEmail) {
            contact = await findContactByEmail(accessToken, callLog.customerEmail);
        }
    }
    
    if (!contact) {
        throw new Error('Contact not found and autoCreateContact is disabled');
    }
    
    // Create a completed task to log the call
    const taskData = {
        contact_id: contact.id,
        title: `AI Call - ${callLog.direction === 'inbound' ? 'Inbound' : 'Outbound'} - ${formatDuration(callLog.duration)}`,
        description: buildCallDescription(callLog),
        due_date: callLog.startedAt,
        status: 'completed',
        priority: 'medium',
    };
    
    const task = await createTask(accessToken, taskData);
    
    // Add Voicory tag to contact
    await addTagToContact(accessToken, contact.id, 'Voicory AI Call');
    
    // Update contact modified_at to trigger any automations
    await updateContact(accessToken, contact.id, {
        modified_at: new Date().toISOString(),
    });
    
    return {
        success: true,
        remoteCallId: task.id?.toString(),
        remoteContactId: contact.id?.toString(),
        createdContact,
    };
}

/**
 * Build call description for LionDesk task
 */
function buildCallDescription(callLog) {
    let description = '🤖 AI Call via Voicory\n\n';
    
    description += `📞 Direction: ${callLog.direction === 'inbound' ? 'Inbound' : 'Outbound'}\n`;
    description += `⏱️ Duration: ${formatDuration(callLog.duration)}\n`;
    description += `📅 Date: ${new Date(callLog.startedAt).toLocaleString()}\n`;
    
    if (callLog.outcome) {
        description += `📊 Outcome: ${callLog.outcome}\n`;
    }
    
    if (callLog.summary) {
        description += `\n📝 Summary:\n${callLog.summary}\n`;
    }
    
    if (callLog.recordingUrl) {
        description += `\n🎙️ Recording: ${callLog.recordingUrl}\n`;
    }
    
    if (callLog.transcript) {
        // Truncate transcript if too long
        const maxTranscriptLength = 2000;
        const transcript = callLog.transcript.length > maxTranscriptLength 
            ? callLog.transcript.substring(0, maxTranscriptLength) + '...' 
            : callLog.transcript;
        description += `\n📜 Transcript:\n${transcript}`;
    }
    
    return description;
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
// Lead Routes
// ============================================

/**
 * Get lead routes
 */
async function getLeadRoutes(accessToken) {
    return lionDeskRequest(accessToken, 'GET', '/lead-routes');
}

// ============================================
// Teams
// ============================================

/**
 * Get teams
 */
async function getTeams(accessToken) {
    return lionDeskRequest(accessToken, 'GET', '/teams');
}

/**
 * Get team members
 */
async function getTeamMembers(accessToken, teamId) {
    return lionDeskRequest(accessToken, 'GET', `/teams/${teamId}/members`);
}

module.exports = {
    // OAuth
    getAuthorizationUrl,
    exchangeCodeForToken,
    refreshAccessToken,
    
    // Connection
    testConnection,
    getCurrentUser,
    
    // Contacts
    findContactByPhone,
    findContactByEmail,
    getContact,
    createContact,
    updateContact,
    findOrCreateContact,
    getContacts,
    
    // Tasks
    createTask,
    getContactTasks,
    updateTask,
    
    // Tags
    getTags,
    addTagToContact,
    
    // Hotness
    getHotnessLevels,
    updateContactHotness,
    
    // Sources
    getSources,
    createSource,
    findOrCreateVoicorySource,
    
    // Push Call
    pushCallToLionDesk,
    
    // Lead Routes & Teams
    getLeadRoutes,
    getTeams,
    getTeamMembers,
};
