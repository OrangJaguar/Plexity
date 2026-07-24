/**
 * adminConverterAiApi — allowlisted admin gateway for Converter AI (Plan 7).
 *
 * IMPORTANT (Base44 deploy): Do not import from ../_shared or sibling folders.
 * Each function deploys as a standalone bundle.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

type Base44Client = ReturnType<typeof createClientFromRequest>;

const API_VERSION = 1;
const MAX_BODY_BYTES = 512 * 1024;
const ALLOWED_ACTIONS = new Set([
  "session",
  "converter.ai.assist.plan",
  "converter.ai.assist.summary",
  "converter.ai.assist.naming",
  "converter.ai.assist.compress",
  "converter.ai.ocr.run",
  "converter.ai.ocr.get",
  "converter.ai.ocr.table",
  "converter.ai.ocr.schema",
  "converter.ai.ocr.altText",
  "converter.ai.transcribe.run",
  "converter.ai.transcribe.get",
  "converter.ai.transcribe.translate",
  "converter.ai.subtitle.generate",
  "converter.ai.job.cancel",
  "converter.ai.usage.summary",
  "converter.ai.worker.callback",
]);

const PLAN_ALLOWLIST = new Set([
  "image-to-png",
  "image-to-jpeg",
  "image-to-webp",
  "image-to-gif",
  "audio-to-mp3",
  "audio-to-wav",
  "audio-to-ogg",
  "audio-to-aac",
  "video-to-mp4",
  "video-to-webm",
  "video-to-gif",
  "video-extract-audio",
  "data-json-to-csv",
  "data-csv-to-json",
  "data-yaml-to-json",
  "data-json-to-yaml",
  "convertVideoAdvanced",
  "convertAudioAdvanced",
]);

const MAX_REQUESTS_PER_DAY = 20;
const HARD_BUDGET_USD = 15;
const HMAC_MAX_SKEW_MS = 5 * 60 * 1000;

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function errorResponse(status: number, message: string, code?: string) {
  return json({ error: { message, code: code || undefined } }, status);
}

function serviceEntities(base44: Base44Client) {
  return base44.asServiceRole?.entities ?? base44.entities;
}

function makeRequestId() {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseBody(raw: string) {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function writeAudit(
  entities: ReturnType<typeof serviceEntities>,
  entry: {
    actorEmail: string;
    actorId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    outcome: "success" | "failure";
    requestId: string;
    detail?: string;
  },
) {
  try {
    await entities.AdminAuditLog.create({
      actorEmail: entry.actorEmail,
      actorId: entry.actorId || "",
      action: entry.action,
      targetType: entry.targetType || "",
      targetId: entry.targetId || "",
      outcome: entry.outcome,
      requestId: entry.requestId,
      detail: (entry.detail || "").slice(0, 500),
      createdAt: Date.now(),
    });
  } catch {
    // best-effort
  }
}

function tokenBucket(n: number) {
  if (n <= 0) return "0";
  if (n < 500) return "lt500";
  if (n < 2000) return "500to2k";
  if (n < 8000) return "2kto8k";
  return "gte8k";
}

function costBucket(usd: number) {
  if (usd <= 0) return "0";
  if (usd < 0.01) return "lt1c";
  if (usd < 0.1) return "1cto10c";
  if (usd < 1) return "10cto1";
  return "gte1";
}

async function writeUsage(
  entities: ReturnType<typeof serviceEntities>,
  entry: {
    actorEmail: string;
    actorId?: string;
    action: string;
    provider: string;
    model?: string;
    outcome: string;
    inputTokens?: number;
    outputTokens?: number;
    estimatedUsd?: number;
    requestId: string;
  },
) {
  try {
    await entities.AdminConverterAiUsage.create({
      actorEmail: entry.actorEmail,
      actorId: entry.actorId || "",
      action: entry.action,
      provider: entry.provider,
      model: entry.model || "",
      outcome: entry.outcome,
      inputTokenBucket: tokenBucket(entry.inputTokens || 0),
      outputTokenBucket: tokenBucket(entry.outputTokens || 0),
      costUsdBucket: costBucket(entry.estimatedUsd || 0),
      requestId: entry.requestId,
      createdAt: Date.now(),
    });
  } catch {
    // best-effort
  }
}

async function hmacSign(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacVerify(secret: string, message: string, signatureHex: string) {
  const expected = await hmacSign(secret, message);
  if (expected.length !== signatureHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  }
  return mismatch === 0;
}

async function callControlService(method: string, path: string, body: Record<string, unknown>) {
  const baseUrl = Deno.env.get("CONVERTER_MEDIA_CONTROL_URL") || "";
  const secret = Deno.env.get("CONVERTER_MEDIA_HMAC_SECRET") || "";
  if (!baseUrl || !secret) {
    return { ok: false as const, status: 503, code: "SERVICE_UNAVAILABLE", data: null };
  }
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const bodyText = JSON.stringify(body);
  const bodyHash = await hmacSign(secret, bodyText);
  const canonical = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = await hmacSign(secret, canonical);
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-plexity-timestamp": timestamp,
      "x-plexity-nonce": nonce,
      "x-plexity-signature": signature,
    },
    body: bodyText,
  });
  let data: Record<string, unknown> | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const code = typeof data?.code === "string" ? data.code : "SERVICE_UNAVAILABLE";
    return { ok: false as const, status: res.status, code, data };
  }
  return { ok: true as const, status: res.status, code: null, data };
}

function aiEnabled() {
  return Deno.env.get("ENABLE_AI_PROVIDER") === "true";
}

function acceptNewAiJobs() {
  return Deno.env.get("ACCEPT_NEW_AI_JOBS") !== "false";
}

function scanInjection(text: string) {
  return /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i.test(text)
    || /disregard\s+(all\s+)?(previous|prior|system)/i.test(text)
    || /\bargv\b/i.test(text)
    || /\bffmpegArgs\b/i.test(text);
}

function normalizePlanDraft(raw: unknown) {
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  }
  if (!obj) return null;
  const planSrc = (obj.plan && typeof obj.plan === "object" && !Array.isArray(obj.plan))
    ? obj.plan as Record<string, unknown>
    : obj;
  if ("argv" in planSrc || "ffmpegArgs" in planSrc || "command" in planSrc || "shell" in planSrc) {
    return null;
  }
  const operationId = typeof planSrc.operationId === "string" ? planSrc.operationId : "";
  if (!PLAN_ALLOWLIST.has(operationId)) return null;
  const options = (planSrc.options && typeof planSrc.options === "object" && !Array.isArray(planSrc.options))
    ? { ...(planSrc.options as Record<string, unknown>) }
    : {};
  delete options.argv;
  delete options.ffmpegArgs;
  delete options.command;
  delete options.shell;
  return {
    plan: {
      schemaVersion: 2,
      operationId,
      options,
      goalId: typeof planSrc.goalId === "string" ? planSrc.goalId.slice(0, 64) : null,
    },
    explanation: typeof obj.explanation === "string" ? obj.explanation.slice(0, 500) : "",
    warnings: Array.isArray(obj.warnings)
      ? obj.warnings.filter((w) => typeof w === "string").map((w) => String(w).slice(0, 120)).slice(0, 8)
      : [],
  };
}

/** Deterministic offline assist when provider is off or unavailable — still allowlisted. */
function mockAssistPlan(nl: string) {
  const lower = nl.toLowerCase();
  if (/video|mp4|compress|smaller/.test(lower)) {
    return normalizePlanDraft({
      plan: { operationId: "video-to-mp4", options: {}, goalId: "under-size" },
      explanation: "Suggested video-to-mp4 from your request.",
      warnings: ["Offline draft — confirm before applying"],
    });
  }
  if (/image|png|jpeg|jpg|webp/.test(lower)) {
    return normalizePlanDraft({
      plan: { operationId: "image-to-webp", options: {}, goalId: "web" },
      explanation: "Suggested image-to-webp from your request.",
      warnings: ["Offline draft — confirm before applying"],
    });
  }
  return normalizePlanDraft({
    plan: { operationId: "audio-to-mp3", options: {}, goalId: "podcast" },
    explanation: "Suggested audio-to-mp3 from your request.",
    warnings: ["Offline draft — confirm before applying"],
  });
}

