import { requireAuth } from '@/api/requireAuth';
import { stripJournalHtml, wordCountFromHtml } from '@/lib/tools/journal-text';
import { safeCreate, safeDelete, safeFilter, safeUpdate, safeList } from '@/api/entities/toolsApi';

function normalizePatch(patch) {
  if (typeof patch === 'string') return { content: patch };
  const { dateKey: _dateKey, ...rest } = patch || {};
  return rest;
}

function entryHasPersistedData(fields) {
  const plain = stripJournalHtml(fields.content || '');
  return plain.length > 0
    || !!fields.mood
    || (fields.tags?.length > 0)
    || (fields.comments?.length > 0);
}

export async function getEntry(dateKey) {
  await requireAuth();
  const rows = await safeFilter('ToolsJournalEntry', { dateKey });
  return rows[0] ?? null;
}

export async function listEntries() {
  await requireAuth();
  return safeList('ToolsJournalEntry');
}

export async function upsertEntry(dateKey, patch) {
  const user = await requireAuth();
  const fields = normalizePatch(patch);
  const content = fields.content ?? '';
  const plain = stripJournalHtml(content);
  const rows = await safeFilter('ToolsJournalEntry', { dateKey });
  const now = Date.now();

  const payload = {
    content,
    updatedAt: now,
  };

  if (fields.mood !== undefined) payload.mood = fields.mood || null;
  if (fields.tags !== undefined) payload.tags = fields.tags;
  if (fields.comments !== undefined) payload.comments = fields.comments;
  payload.wordCount = fields.wordCount ?? wordCountFromHtml(content);

  if (!entryHasPersistedData({ ...fields, content })) {
    if (rows[0]) {
      await safeDelete('ToolsJournalEntry', rows[0].id);
    }
    return null;
  }

  if (rows[0]) {
    const existing = rows[0];
    return safeUpdate('ToolsJournalEntry', existing.id, {
      ...payload,
      mood: fields.mood !== undefined ? payload.mood : existing.mood,
      tags: fields.tags !== undefined ? payload.tags : existing.tags,
      comments: fields.comments !== undefined ? payload.comments : existing.comments,
    });
  }

  return safeCreate('ToolsJournalEntry', {
    userEmail: user.email,
    dateKey,
    mood: fields.mood || null,
    tags: fields.tags || [],
    comments: fields.comments || [],
    ...payload,
  });
}

export async function deleteEntry(dateKey) {
  await requireAuth();
  const rows = await safeFilter('ToolsJournalEntry', { dateKey });
  if (rows[0]) {
    await safeDelete('ToolsJournalEntry', rows[0].id);
  }
}
