import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const SUPABASE_AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

export const clearLocalSupabaseAuth = () => {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && (key === SUPABASE_AUTH_STORAGE_KEY || key.startsWith(`${SUPABASE_AUTH_STORAGE_KEY}-`))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export const STORAGE_BUCKET = 'solar-archive';
export const QUOTE_FILES_BUCKET = 'quote-files';
