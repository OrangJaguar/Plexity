/**
 * submit-feedback — authenticated feedback intake (ported from Base44 submitFeedback).
 */
import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { getServiceClient, HttpError, requireUser } from '../_shared/auth.ts';

const FEEDBACK_TYPES = new Set(['bug', 'feature', 'general']);
const SEVERITIES = new Set(['low', 'medium', 'high']);
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 8000;
const MAX_FIELD = 4000;
const RATE_MAX = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);
  return 'unknown';
}

function checkRequestRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now > entry.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

function randomSuffix() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function buildRequestId(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `PLX-${y}${m}${d}-${randomSuffix()}`;
}

function validatePayload(body: Record<string, unknown>) {
  const type = String(body?.type || '').trim();
  if (!FEEDBACK_TYPES.has(type)) {
    return { ok: false as const, message: 'Invalid feedback type.' };
  }

  const subject = String(body?.subject || '').trim();
  const message = String(body?.message || '').trim();
  if (!subject) return { ok: false as const, message: 'Subject is required.' };
  if (subject.length > MAX_SUBJECT) return { ok: false as const, message: 'Subject is too long.' };
  if (!message) return { ok: false as const, message: 'Message is required.' };
  if (message.length > MAX_MESSAGE) return { ok: false as const, message: 'Message is too long.' };

  const severity = body?.severity ? String(body.severity).trim() : '';
  if (type === 'bug' && severity && !SEVERITIES.has(severity)) {
    return { ok: false as const, message: 'Invalid severity.' };
  }

  const longFields = ['stepsToReproduce', 'expectedBehavior', 'actualBehavior'] as const;
  for (const key of longFields) {
    const val = body?.[key] ? String(body[key]).trim() : '';
    if (val.length > MAX_FIELD) {
      return { ok: false as const, message: `${key} is too long.` };
    }
  }

  return {
    ok: true as const,
    payload: {
      type,
      subject,
      message,
      display_name: body?.displayName ? String(body.displayName).trim().slice(0, 120) : '',
      tool_id: body?.toolId ? String(body.toolId).trim().slice(0, 64) : '',
      severity: type === 'bug' ? (severity || 'medium') : '',
      steps_to_reproduce: body?.stepsToReproduce ? String(body.stepsToReproduce).trim() : '',
      expected_behavior: body?.expectedBehavior ? String(body.expectedBehavior).trim() : '',
      actual_behavior: body?.actualBehavior ? String(body.actualBehavior).trim() : '',
      page_url: body?.pageUrl ? String(body.pageUrl).trim().slice(0, 500) : '',
      user_agent: body?.userAgent ? String(body.userAgent).trim().slice(0, 500) : '',
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();

  try {
    const { user } = await requireUser(req);
    const email = user.email;
    if (!email) return jsonResponse({ error: { message: 'Unauthorized' } }, 401);

    const limitKey = `submitFeedback:${getClientIp(req)}:${email}`;
    if (!checkRequestRateLimit(limitKey, RATE_MAX, RATE_WINDOW_MS)) {
      return jsonResponse({ error: { message: 'Too many submissions. Try again later.' } }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const validated = validatePayload(body);
    if (!validated.ok) {
      return jsonResponse({ error: { message: validated.message } }, 400);
    }

    const now = Date.now();
    const service = getServiceClient();

    let requestId = '';
    let createdAt = now;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      requestId = buildRequestId();
      const { data, error } = await service
        .from('tools_feedback')
        .insert({
          ...validated.payload,
          request_id: requestId,
          status: 'new',
          user_id: user.id,
          user_email: email,
          admin_notes: '',
          created_at: now,
          updated_at: now,
        })
        .select('created_at')
        .single();

      if (!error) {
        createdAt = data?.created_at ?? now;
        break;
      }
      if (!/duplicate|unique|exists/i.test(error.message)) throw error;
      if (attempt === 4) throw new Error('Could not generate a unique request ID.');
    }

    return jsonResponse({ requestId, createdAt });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: { message: err.message } }, err.status);
    }
    const message = err instanceof Error ? err.message : 'Feedback submission failed';
    return jsonResponse({ error: { message } }, 500);
  }
});