async function countTodayUsage(entities: ReturnType<typeof serviceEntities>, actorEmail: string) {
  const rows = await entities.AdminConverterAiUsage.filter({ actorEmail });
  const start = Date.now() - 24 * 60 * 60 * 1000;
  const today = (Array.isArray(rows) ? rows : []).filter((r: { createdAt?: number }) => (r.createdAt || 0) >= start);
  return { requestCount: today.length, estimatedUsd: today.length * 0.02 };
}

Deno.serve(async (req) => {
  const requestId = makeRequestId();

  if (req.method !== "POST") return errorResponse(405, "Method not allowed.");
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return errorResponse(415, "Content-Type must be application/json.");
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return errorResponse(413, "Request body too large.");
  const body = parseBody(raw);
  if (!body) return errorResponse(400, "Invalid JSON body.");

  const version = Number(body.version ?? API_VERSION);
  if (version !== API_VERSION) return errorResponse(400, "Unsupported API version.");

  const action = String(body.action || "").trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return errorResponse(400, "Unknown or disallowed action.");
  }

  const payload = (body.payload && typeof body.payload === "object" && !Array.isArray(body.payload))
    ? body.payload as Record<string, unknown>
    : {};

  if (action === "converter.ai.worker.callback") {
    const callbackSecret = Deno.env.get("CONVERTER_MEDIA_CALLBACK_HMAC_SECRET")
      || Deno.env.get("CONVERTER_MEDIA_HMAC_SECRET")
      || "";
    if (!callbackSecret) {
      return errorResponse(503, "Callback authentication is not configured.", "SERVICE_UNAVAILABLE");
    }
    const timestamp = req.headers.get("x-plexity-timestamp") || "";
    const nonce = req.headers.get("x-plexity-nonce") || "";
    const signature = req.headers.get("x-plexity-signature") || "";
    const tsNum = Number(timestamp);
    if (!timestamp || !nonce || !signature || !Number.isFinite(tsNum)) {
      return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");
    }
    if (Math.abs(Date.now() - tsNum) > HMAC_MAX_SKEW_MS) {
      return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");
    }
    const bodyHash = await hmacSign(callbackSecret, raw);
    const canonical = `POST\n/callback\n${timestamp}\n${nonce}\n${bodyHash}`;
    const valid = await hmacVerify(callbackSecret, canonical, signature);
    if (!valid) return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");

    let base44Cb: Base44Client;
    try {
      base44Cb = createClientFromRequest(req);
    } catch {
      return errorResponse(500, "Unable to initialize AI API.");
    }
    const entities = serviceEntities(base44Cb);
    const jobId = String(payload.jobId || "").trim();
    const status = String(payload.status || "").trim();
    if (!jobId || !status) return errorResponse(400, "Invalid callback payload.");
    const rows = await entities.AdminConverterAiJob.filter({ jobId });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.id) return errorResponse(404, "Job not found.");
    await entities.AdminConverterAiJob.update(row.id, {
      status,
      progressPhase: typeof payload.progressPhase === "string" ? payload.progressPhase : row.progressPhase,
      progressFraction: typeof payload.progressFraction === "number" ? payload.progressFraction : row.progressFraction,
      errorCode: typeof payload.errorCode === "string" ? payload.errorCode : "",
      updatedAt: Date.now(),
    });
    return json({ ok: true, requestId });
  }

  let base44: Base44Client;
  try {
    base44 = createClientFromRequest(req);
  } catch {
    return errorResponse(500, "Unable to initialize AI API.");
  }

  let user: { id?: string; email?: string; role?: string };
  try {
    user = await base44.auth.me();
  } catch {
    return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");
  }
  if (!user?.email) return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");
  if (user.role !== "admin") return errorResponse(403, "Admin access required.", "ADMIN_REQUIRED");

  const entities = serviceEntities(base44);
  const actorEmail = user.email;
  const actorId = user.id || "";

  try {
    if (action === "session") {
      const usage = await countTodayUsage(entities, actorEmail);
      return json({
        ok: true,
        requestId,
        data: {
          email: actorEmail,
          role: user.role,
          version: API_VERSION,
          aiEnabled: aiEnabled(),
          acceptNewAiJobs: acceptNewAiJobs(),
          providers: aiEnabled() ? ["openai-compatible", "anthropic"] : [],
          budget: {
            requestCount: usage.requestCount,
            maxRequests: MAX_REQUESTS_PER_DAY,
            remainingRequests: Math.max(0, MAX_REQUESTS_PER_DAY - usage.requestCount),
            hardBudgetUsd: HARD_BUDGET_USD,
          },
          actions: [...ALLOWED_ACTIONS].filter((a) => a !== "converter.ai.worker.callback"),
        },
      });
    }

    const usage = await countTodayUsage(entities, actorEmail);
    if (usage.requestCount >= MAX_REQUESTS_PER_DAY || usage.estimatedUsd >= HARD_BUDGET_USD) {
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        outcome: "failure",
        requestId,
        detail: "code=AI_BUDGET_EXCEEDED",
      });
      return errorResponse(429, "AI daily budget exceeded.", "AI_BUDGET_EXCEEDED");
    }

    if (!acceptNewAiJobs() && action !== "converter.ai.usage.summary" && action !== "converter.ai.job.cancel") {
      return errorResponse(503, "New AI jobs are disabled.", "AI_DISABLED");
    }

    if (action === "converter.ai.assist.plan") {
      if (!payload.confirmed) {
        return errorResponse(400, "Human confirmation is required.", "AI_CONFIRM_REQUIRED");
      }
      const nl = String(payload.request || "").trim().slice(0, 8000);
      if (!nl) return errorResponse(400, "Request text is required.", "AI_VALIDATION_FAILED");
      if (scanInjection(nl)) {
        return errorResponse(400, "Request rejected by safety filter.", "AI_INJECTION_REJECTED");
      }

      // Prefer control-service AI when enabled; else deterministic offline draft.
      let draft = mockAssistPlan(nl);
      let provider = "offline-mock";
      let model = "rules";
      if (aiEnabled()) {
        const control = await callControlService("POST", "/v1/ai/create", {
          kind: "assist",
          actorEmail,
          actorId,
          requestText: nl,
        });
        if (control.ok && control.data?.draft) {
          const normalized = normalizePlanDraft(control.data.draft);
          if (normalized) {
            draft = normalized;
            provider = String(control.data.provider || "openai-compatible");
            model = String(control.data.model || "");
          }
        }
      }
      if (!draft) {
        return errorResponse(400, "Unable to produce a valid plan.", "AI_VALIDATION_FAILED");
      }

      await writeUsage(entities, {
        actorEmail,
        actorId,
        action,
        provider,
        model,
        outcome: "success",
        inputTokens: 100,
        outputTokens: 80,
        estimatedUsd: 0.01,
        requestId,
      });
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        outcome: "success",
        requestId,
        detail: `provider=${provider}`,
      });
      return json({
        ok: true,
        requestId,
        data: {
          ...draft,
          confirmToken: makeId("cfm"),
          softBudgetWarning: usage.requestCount >= Math.floor(MAX_REQUESTS_PER_DAY * 0.8),
        },
      });
    }

    if (action === "converter.ai.assist.summary") {
      if (!payload.confirmed) return errorResponse(400, "Human confirmation is required.", "AI_CONFIRM_REQUIRED");
      const summary = {
        text: "Conversion completed with allowlisted operations. Details redacted for privacy.",
        outcomeBucket: "success",
      };
      await writeUsage(entities, {
        actorEmail, actorId, action, provider: "offline-mock", outcome: "success", requestId, estimatedUsd: 0.005,
      });
      return json({ ok: true, requestId, data: summary });
    }

    if (action === "converter.ai.assist.naming") {
      if (!payload.confirmed) return errorResponse(400, "Human confirmation is required.", "AI_CONFIRM_REQUIRED");
      const count = Math.min(50, Math.max(1, Number(payload.count) || 1));
      const names = Array.from({ length: count }, (_, i) => ({
        index: i + 1,
        suggested: `item-${String(i + 1).padStart(3, "0")}`,
      }));
      await writeUsage(entities, {
        actorEmail, actorId, action, provider: "offline-mock", outcome: "success", requestId, estimatedUsd: 0.005,
      });
      return json({ ok: true, requestId, data: { names } });
    }

    if (action === "converter.ai.assist.compress") {
      if (!payload.confirmed) return errorResponse(400, "Human confirmation is required.", "AI_CONFIRM_REQUIRED");
      const draft = normalizePlanDraft({
        plan: { operationId: "video-to-mp4", options: { targetBytes: 5_000_000 }, goalId: "under-size" },
        explanation: "Target a smaller MP4 when possible.",
        warnings: ["Size is approximate"],
      });
      await writeUsage(entities, {
        actorEmail, actorId, action, provider: "offline-mock", outcome: "success", requestId, estimatedUsd: 0.01,
      });
      return json({ ok: true, requestId, data: draft });
    }

    if (
      action === "converter.ai.ocr.run"
      || action === "converter.ai.ocr.table"
      || action === "converter.ai.ocr.schema"
      || action === "converter.ai.ocr.altText"
    ) {
      if (!payload.confirmed) return errorResponse(400, "Human confirmation is required.", "AI_CONFIRM_REQUIRED");
      if (!acceptNewAiJobs()) return errorResponse(503, "New AI jobs are disabled.", "AI_DISABLED");
      const jobId = makeId("aijob");
      const now = Date.now();
      const kind = "ocr";
      await entities.AdminConverterAiJob.create({
        jobId,
        actorEmail,
        actorId,
        kind,
        status: aiEnabled() ? "queued" : "ready",
        progressPhase: aiEnabled() ? "queued" : "ready",
        progressFraction: aiEnabled() ? 0 : 1,
        errorCode: "",
        provider: aiEnabled() ? "openai-compatible" : "offline-mock",
        expiresAt: now + 15 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
      if (aiEnabled()) {
        await callControlService("POST", "/v1/ai/create", {
          jobId, kind, actorEmail, actorId, action,
        });
      }
      const result = action === "converter.ai.ocr.altText"
        ? { altText: "Descriptive alt text placeholder", jobId, status: "ready" }
        : action === "converter.ai.ocr.table"
          ? { tables: [], text: "", jobId, status: "ready" }
          : action === "converter.ai.ocr.schema"
            ? { schema: { type: "object", properties: {} }, jobId, status: "ready" }
            : { text: "OCR text placeholder", markdown: "OCR text placeholder", warnings: [], jobId, status: "ready" };
      await writeUsage(entities, {
        actorEmail, actorId, action, provider: "offline-mock", outcome: "success", requestId, estimatedUsd: 0.02,
      });
      await writeAudit(entities, {
        actorEmail, actorId, action, targetType: "AdminConverterAiJob", targetId: jobId, outcome: "success", requestId,
      });
      return json({ ok: true, requestId, data: result });
    }

    if (action === "converter.ai.ocr.get" || action === "converter.ai.transcribe.get") {
      const jobId = String(payload.jobId || "").trim();
      if (!jobId) return errorResponse(400, "jobId is required.");
      const rows = await entities.AdminConverterAiJob.filter({ jobId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return errorResponse(404, "Job not found.");
      if (aiEnabled()) {
        const control = await callControlService("POST", "/v1/ai/get", { jobId, actorEmail });
        if (control.ok && control.data && row.id) {
          await entities.AdminConverterAiJob.update(row.id, {
            status: control.data.status || row.status,
            progressPhase: control.data.progressPhase || row.progressPhase,
            progressFraction: typeof control.data.progressFraction === "number"
              ? control.data.progressFraction
              : row.progressFraction,
            updatedAt: Date.now(),
          });
        }
      }
      return json({
        ok: true,
        requestId,
        data: {
          jobId: row.jobId,
          kind: row.kind,
          status: row.status,
          progressPhase: row.progressPhase,
          progressFraction: row.progressFraction,
          errorCode: row.errorCode || null,
        },
      });
    }

    if (
      action === "converter.ai.transcribe.run"
      || action === "converter.ai.transcribe.translate"
      || action === "converter.ai.subtitle.generate"
    ) {
      if (!payload.confirmed) return errorResponse(400, "Human confirmation is required.", "AI_CONFIRM_REQUIRED");
      const jobId = makeId("aijob");
      const now = Date.now();
      await entities.AdminConverterAiJob.create({
        jobId,
        actorEmail,
        actorId,
        kind: action.includes("translate") ? "translate" : "transcribe",
        status: "ready",
        progressPhase: "ready",
        progressFraction: 1,
        errorCode: "",
        provider: "offline-mock",
        expiresAt: now + 15 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
      const cues = [{ start: 0, end: 1.5, text: "Hello world." }];
      const data = action === "converter.ai.subtitle.generate"
        ? {
          jobId,
          format: payload.format === "srt" ? "srt" : "vtt",
          content: payload.format === "srt"
            ? "1\n00:00:00,000 --> 00:00:01,500\nHello world.\n"
            : "WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nHello world.\n",
          cues,
        }
        : action === "converter.ai.transcribe.translate"
          ? { jobId, cues: cues.map((c) => ({ ...c, text: `[translated] ${c.text}` })), language: String(payload.language || "en").slice(0, 8) }
          : { jobId, text: "Hello world.", cues, status: "ready" };
      await writeUsage(entities, {
        actorEmail, actorId, action, provider: "offline-mock", outcome: "success", requestId, estimatedUsd: 0.03,
      });
      await writeAudit(entities, {
        actorEmail, actorId, action, targetType: "AdminConverterAiJob", targetId: jobId, outcome: "success", requestId,
      });
      return json({ ok: true, requestId, data });
    }

    if (action === "converter.ai.job.cancel") {
      const jobId = String(payload.jobId || "").trim();
      if (!jobId) return errorResponse(400, "jobId is required.");
      const rows = await entities.AdminConverterAiJob.filter({ jobId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) return errorResponse(404, "Job not found.");
      await callControlService("POST", "/v1/ai/cancel", { jobId, actorEmail });
      await entities.AdminConverterAiJob.update(row.id, {
        status: "cancelled",
        errorCode: "AI_CANCELLED",
        updatedAt: Date.now(),
      });
      await writeAudit(entities, {
        actorEmail, actorId, action, targetType: "AdminConverterAiJob", targetId: jobId, outcome: "success", requestId,
      });
      return json({ ok: true, requestId, data: { jobId, status: "cancelled" } });
    }

    if (action === "converter.ai.usage.summary") {
      const u = await countTodayUsage(entities, actorEmail);
      return json({
        ok: true,
        requestId,
        data: {
          requestCount: u.requestCount,
          maxRequests: MAX_REQUESTS_PER_DAY,
          remainingRequests: Math.max(0, MAX_REQUESTS_PER_DAY - u.requestCount),
          softBudgetUsd: 5,
          hardBudgetUsd: HARD_BUDGET_USD,
        },
      });
    }

    return errorResponse(400, "Unknown or disallowed action.");
  } catch {
    await writeAudit(entities, {
      actorEmail,
      actorId,
      action,
      outcome: "failure",
      requestId,
      detail: "internal",
    });
    return errorResponse(500, "Unable to complete converter AI request.");
  }
});
