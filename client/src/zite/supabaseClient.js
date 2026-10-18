import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL
  || import.meta.env.SUPABASE_URL_3
  || import.meta.env.SUPABASE_URL
  || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.SUPABASE_PUBLISHABLE_KEY_3
  || import.meta.env.SUPABASE_PUBLISHABLE_KEY
  || '').trim();

function isValidSupabaseUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  isValidSupabaseUrl(rawUrl) &&
  rawKey &&
  !rawUrl.includes('placeholder')
);

const url = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const key = isSupabaseConfigured ? rawKey : 'placeholder-anon-key';

export const supabase = createClient(url, key);
