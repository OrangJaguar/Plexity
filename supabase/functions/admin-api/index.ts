/**
 * admin-api — allowlisted admin gateway (ported from Base44 adminApi).
 * Actions: session | feedback.list | feedback.update
 */
import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { HttpError, requireAdmin } from '../_shared/auth.ts';
import { fromSqlRow } from '../_shared/case.ts';

const API_VERSION = 1;
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_ACTIONS = new Set(['session', 'feedback.list', 'feedback.update']);
const FEEDBACK_STATUSES = new Set(['new', 'reviewing', 'resolved', 'closed']);
const MAX_ADMIN_NOTES = 8000;
const MAX_LIST = 500;

function makeRequestId() {
  return `adm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function writeAudit(
  // deno-lint-ignore no-explicit-any
  service: any,
  entry: {
    actorEmail: string;
    actorId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    outcome: 'success' | 'failure';
    requestId: string;
    detail?: string;
  },
) {
  try {
    await service.from('admin_audit_log').insert({
      actor_email: entry.actorEmail,
      actor_id: entry.actorId || '',
      action: entry.action,
      target_type: entry.targetType || '',
      target_id: entry.targetId || '',
      outcome: entry.outcome,
      request_id: entry.requestId,
      detail: (entry.detail || '').slice(0, 500),
      created_at: Date.now(),
    });
  } catch {
    // Audit failure must not break the primary action.
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  const requestId = makeRequestId();

  if (req.method !== 'POST') {
    return jsonResponse({ error: { message: 'Method not allowed.' } }, 405);
  }

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return jsonResponse({ error: { message: 'Content-Type must be application/json.' } }, 415);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return jsonResponse({ error: { message: 'Request body too large.' } }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return jsonResponse({ error: { message: 'Invalid JSON body.' } }, 400);
  }

  const version = Number(body.version ?? API_VERSION);
  if (version !== API_VERSION) {
    return jsonResponse({ error: { message: 'Unsupported API version.' } }, 400);
  }

  const action = String(body.action || '').trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return jsonResponse({ error: { message: 'Unknown or disallowed action.' } }, 400);
  }

  const payload = (body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload))
    ? body.payload as Record<string, unknown>
    : {};

  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: { message: err.message } }, err.status);
    }
    return jsonResponse({ error: { message: 'Authentication required.' } }, 401);
  }

  const { user, email, service } = admin;

  try {
    if (action === 'session') {
      return jsonResponse({
        ok: true,
        requestId,
        data: {
          email,
          role: 'admin',
          version: API_VERSION,
          actions: [...ALLOWED_ACTIONS],
        },
      });
    }

    if (action === 'feedback.list') {
      const { data, error } = await service
        .from('tools_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_LIST);
      if (error) throw error;
      const items = (data ?? []).map((row) => fromSqlRow(row));
      return jsonResponse({
        ok: true,
        requestId,
        data: { items },
      });
    }

    if (action === 'feedback.update') {
      const id = String(payload.id || '').trim();
      if (!id || id.length > 128) {
        return jsonResponse({ error: { message: 'Invalid feedback id.' } }, 400);
      }

      const patch: Record<string, unknown> = { updated_at: Date.now() };
      if (payload.status !== undefined) {
        const status = String(payload.status).trim();
        if (!FEEDBACK_STATUSES.has(status)) {
          return jsonResponse({ error: { message: 'Invalid feedback status.' } }, 400);
        }
        patch.status = status;
      }
      if (payload.adminNotes !== undefined) {
        const notes = String(payload.adminNotes);
        if (notes.length > MAX_ADMIN_NOTES) {
          return jsonResponse({ error: { message: 'Admin notes too long.' } }, 400);
        }
        patch.admin_notes = notes;
      }

      if (Object.keys(patch).length <= 1) {
        return jsonResponse({ error: { message: 'No valid fields to update.' } }, 400);
      }

      const { data: updated, error } = await service
        .from('tools_feedback')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      await writeAudit(service, {
        actorEmail: email,
        actorId: user.id,
        action,
        targetType: 'ToolsFeedback',
        targetId: id,
        outcome: 'success',
        requestId,
        detail: Object.keys(patch).filter((k) => k !== 'updated_at').join(','),
      });

      return jsonResponse({
        ok: true,
        requestId,
        data: fromSqlRow(updated),
      });
    }

    return jsonResponse({ error: { message: 'Unknown or disallowed action.' } }, 400);
  } catch {
    await writeAudit(service, {
      actorEmail: email,
      actorId: user.id,
      action,
      outcome: 'failure',
      requestId,
      detail: 'handler_error',
    });
    return jsonResponse({ error: { message: 'Admin action failed.' } }, 500);
  }
});
