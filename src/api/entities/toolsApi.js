import { requireAuth } from '@/api/requireAuth';
import { getSupabase } from '@/api/supabaseClient';
import {
  fromSqlRow,
  isKnownToolsEntity,
  tableForEntity,
  toSqlFilter,
  toSqlRow,
} from '@/api/entities/supabaseMap';

export function hasToolsEntity(name) {
  return isKnownToolsEntity(name);
}

function assertTable(entityName) {
  const table = tableForEntity(entityName);
  if (!table) {
    throw new Error(`Tools entity "${entityName}" has no Supabase table mapping.`);
  }
  return table;
}

export async function safeList(entityName) {
  try {
    const table = assertTable(entityName);
    const user = await requireAuth();
    const { data, error } = await getSupabase()
      .from(table)
      .select('*')
      .eq('user_id', user.id);
    if (error) throw error;
    return (data ?? []).map((row) => fromSqlRow(row));
  } catch (err) {
    console.warn(`[tools] ${entityName}.list failed`, err);
    return [];
  }
}

export async function safeFilter(entityName, filter) {
  try {
    const table = assertTable(entityName);
    const user = await requireAuth();
    let query = getSupabase().from(table).select('*').eq('user_id', user.id);
    const sqlFilter = toSqlFilter(filter);
    for (const [key, value] of Object.entries(sqlFilter)) {
      if (key === 'user_id' || key === 'user_email') continue;
      query = query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => fromSqlRow(row));
  } catch (err) {
    console.warn(`[tools] ${entityName}.filter failed`, err);
    return [];
  }
}

export async function safeCreate(entityName, payload) {
  const table = assertTable(entityName);
  const user = await requireAuth();
  const row = {
    ...toSqlRow(payload, { stripId: true }),
    user_id: user.id,
    user_email: payload.userEmail ?? user.email,
  };
  const { data, error } = await getSupabase()
    .from(table)
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return fromSqlRow(data);
}

export async function safeUpdate(entityName, id, payload) {
  const table = assertTable(entityName);
  const user = await requireAuth();
  const patch = toSqlRow(payload, { stripId: true });
  delete patch.user_id;
  if (payload.userEmail != null) patch.user_email = payload.userEmail;
  const { data, error } = await getSupabase()
    .from(table)
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  return fromSqlRow(data);
}

export async function safeDelete(entityName, id) {
  const table = assertTable(entityName);
  const user = await requireAuth();
  const { error } = await getSupabase()
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
}
