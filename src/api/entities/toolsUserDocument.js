import { requireAuth } from '@/api/requireAuth';
import { getStorageContext } from '@/api/storage-context';
import { hasToolsEntity, safeCreate, safeFilter, safeUpdate } from '@/api/entities/toolsApi';
import {
  GUEST_ENTITY_KEYS,
  readGuestJson,
  writeGuestJson,
} from '@/lib/storage/guest-store';
import { migratedKey } from '@/lib/storage/storage-keys';

function readLegacyLocal(key) {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearLegacyLocal(key, entityName) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
    window.localStorage.setItem(migratedKey(entityName), '1');
  } catch { /* ignore */ }
}

function rowToDocument(row, normalize) {
  if (!row) return null;
  const base = row.document && typeof row.document === 'object' ? row.document : row;
  return normalize({
    ...base,
    userEmail: row.userEmail,
    updatedAt: row.updatedAt ?? base.updatedAt,
  });
}

function toEntityPayload(doc, userEmail) {
  const { id: _id, userEmail: _email, updatedAt, ...document } = doc;
  return {
    userEmail,
    updatedAt: updatedAt ?? Date.now(),
    document,
  };
}

function guestKeyForEntity(entityName) {
  return GUEST_ENTITY_KEYS[entityName] ?? null;
}

/**
 * One Base44 row per user — document field holds the workspace JSON.
 */
export async function getOrCreateUserDocument(entityName, {
  empty,
  normalize,
  legacyStorageKey = null,
}) {
  const ctx = await getStorageContext();
  const guestKey = guestKeyForEntity(entityName);

  if (ctx.mode === 'guest' && guestKey) {
    const stored = readGuestJson(guestKey, null);
    return normalize(stored ?? empty());
  }

  const user = await requireAuth();
  const legacy = readLegacyLocal(legacyStorageKey);
  const alreadyMigrated = typeof window !== 'undefined'
    && window.localStorage.getItem(migratedKey(entityName)) === '1';

  if (!hasToolsEntity(entityName)) {
    return normalize({ ...(legacy ?? empty()), userEmail: user.email });
  }

  try {
    const rows = await safeFilter(entityName, { userEmail: user.email });
    const existing = rows[0];

    if (existing) {
      const serverDoc = rowToDocument(existing, normalize);
      if (legacy && !alreadyMigrated) {
        const localDoc = normalize(legacy);
        if ((localDoc.updatedAt ?? 0) > (serverDoc.updatedAt ?? 0)) {
          const saved = await saveUserDocument(entityName, localDoc, { normalize, legacyStorageKey });
          clearLegacyLocal(legacyStorageKey, entityName);
          return saved;
        }
        clearLegacyLocal(legacyStorageKey, entityName);
      }
      return serverDoc;
    }

    const initial = normalize(legacy ?? empty());
    const saved = await saveUserDocument(entityName, initial, { normalize, legacyStorageKey });
    if (legacy) clearLegacyLocal(legacyStorageKey, entityName);
    return saved;
  } catch {
    return normalize({ ...(legacy ?? empty()), userEmail: user.email });
  }
}

export async function saveUserDocument(entityName, doc, {
  normalize,
  legacyStorageKey = null,
}) {
  const ctx = await getStorageContext();
  const guestKey = guestKeyForEntity(entityName);
  const normalized = normalize({
    ...doc,
    userEmail: ctx.mode === 'cloud' ? ctx.userEmail : 'guest@local',
    updatedAt: Date.now(),
  });

  if (ctx.mode === 'guest' && guestKey) {
    writeGuestJson(guestKey, normalized);
    return normalized;
  }

  const user = await requireAuth();
  normalized.userEmail = user.email;

  if (!hasToolsEntity(entityName)) {
    return normalized;
  }

  const payload = toEntityPayload(normalized, user.email);

  try {
    const rows = await safeFilter(entityName, { userEmail: user.email });
    const existing = rows[0];
    if (existing?.id) {
      const updated = await safeUpdate(entityName, existing.id, payload);
      if (legacyStorageKey) clearLegacyLocal(legacyStorageKey, entityName);
      return rowToDocument(updated, normalize) ?? normalized;
    }
    const created = await safeCreate(entityName, payload);
    if (legacyStorageKey) clearLegacyLocal(legacyStorageKey, entityName);
    return rowToDocument(created, normalize) ?? normalized;
  } catch {
    return normalized;
  }
}
