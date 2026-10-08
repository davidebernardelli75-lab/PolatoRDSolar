import { supabase } from './supabase';

export type AppRole = 'admin' | 'operator';

// Authorization is enforced by Supabase RLS; this query only controls the UI.
// Validate the session server-side first so a revoked admin session cannot keep
// rendering privileged navigation from a still-unexpired local JWT.
export async function fetchAppRole(userId: string): Promise<AppRole> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || user.id !== userId) {
    throw new Error('Sessione non valida o revocata.');
  }

  const { data, error } = await supabase.from('app_user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role === 'admin' ? 'admin' : 'operator';
}
