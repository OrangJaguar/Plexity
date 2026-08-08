import { requireAuth } from '@/api/requireAuth';
import { getSupabase } from '@/api/supabaseClient';

const WEEKLY_LABEL = 'weekly-global';

/** Latest admin weekly meta prior (map pool / tier notes). */
export async function getWeeklyBrawlMetaPrior() {
  const { data, error } = await getSupabase()
    .from('brawl_meta_priors')
    .select('*')
    .eq('label', WEEKLY_LABEL)
    .order('updated_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data?.[0] || null;
}

/**
 * App-admin weekly notes (tier / map pool JSON or text in payload).
 * @param {{ notes?: string, tiers?: object, mapPool?: string[] }} payload
 */
export async function saveWeeklyBrawlMetaPrior(payload) {
  const user = await requireAuth();
  const now = Date.now();
  const existing = await getWeeklyBrawlMetaPrior();

  if (existing && existing.owner_user_id === user.id) {
    const { data, error } = await getSupabase()
      .from('brawl_meta_priors')
      .update({
        payload: { ...existing.payload, ...payload },
        updated_at: now,
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await getSupabase()
    .from('brawl_meta_priors')
    .insert({
      owner_user_id: user.id,
      trio_id: null,
      label: WEEKLY_LABEL,
      payload: payload || {},
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
