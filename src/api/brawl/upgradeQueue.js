import { requireAuth } from '@/api/requireAuth';
import { getSupabase } from '@/api/supabaseClient';
import { getMyBrawlTrio } from '@/api/brawl/trio';

export async function listBrawlUpgradeQueue() {
  const mine = await getMyBrawlTrio();
  if (!mine) return [];
  const { data, error } = await getSupabase()
    .from('brawl_upgrade_queue')
    .select('*')
    .eq('trio_id', mine.trio.id)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** @param {number} brawlerId */
export async function addBrawlUpgradeQueueItem(brawlerId) {
  const user = await requireAuth();
  const mine = await getMyBrawlTrio();
  if (!mine?.isAdmin) throw new Error('Only the trio admin can edit the upgrade queue.');

  const existing = await listBrawlUpgradeQueue();
  const { data, error } = await getSupabase()
    .from('brawl_upgrade_queue')
    .upsert({
      trio_id: mine.trio.id,
      brawler_id: Number(brawlerId),
      sort_order: existing.length,
      added_by: user.id,
      created_at: Date.now(),
    }, { onConflict: 'trio_id,brawler_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** @param {string} rowId */
export async function removeBrawlUpgradeQueueItem(rowId) {
  const mine = await getMyBrawlTrio();
  if (!mine?.isAdmin) throw new Error('Only the trio admin can edit the upgrade queue.');
  const { error } = await getSupabase()
    .from('brawl_upgrade_queue')
    .delete()
    .eq('id', rowId)
    .eq('trio_id', mine.trio.id);
  if (error) throw error;
}
