/**
 * OAuth State Management
 * 
 * Secure state generation and verification for OAuth flows.
 * Uses HMAC-signed tokens with nonce and expiry to prevent CSRF attacks.
 */

const crypto = require('crypto');

// State tokens expire after 10 minutes
const STATE_EXPIRY_MS = 10 * 60 * 1000;

// In-memory state store (in production, use Redis)
// Map<stateToken, { userId, nonce, expiresAt }>
const stateStore = new Map();

// Clean up expired states every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of stateStore.entries()) {
        if (data.expiresAt < now) {
            stateStore.delete(token);
        }
    }
}, 5 * 60 * 1000);

/**
 * Get the signing key for HMAC
 * Falls back to a random key if not configured (logs warning)
 */
function getSigningKey() {
    const key = process.env.OAUTH_STATE_SECRET || process.env.ENCRYPTION_KEY;
    
    if (!key) {
        console.warn('⚠️ OAUTH_STATE_SECRET not set - using random key (states won\'t survive restarts)');
        // Generate and cache a random key for this process
        if (!getSigningKey._fallbackKey) {
            getSigningKey._fallbackKey = crypto.randomBytes(32).toString('hex');
        }
        return getSigningKey._fallbackKey;
    }
    
    return key;
}

/**
 * Generate a secure OAuth state token
 * 
 * @param {string} userId - The user initiating the OAuth flow
 * @param {string} provider - The OAuth provider (e.g., 'liondesk')
 * @returns {string} - A signed state token
 */
function generateOAuthState(userId, provider) {
    if (!userId) {
        throw new Error('userId is required for OAuth state');
    }
    
    // Generate random nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + STATE_EXPIRY_MS;
    
    // Create payload
    const payload = {
        userId,
        provider,
        nonce,
        exp: expiresAt,
    };
    
    // Sign the payload
    const payloadStr = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', getSigningKey())
        .update(payloadStr)
        .digest('hex');
    
    // Combine payload and signature
    const stateToken = Buffer.from(JSON.stringify({
        p: payloadStr,
        s: signature,
    })).toString('base64url');
    
    // Store in memory for additional verification
    stateStore.set(stateToken, {
        userId,
        provider,
        nonce,
        expiresAt,
        used: false,
    });
    
    return stateToken;
}

/**
 * Verify an OAuth state token
 * 
 * @param {string} stateToken - The state token from the callback
 * @param {string} expectedUserId - Optional: verify against a specific user
 * @returns {{ valid: boolean, userId?: string, provider?: string, error?: string }}
 */
function verifyOAuthState(stateToken, expectedUserId = null) {
    if (!stateToken) {
        return { valid: false, error: 'Missing state token' };
    }
    
    try {
        // Decode the token
        const decoded = JSON.parse(Buffer.from(stateToken, 'base64url').toString());
        const { p: payloadStr, s: signature } = decoded;
        
        if (!payloadStr || !signature) {
            return { valid: false, error: 'Malformed state token' };
        }
        
        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', getSigningKey())
            .update(payloadStr)
            .digest('hex');
        
        if (!crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        )) {
            return { valid: false, error: 'Invalid state signature' };
        }
        
        // Parse payload
        const payload = JSON.parse(payloadStr);
        const { userId, provider, nonce, exp } = payload;
        
        // Check expiry
        if (Date.now() > exp) {
            return { valid: false, error: 'State token expired' };
        }
        
        // Check against store (prevents replay attacks)
        const stored = stateStore.get(stateToken);
        if (!stored) {
            return { valid: false, error: 'State token not found (may have expired or been used)' };
        }
        
        if (stored.used) {
            return { valid: false, error: 'State token already used' };
        }
        
        // Verify stored data matches
        if (stored.userId !== userId || stored.nonce !== nonce) {
            return { valid: false, error: 'State token mismatch' };
        }
        
        // Check expected user if provided
        if (expectedUserId && userId !== expectedUserId) {
            return { valid: false, error: 'State token user mismatch' };
        }
        
        // Mark as used and remove from store
        stored.used = true;
        stateStore.delete(stateToken);
        
        return {
            valid: true,
            userId,
            provider,
        };
        
    } catch (error) {
        console.error('OAuth state verification error:', error);
        return { valid: false, error: 'Failed to verify state token' };
    }
}

/**
 * Invalidate a state token (e.g., if user cancels)
 */
function invalidateOAuthState(stateToken) {
    stateStore.delete(stateToken);
}

module.exports = {
    generateOAuthState,
    verifyOAuthState,
    invalidateOAuthState,
};
