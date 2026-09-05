import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://bfmiroppljtfsejuzpwc.supabase.co';

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_vMgP1_Lxspc0mdS0eMJKKw_86WErYaH';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export const STORAGE_BUCKET = 'solar-archive';
