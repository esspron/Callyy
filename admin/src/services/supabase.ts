import { createClient } from '@supabase/supabase-js';

// These will be loaded from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Backend API URL
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://callyy-production.up.railway.app';
