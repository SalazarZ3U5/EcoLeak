import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, isSupabaseConfigured } from './authConfig';

let supabase = null;

if (isSupabaseConfigured()) {
  try {
    supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  } catch (err) {
    console.warn('Supabase client initialization warning:', err);
  }
}

/**
 * Sign in with email and password via Supabase Auth
 */
export async function loginWithSupabaseEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

/**
 * Sign up with email and password via Supabase Auth
 */
export async function registerWithSupabaseEmail(email, password, metadata = {}) {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
  if (error) throw error;
  return data.user;
}

/**
 * Sign out from Supabase Auth
 */
export async function logoutSupabase() {
  if (supabase) {
    await supabase.auth.signOut();
  }
}

export { supabase };
