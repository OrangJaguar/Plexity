/**
 * submitFeedback — self-contained feedback handler.
 *
 * IMPORTANT (Base44 deploy): Do not import from ../_shared or sibling folders.
 * Each function deploys as a standalone bundle.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

type Base44Client = ReturnType<typeof createClientFromRequest>;

const FEEDBACK_TYPES = new Set(["bug", "feature", "general"]);
const SEVERITIES = new Set(["low", "medium", "high"]);
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 8000;
const MAX_FIELD = 4000;
const RATE_MAX = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function serviceEntities(base44: Base44Client) {
  return base44.asServiceRole?.entities ?? base44.entities;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
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

function rateLimitKey(scope: string, req: Request, extra?: string) {
  const ip = getClientIp(req);
  const suffix = extra ? `:${extra}` : "";
  return `${scope}:${ip}${suffix}`;
}

function randomSuffix() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function buildRequestId(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `PLX-${y}${m}${d}-${randomSuffix()}`;
}

function validatePayload(body: Record<string, unknown>) {
  const type = String(body?.type || "").trim();
  if (!FEEDBACK_TYPES.has(type)) {
    return { ok: false as const, message: "Invalid feedback type." };
  }

  const subject = String(body?.subject || "").trim();
  const message = String(body?.message || "").trim();
  if (!subject) return { ok: false as const, message: "Subject is required." };
  if (subject.length > MAX_SUBJECT) return { ok: false as const, message: "Subject is too long." };
  if (!message) return { ok: false as const, message: "Message is required." };
  if (message.length > MAX_MESSAGE) return { ok: false as const, message: "Message is too long." };

  const severity = body?.severity ? String(body.severity).trim() : "";
  if (type === "bug" && severity && !SEVERITIES.has(severity)) {
    return { ok: false as const, message: "Invalid severity." };
  }

  const longFields = ["stepsToReproduce", "expectedBehavior", "actualBehavior"] as const;
  for (const key of longFields) {
    const val = body?.[key] ? String(body[key]).trim() : "";
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
      displayName: body?.displayName ? String(body.displayName).trim().slice(0, 120) : "",
      toolId: body?.toolId ? String(body.toolId).trim().slice(0, 64) : "",
      severity: type === "bug" ? (severity || "medium") : "",
      stepsToReproduce: body?.stepsToReproduce ? String(body.stepsToReproduce).trim() : "",
      expectedBehavior: body?.expectedBehavior ? String(body.expectedBehavior).trim() : "",
      actualBehavior: body?.actualBehavior ? String(body.actualBehavior).trim() : "",
      pageUrl: body?.pageUrl ? String(body.pageUrl).trim().slice(0, 500) : "",
      userAgent: body?.userAgent ? String(body.userAgent).trim().slice(0, 500) : "",
    },
  };
}

async function createWithUniqueRequestId(
  entities: ReturnType<typeof serviceEntities>,
  row: Record<string, unknown>,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const requestId = buildRequestId();
    try {
      const created = await entities.ToolsFeedback.create({
        ...row,
        requestId,
      });
      return { requestId, createdAt: created?.createdAt ?? Date.now() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!/duplicate|unique|exists/i.test(msg)) throw err;
    }
  }
  throw new Error("Could not generate a unique request ID.");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const limitKey = rateLimitKey("submitFeedback", req, user.email);
    if (!checkRequestRateLimit(limitKey, RATE_MAX, RATE_WINDOW_MS)) {
      return Response.json(
        { error: { message: "Too many submissions. Try again later." } },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = validatePayload(body);
    if (!validated.ok) {
      return Response.json({ error: { message: validated.message } }, { status: 400 });
    }

    const now = Date.now();
    const entities = serviceEntities(base44);
    const result = await createWithUniqueRequestId(entities, {
      ...validated.payload,
      status: "new",
      userEmail: user.email,
      adminNotes: "",
      createdAt: now,
      updatedAt: now,
    });

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feedback submission failed";
    return Response.json({ error: { message } }, { status: 500 });
  }
});
