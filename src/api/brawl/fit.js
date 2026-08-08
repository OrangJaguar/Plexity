import { requireAuth } from '@/api/requireAuth';
import { getSupabase } from '@/api/supabaseClient';
import { listBrawlRoster, getBrawlPlayerLink } from '@/api/brawl/playerLink';
import { listBrawlPocketsAvoids } from '@/api/brawl/pockets';
import { fetchBrawlBattlelog } from '@/api/brawl/client';
import {
  computeFitForRoster,
  familiarityFromBattlelog,
} from '@/lib/tools/brawl/fit-engine';

/**
 * Recompute and persist fit cache for the current user.
 */
export async function recomputeBrawlFitCache() {
  const user = await requireAuth();
  const [roster, link, pins] = await Promise.all([
    listBrawlRoster(),
    getBrawlPlayerLink(),
    listBrawlPocketsAvoids(),
  ]);

  /** @type {Record<number, number>} */
  let familiarity = {};
  if (link?.player_tag) {
    try {
      const log = await fetchBrawlBattlelog(link.player_tag);
      familiarity = familiarityFromBattlelog(log);
    } catch {
      familiarity = {};
    }
  }

  const pocketIds = new Set(pins.pockets.map((p) => Number(p.brawler_id)));
  const avoidIds = new Set(pins.avoids.map((p) => Number(p.brawler_id)));
  const player = {
    ...(link?.player_snapshot || {}),
    trophies: link?.player_snapshot?.trophies,
    highestTrophies: link?.player_snapshot?.highestTrophies,
  };

  const results = computeFitForRoster(roster, pocketIds, avoidIds, familiarity, player);
  const now = Date.now();

  const { error: delError } = await getSupabase()
    .from('brawl_fit_cache')
    .delete()
    .eq('user_id', user.id);
  if (delError) throw delError;

  if (results.length) {
    const rows = results.map((r) => ({
      user_id: user.id,
      brawler_id: r.brawlerId,
      fit: r.fit,
      confidence: r.confidence,
      signals: r.signals,
      computed_at: now,
    }));
    const { error: insError } = await getSupabase()
      .from('brawl_fit_cache')
      .insert(rows);
    if (insError) throw insError;
  }

  return results;
}

export async function listBrawlFitCache() {
  const user = await requireAuth();
  const { data, error } = await getSupabase()
    .from('brawl_fit_cache')
    .select('*')
    .eq('user_id', user.id)
    .order('fit', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
