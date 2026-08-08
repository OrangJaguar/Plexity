import { requireAuth } from '@/api/requireAuth';
import { getSupabase } from '@/api/supabaseClient';
import { getMyBrawlTrio } from '@/api/brawl/trio';
import { createEmptyDraftState } from '@/lib/tools/brawl/draft-score';

export async function getSoloDraftSession() {
  const user = await requireAuth();
  const { data, error } = await getSupabase()
    .from('brawl_draft_sessions')
    .select('*')
    .eq('scope', 'solo')
    .eq('owner_user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertSoloDraftSession(state) {
  const user = await requireAuth();
  const now = Date.now();
  const payload = {
    scope: 'solo',
    owner_user_id: user.id,
    trio_id: null,
    state: { ...createEmptyDraftState(), ...state, updatedAt: now },
    updated_at: now,
  };
  const existing = await getSoloDraftSession();
  if (existing) {
    const { data, error } = await getSupabase()
      .from('brawl_draft_sessions')
      .update({ state: payload.state, updated_at: now })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await getSupabase()
    .from('brawl_draft_sessions')
    .insert({ ...payload, created_at: now })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getTrioDraftSession() {
  const mine = await getMyBrawlTrio();
  if (!mine) return null;
  const { data, error } = await getSupabase()
    .from('brawl_draft_sessions')
    .select('*')
    .eq('scope', 'trio')
    .eq('trio_id', mine.trio.id)
    .maybeSingle();
  if (error) throw error;
  return data ? { session: data, trio: mine } : { session: null, trio: mine };
}

export async function upsertTrioDraftSession(state) {
  const user = await requireAuth();
  const mine = await getMyBrawlTrio();
  if (!mine?.isAdmin) throw new Error('Only the trio admin can edit the draft board.');

  const now = Date.now();
  const nextState = { ...createEmptyDraftState(), ...state, updatedAt: now };
  const existingBundle = await getTrioDraftSession();
  const existing = existingBundle?.session;

  if (existing) {
    const { data, error } = await getSupabase()
      .from('brawl_draft_sessions')
      .update({ state: nextState, updated_at: now })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await getSupabase()
    .from('brawl_draft_sessions')
    .insert({
      scope: 'trio',
      owner_user_id: user.id,
      trio_id: mine.trio.id,
      state: nextState,
      updated_at: now,
      created_at: now,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** @param {(payload: object) => void} onChange */
export function subscribeTrioDraftSession(trioId, onChange) {
  const client = getSupabase();
  const channel = client
    .channel(`brawl-draft-${trioId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'brawl_draft_sessions',
        filter: `trio_id=eq.${trioId}`,
      },
      (payload) => onChange(payload),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
