import { requireAuth } from '@/api/requireAuth';
import { DEFAULT_EVENT_COLOR } from '@/lib/tools/constants';
import { safeCreate, safeDelete, safeFilter, safeList, safeUpdate } from '@/api/entities/toolsApi';

export async function listEvents() {
  await requireAuth();
  return safeList('ToolsCalendarEvent');
}

export async function createEvent(payload) {
  const user = await requireAuth();
  const now = Date.now();
  const eventId = crypto.randomUUID();
  const row = {
    id: eventId,
    eventId,
    userEmail: user.email,
    title: payload.title,
    start: payload.start,
    end: payload.end,
    allDay: payload.allDay ?? false,
    color: payload.color || DEFAULT_EVENT_COLOR,
    repeatRule: payload.repeatRule || 'none',
    repeatIntervalWeeks: payload.repeatIntervalWeeks ?? 1,
    repeatDays: payload.repeatDays || [],
    instanceOverrides: payload.instanceOverrides || [],
    notes: payload.notes || '',
    createdAt: now,
    updatedAt: now,
  };
  return safeCreate('ToolsCalendarEvent', row);
}

export async function updateEvent(eventId, patch) {
  await requireAuth();
  const next = { ...patch, updatedAt: Date.now() };
  const rows = await safeFilter('ToolsCalendarEvent', { eventId });
  const existing = rows[0];
  if (!existing) throw new Error(`Event not found: ${eventId}`);
  return safeUpdate('ToolsCalendarEvent', existing.id, next);
}

export async function deleteEvent(eventId) {
  await requireAuth();
  const rows = await safeFilter('ToolsCalendarEvent', { eventId });
  const existing = rows[0];
  if (!existing) return;
  await safeDelete('ToolsCalendarEvent', existing.id);
}
