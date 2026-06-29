import { requireAuth } from '@/api/requireAuth';
import { getStorageContext } from '@/api/storage-context';
import { stripJournalHtml, wordCountFromHtml } from '@/lib/tools/journal-text';
import { safeCreate, safeDelete, safeFilter, safeUpdate, safeList } from '@/api/entities/toolsApi';
import {
  GUEST_KEYS,
  guestDeleteBy,
  guestFindBy,
  guestUpsertBy,
  readGuestArray,
  writeGuestArray,
} from '@/lib/storage/guest-store';

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
  const ctx = await getStorageContext();
  if (ctx.mode === 'guest') {
    return guestFindBy(readGuestArray(GUEST_KEYS.journal), 'dateKey', dateKey);
  }
  await requireAuth();
  const rows = await safeFilter('ToolsJournalEntry', { dateKey });
  return rows[0] ?? null;
}

export async function listEntries() {
  const ctx = await getStorageContext();
  if (ctx.mode === 'guest') return readGuestArray(GUEST_KEYS.journal);
  await requireAuth();
  return safeList('ToolsJournalEntry');
}

export async function upsertEntry(dateKey, patch) {
  const ctx = await getStorageContext();
  const fields = normalizePatch(patch);
  const content = fields.content ?? '';
  const rows = ctx.mode === 'guest'
    ? readGuestArray(GUEST_KEYS.journal)
    : await safeFilter('ToolsJournalEntry', { dateKey });
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
    if (ctx.mode === 'guest') {
      if (guestFindBy(rows, 'dateKey', dateKey)) {
        writeGuestArray(GUEST_KEYS.journal, guestDeleteBy(rows, 'dateKey', dateKey));
      }
      return null;
    }
    if (rows[0]) {
      await safeDelete('ToolsJournalEntry', rows[0].id);
    }
    return null;
  }

  if (ctx.mode === 'guest') {
    const existing = guestFindBy(rows, 'dateKey', dateKey);
    if (existing) {
      const next = guestUpsertBy(rows, 'dateKey', dateKey, {
        ...existing,
        ...payload,
        mood: fields.mood !== undefined ? payload.mood : existing.mood,
        tags: fields.tags !== undefined ? payload.tags : existing.tags,
        comments: fields.comments !== undefined ? payload.comments : existing.comments,
      });
      writeGuestArray(GUEST_KEYS.journal, next);
      return guestFindBy(next, 'dateKey', dateKey);
    }
    const row = {
      id: dateKey,
      userEmail: 'guest@local',
      dateKey,
      mood: fields.mood || null,
      tags: fields.tags || [],
      comments: fields.comments || [],
      ...payload,
    };
    writeGuestArray(GUEST_KEYS.journal, [...rows, row]);
    return row;
  }

  const user = await requireAuth();
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
  const ctx = await getStorageContext();
  if (ctx.mode === 'guest') {
    const rows = readGuestArray(GUEST_KEYS.journal);
    writeGuestArray(GUEST_KEYS.journal, guestDeleteBy(rows, 'dateKey', dateKey));
    return;
  }
  await requireAuth();
  const rows = await safeFilter('ToolsJournalEntry', { dateKey });
  if (rows[0]) {
    await safeDelete('ToolsJournalEntry', rows[0].id);
  }
}
