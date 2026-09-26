import { supabase } from './supabase';

export type AppRole = 'admin' | 'operator';

// Authorization is enforced by Supabase RLS; this query only controls the UI.
// A missing role row means the signed-in user can access FV, not admin sections.
export async function fetchAppRole(userId: string): Promise<AppRole> {
  const { data, error } = await supabase.from('app_user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role === 'admin' ? 'admin' : 'operator';
}
