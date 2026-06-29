import { base44 } from '@/api/base44Client';

function entity(name) {
  return base44.entities?.[name] ?? null;
}

export function hasToolsEntity(name) {
  return !!entity(name);
}

export async function safeList(entityName) {
  const api = entity(entityName);
  if (!api?.list) return [];
  try {
    const rows = await api.list();
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.warn(`[tools] ${entityName}.list failed`, err);
    return [];
  }
}

export async function safeFilter(entityName, filter) {
  const api = entity(entityName);
  if (!api?.filter) return [];
  try {
    const rows = await api.filter(filter);
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.warn(`[tools] ${entityName}.filter failed`, err);
    return [];
  }
}

export async function safeCreate(entityName, payload) {
  const api = entity(entityName);
  if (!api?.create) {
    throw new Error(`Tools entity "${entityName}" is not available. Deploy base44 schemas first.`);
  }
  return api.create(payload);
}

export async function safeUpdate(entityName, id, payload) {
  const api = entity(entityName);
  if (!api?.update) {
    throw new Error(`Tools entity "${entityName}" is not available. Deploy base44 schemas first.`);
  }
  return api.update(id, payload);
}

export async function safeDelete(entityName, id) {
  const api = entity(entityName);
  if (!api?.delete) return;
  await api.delete(id);
}
