import { createClient } from '@supabase/supabase-js';

// These will be loaded from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// For admin panel, prefer service role key (bypasses RLS for full data access)
// Falls back to anon key if service role not available
const adminKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!supabaseUrl) {
    console.error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseServiceRoleKey) {
    console.warn('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY not set. Admin panel will have limited data access due to RLS.');
    console.warn('   Add VITE_SUPABASE_SERVICE_ROLE_KEY to admin/.env.local for full admin access.');
}

// Create admin client with service role key (bypasses RLS)
export const supabase = createClient(supabaseUrl, adminKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Backend API URL
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.voicory.com';
