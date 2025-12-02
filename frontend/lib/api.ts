/**
 * API Helper Utilities
 * Provides authenticated fetch wrapper for backend API calls
 * 
 * @module lib/api
 */

import { supabase } from '../services/supabase';
import { API } from './constants';

/**
 * Get the current user's JWT token for API authentication
 * @returns The access token or null if not authenticated
 */
export const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
};

/**
 * Get authorization headers for authenticated API calls
 * @returns Headers object with Authorization bearer token
 * @throws Error if user is not authenticated
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAuthToken();
    if (!token) {
        throw new Error('Not authenticated. Please log in again.');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

/**
 * Authenticated fetch wrapper for backend API calls
 * Automatically includes JWT token in Authorization header
 * 
 * @param endpoint - API endpoint (e.g., '/api/test-chat')
 * @param options - Fetch options (method, body, etc.)
 * @returns Fetch response
 * @throws Error if not authenticated or request fails
 * 
 * @example
 * const response = await authFetch('/api/generate-prompt', {
 *     method: 'POST',
 *     body: JSON.stringify({ description: 'My AI agent' }),
 * });
 */
export const authFetch = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    const headers = await getAuthHeaders();
    
    const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${API.BACKEND_URL}${endpoint}`;
    
    return fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    });
};

/**
 * Authenticated JSON fetch - automatically parses response
 * 
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Parsed JSON response
 * @throws Error with message from API if request fails
 */
export const authFetchJson = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const response = await authFetch(endpoint, options);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
};
