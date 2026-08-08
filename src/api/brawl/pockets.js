import { requireAuth } from '@/api/requireAuth';
import { getSupabase } from '@/api/supabaseClient';

export const BRAWL_POCKET_AVOID_CAP = 8;

/** @returns {Promise<{ pockets: object[], avoids: object[] }>} */
export async function listBrawlPocketsAvoids() {
  const user = await requireAuth();
  const { data, error } = await getSupabase()
    .from('brawl_pockets_avoids')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  return {
    pockets: rows.filter((r) => r.kind === 'pocket'),
    avoids: rows.filter((r) => r.kind === 'avoid'),
  };
}

/**
 * @param {'pocket' | 'avoid'} kind
 * @param {number} brawlerId
 */
export async function addBrawlPocketOrAvoid(kind, brawlerId) {
  const user = await requireAuth();
  const id = Number(brawlerId);
  if (!Number.isFinite(id)) throw new Error('Invalid brawler.');

  const { data: existing, error: listError } = await getSupabase()
    .from('brawl_pockets_avoids')
    .select('id, kind')
    .eq('user_id', user.id);
  if (listError) throw listError;

  const sameKind = (existing ?? []).filter((r) => r.kind === kind);
  if (sameKind.length >= BRAWL_POCKET_AVOID_CAP) {
    throw new Error(`You can pin at most ${BRAWL_POCKET_AVOID_CAP} ${kind}s.`);
  }

  const { data, error } = await getSupabase()
    .from('brawl_pockets_avoids')
    .upsert({
      user_id: user.id,
      brawler_id: id,
      kind,
      mode: '',
      created_at: Date.now(),
    }, { onConflict: 'user_id,brawler_id,kind,mode' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** @param {string} rowId */
export async function removeBrawlPocketOrAvoid(rowId) {
  const user = await requireAuth();
  const { error } = await getSupabase()
    .from('brawl_pockets_avoids')
    .delete()
    .eq('id', rowId)
    .eq('user_id', user.id);
  if (error) throw error;
}
