import { requireAuth } from '@/api/requireAuth';
import { getStorageContext } from '@/api/storage-context';
import { DEFAULT_EVENT_COLOR } from '@/lib/tools/constants';
import { safeCreate, safeDelete, safeFilter, safeList, safeUpdate } from '@/api/entities/toolsApi';
import {
  GUEST_KEYS,
  guestDeleteBy,
  guestFindBy,
  guestUpsertBy,
  readGuestArray,
  writeGuestArray,
} from '@/lib/storage/guest-store';

export async function listEvents() {
  const ctx = await getStorageContext();
  if (ctx.mode === 'guest') return readGuestArray(GUEST_KEYS.calendar);
  await requireAuth();
  return safeList('ToolsCalendarEvent');
}

export async function createEvent(payload) {
  const ctx = await getStorageContext();
  const now = Date.now();
  const eventId = crypto.randomUUID();
  const row = {
    id: eventId,
    eventId,
    userEmail: ctx.mode === 'cloud' ? ctx.userEmail : 'guest@local',
    title: payload.title,
    start: payload.start,
    end: payload.end,
    allDay: payload.allDay ?? false,
    color: payload.color || DEFAULT_EVENT_COLOR,
    repeatRule: payload.repeatRule || 'none',
    repeatIntervalWeeks: payload.repeatIntervalWeeks ?? 1,
    repeatDays: payload.repeatDays || [],
    linkedJourneyIds: payload.linkedJourneyIds || [],
    instanceOverrides: payload.instanceOverrides || [],
    notes: payload.notes || '',
    createdAt: now,
    updatedAt: now,
  };

  if (ctx.mode === 'guest') {
    const rows = readGuestArray(GUEST_KEYS.calendar);
    writeGuestArray(GUEST_KEYS.calendar, [...rows, row]);
    return row;
  }

  const user = await requireAuth();
  return safeCreate('ToolsCalendarEvent', { ...row, userEmail: user.email });
}

export async function updateEvent(eventId, patch) {
  const ctx = await getStorageContext();
  const next = { ...patch, updatedAt: Date.now() };

  if (ctx.mode === 'guest') {
    const rows = readGuestArray(GUEST_KEYS.calendar);
    const existing = guestFindBy(rows, 'eventId', eventId);
    if (!existing) throw new Error(`Event not found: ${eventId}`);
    const updated = guestUpsertBy(rows, 'eventId', eventId, { ...existing, ...next });
    writeGuestArray(GUEST_KEYS.calendar, updated);
    return guestFindBy(updated, 'eventId', eventId);
  }

  await requireAuth();
  const rows = await safeFilter('ToolsCalendarEvent', { eventId });
  const existing = rows[0];
  if (!existing) throw new Error(`Event not found: ${eventId}`);
  return safeUpdate('ToolsCalendarEvent', existing.id, next);
}

export async function deleteEvent(eventId) {
  const ctx = await getStorageContext();
  if (ctx.mode === 'guest') {
    const rows = readGuestArray(GUEST_KEYS.calendar);
    writeGuestArray(GUEST_KEYS.calendar, guestDeleteBy(rows, 'eventId', eventId));
    return;
  }
  await requireAuth();
  const rows = await safeFilter('ToolsCalendarEvent', { eventId });
  const existing = rows[0];
  if (!existing) return;
  await safeDelete('ToolsCalendarEvent', existing.id);
}
