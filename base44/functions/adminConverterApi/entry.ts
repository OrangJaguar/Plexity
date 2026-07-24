/**
 * adminConverterApi — allowlisted admin gateway for Authorized URL Import.
 *
 * IMPORTANT (Base44 deploy): Do not import from ../_shared or sibling folders.
 * Each function deploys as a standalone bundle.
 *
 * Actions:
 * - session
 * - converter.url.validate
 * - converter.job.create
 * - converter.job.list
 * - converter.job.get
 * - converter.job.cancel
 * - converter.job.retry
 * - converter.job.download
 * - converter.discovery.create
 * - converter.discovery.get
 * - converter.discovery.cancel
 * - converter.discovery.items
 * - converter.batch.confirm
 * - converter.batch.pause
 * - converter.batch.resume
 * - converter.batch.retryFailed
 * - converter.package.create
 * - converter.package.get
 * - converter.package.download
 * - converter.worker.callback (service HMAC only)
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

type Base44Client = ReturnType<typeof createClientFromRequest>;

const API_VERSION = 1;
const MAX_BODY_BYTES = 256 * 1024;
const ALLOWED_ACTIONS = new Set([
  "session",
  "converter.url.validate",
  "converter.job.create",
  "converter.job.list",
  "converter.job.get",
  "converter.job.cancel",
  "converter.job.retry",
  "converter.job.download",
  "converter.discovery.create",
  "converter.discovery.get",
  "converter.discovery.cancel",
  "converter.discovery.items",
  "converter.batch.confirm",
  "converter.batch.pause",
  "converter.batch.resume",
  "converter.batch.retryFailed",
  "converter.package.create",
  "converter.package.get",
  "converter.package.download",
  "converter.worker.callback",
]);

const MAX_URLS = 10;
const MAX_SELECTED = 50;
const MAX_URL_LENGTH = 2048;
const HMAC_MAX_SKEW_MS = 5 * 60 * 1000;
const SIGNED_DOWNLOAD_TTL_MS = 5 * 60 * 1000;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
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
  return `cnv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
    // Audit failure must not break the primary action.
  }
}

function parseBody(raw: string) {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isIpLiteral(host: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.includes(":")) return true;
  if (host.startsWith("[") && host.endsWith("]")) return true;
  return false;
}

function redactLabel(raw: string) {
  try {
    const parsed = new URL(raw.trim());
    const host = parsed.hostname || "unknown";
    const parts = parsed.pathname.split("/").filter(Boolean);
    const leaf = parts.length ? parts[parts.length - 1].slice(0, 48) : "";
    return leaf ? `${host}/…/${leaf}` : host;
  } catch {
    return "invalid";
  }
}

function classifyUrl(rawUrl: string) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { provider: "invalid", reason: "URL_INVALID", youtubeVideoId: null as string | null };
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { provider: "invalid", reason: "URL_INVALID", youtubeVideoId: null };
  }
  if (parsed.protocol !== "https:") {
    return { provider: "invalid", reason: "URL_DISALLOWED", youtubeVideoId: null };
  }
  if (parsed.username || parsed.password) {
    return { provider: "invalid", reason: "URL_DISALLOWED", youtubeVideoId: null };
  }
  if (parsed.port && parsed.port !== "443") {
    return { provider: "invalid", reason: "URL_DISALLOWED", youtubeVideoId: null };
  }
  const host = parsed.hostname.toLowerCase();
  if (isIpLiteral(host)) {
    return { provider: "invalid", reason: "SSRF_BLOCKED", youtubeVideoId: null };
  }
  if (YOUTUBE_HOSTS.has(host)) {
    const path = parsed.pathname;
    if (
      path.includes("/playlist") ||
      parsed.searchParams.has("list") ||
      path.includes("/channel/") ||
      path.includes("/c/") ||
      path.includes("/@") ||
      path.includes("/user/")
    ) {
      return { provider: "playlist-deferred", reason: "PLAYLIST_DEFERRED", youtubeVideoId: null };
    }
    let videoId: string | null = null;
    if (host === "youtu.be" || host === "www.youtu.be") {
      videoId = path.replace(/^\//, "").split("/")[0] || null;
    } else if (path === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (path.startsWith("/shorts/")) {
      videoId = path.slice("/shorts/".length).split("/")[0] || null;
    } else if (path.startsWith("/embed/")) {
      videoId = path.slice("/embed/".length).split("/")[0] || null;
    }
    if (!videoId || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return { provider: "invalid", reason: "PROVIDER_UNSUPPORTED", youtubeVideoId: null };
    }
    return { provider: "youtube-single", reason: undefined, youtubeVideoId: videoId };
  }
  return { provider: "direct-https", reason: undefined, youtubeVideoId: null };
}

function validatePlan(plan: unknown) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return { ok: false as const, code: "PLAN_INVALID" };
  }
  const p = plan as Record<string, unknown>;
  const operationId = typeof p.operationId === "string" ? p.operationId : "";
  if (!PLAN_ALLOWLIST.has(operationId)) {
    return { ok: false as const, code: "PLAN_INVALID" };
  }
  if ("argv" in p || "ffmpegArgs" in p || "command" in p || "shell" in p) {
    return { ok: false as const, code: "PLAN_INVALID" };
  }
  return { ok: true as const, plan: p, operationId };
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

async function callControlService(
  method: string,
  path: string,
  body: Record<string, unknown>,
) {
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

function sizeBucket(bytes: number | undefined) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "unknown";
  if (bytes < 1024 * 1024) return "lt1mb";
  if (bytes < 10 * 1024 * 1024) return "1to10mb";
  if (bytes < 100 * 1024 * 1024) return "10to100mb";
  if (bytes < 500 * 1024 * 1024) return "100to500mb";
  return "gt500mb";
}

Deno.serve(async (req) => {
  const requestId = makeRequestId();

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed.");
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return errorResponse(415, "Content-Type must be application/json.");
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return errorResponse(413, "Request body too large.");
  }

  const body = parseBody(raw);
  if (!body) {
    return errorResponse(400, "Invalid JSON body.");
  }

  const version = Number(body.version ?? API_VERSION);
  if (version !== API_VERSION) {
    return errorResponse(400, "Unsupported API version.");
  }

  const action = String(body.action || "").trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return errorResponse(400, "Unknown or disallowed action.");
  }

  const payload = (body.payload && typeof body.payload === "object" && !Array.isArray(body.payload))
    ? body.payload as Record<string, unknown>
    : {};

  // Worker callback authenticates via service HMAC, not browser session.
  if (action === "converter.worker.callback") {
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
    if (!valid) {
      return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");
    }

    let base44: Base44Client;
    try {
      base44 = createClientFromRequest(req);
    } catch {
      return errorResponse(500, "Unable to initialize converter API.");
    }
    const entities = serviceEntities(base44);
    const jobId = String(payload.jobId || "").trim();
    const status = String(payload.status || "").trim();
    if (!jobId || !status) {
      return errorResponse(400, "Invalid callback payload.");
    }

    try {
      const rows = await entities.AdminConverterJob.filter({ jobId });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) {
        return errorResponse(404, "Job not found.");
      }
      const patch: Record<string, unknown> = {
        status,
        progressPhase: typeof payload.progressPhase === "string" ? payload.progressPhase : row.progressPhase,
        progressFraction: typeof payload.progressFraction === "number" ? payload.progressFraction : row.progressFraction,
        errorCode: typeof payload.errorCode === "string" ? payload.errorCode : "",
        updatedAt: Date.now(),
        stateVersion: (Number(row.stateVersion) || 0) + 1,
      };
      if (status === "ready") {
        patch.completedAt = Date.now();
        patch.expiresAt = Date.now() + 60 * 60 * 1000;
        const artifactId = makeId("art");
        await entities.AdminConverterArtifact.create({
          artifactId,
          jobId,
          outputKind: "primary",
          sizeBucket: sizeBucket(typeof payload.outputBytes === "number" ? payload.outputBytes : undefined),
          mimeCategory: typeof payload.mimeCategory === "string" ? payload.mimeCategory : "unknown",
          expiresAt: patch.expiresAt,
          downloadCount: 0,
          createdAt: Date.now(),
        });
      }
      await entities.AdminConverterJob.update(row.id, patch);
      await writeAudit(entities, {
        actorEmail: "system@converter-worker",
        action: "converter.worker.callback",
        targetType: "AdminConverterJob",
        targetId: jobId,
        outcome: "success",
        requestId,
        detail: `status=${status}`,
      });
      return json({ ok: true, requestId });
    } catch {
      return errorResponse(500, "Unable to apply callback.");
    }
  }

  let base44: Base44Client;
  try {
    base44 = createClientFromRequest(req);
  } catch {
    return errorResponse(500, "Unable to initialize converter API.");
  }

  let user: { id?: string; email?: string; role?: string };
  try {
    user = await base44.auth.me();
  } catch {
    return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");
  }

  if (!user?.email) {
    return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");
  }

  if (user.role !== "admin") {
    return errorResponse(403, "Admin access required.", "ADMIN_REQUIRED");
  }

  const entities = serviceEntities(base44);
  const actorEmail = user.email;
  const actorId = user.id || "";

  try {
    if (action === "session") {
      return json({
        ok: true,
        requestId,
        data: {
          email: actorEmail,
          role: user.role,
          version: API_VERSION,
          actions: [...ALLOWED_ACTIONS].filter((a) => a !== "converter.worker.callback"),
          mediaServiceConfigured: Boolean(Deno.env.get("CONVERTER_MEDIA_CONTROL_URL")),
          youtubeEnabled: Deno.env.get("ENABLE_YOUTUBE_CONNECTOR") === "true",
        },
      });
    }

    if (action === "converter.url.validate") {
      const urlsRaw = Array.isArray(payload.urls) ? payload.urls : [];
      if (urlsRaw.length > MAX_URLS * 2) {
        await writeAudit(entities, {
          actorEmail,
          actorId,
          action,
          outcome: "failure",
          requestId,
          detail: "code=QUOTA_EXCEEDED",
        });
        return errorResponse(400, "Too many URLs.", "QUOTA_EXCEEDED");
      }

      const youtubeEnabled = Deno.env.get("ENABLE_YOUTUBE_CONNECTOR") === "true";
      const entries = [];
      for (const item of urlsRaw.slice(0, MAX_URLS * 2)) {
        const url = String(item || "").trim().slice(0, MAX_URL_LENGTH);
        const classification = classifyUrl(url);
        let disposition = "rejected";
        let reason = classification.reason || "URL_INVALID";
        if (classification.provider === "direct-https") {
          disposition = "accepted";
          reason = undefined as unknown as string;
        } else if (classification.provider === "youtube-single") {
          if (youtubeEnabled) {
            disposition = "accepted";
            reason = undefined as unknown as string;
          } else {
            disposition = "rejected";
            reason = "PROVIDER_UNSUPPORTED";
          }
        } else if (classification.provider === "playlist-deferred" || classification.provider === "channel-deferred") {
          disposition = "deferred";
          reason = "PLAYLIST_DEFERRED";
        }
        entries.push({
          redactedLabel: redactLabel(url),
          provider: classification.provider,
          disposition,
          reason: reason || null,
          youtubeVideoId: classification.youtubeVideoId,
        });
      }

      const denied = entries.filter((e) => e.disposition !== "accepted").length;
      if (denied > 0) {
        await writeAudit(entities, {
          actorEmail,
          actorId,
          action,
          outcome: "success",
          requestId,
          detail: `denied=${denied};accepted=${entries.length - denied}`,
        });
      }

      return json({
        ok: true,
        requestId,
        data: {
          entries,
          youtubeEnabled,
          limits: { maxUrlsPerSubmission: MAX_URLS },
        },
      });
    }

    if (action === "converter.job.create") {
      if (Deno.env.get("ACCEPT_NEW_JOBS") === "false") {
        return errorResponse(503, "New jobs are temporarily disabled.", "SERVICE_UNAVAILABLE");
      }

      const urlsRaw = Array.isArray(payload.urls) ? payload.urls : [];
      const urls = urlsRaw
        .map((u) => String(u || "").trim().slice(0, MAX_URL_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_URLS);

      if (!urls.length) {
        return errorResponse(400, "At least one URL is required.", "URL_INVALID");
      }

      if (!payload.sourceRightsAck) {
        return errorResponse(400, "Source rights acknowledgment is required.");
      }

      const planCheck = validatePlan(payload.plan);
      if (!planCheck.ok) {
        return errorResponse(400, "Invalid conversion plan.", planCheck.code);
      }

      const youtubeEnabled = Deno.env.get("ENABLE_YOUTUBE_CONNECTOR") === "true";
      const accepted = [];
      for (const url of urls) {
        const c = classifyUrl(url);
        if (c.provider === "direct-https") accepted.push({ url, provider: c.provider, label: redactLabel(url) });
        else if (c.provider === "youtube-single" && youtubeEnabled) {
          if (!payload.youtubeTermsAck) {
            return errorResponse(400, "YouTube Terms risk acknowledgment is required.");
          }
          accepted.push({ url, provider: c.provider, label: redactLabel(url) });
        }
      }

      if (!accepted.length) {
        await writeAudit(entities, {
          actorEmail,
          actorId,
          action,
          outcome: "failure",
          requestId,
          detail: "code=URL_INVALID",
        });
        return errorResponse(400, "No accepted URLs to process.", "URL_INVALID");
      }

      const idempotencyKey = String(payload.idempotencyKey || "").trim().slice(0, 128);
      if (!idempotencyKey) {
        return errorResponse(400, "Idempotency key is required.");
      }

      const existing = await entities.AdminConverterBatch.filter({
        actorEmail,
        idempotencyKey,
      });
      if (Array.isArray(existing) && existing[0]) {
        const jobs = await entities.AdminConverterJob.filter({ batchId: existing[0].batchId });
        return json({
          ok: true,
          requestId,
          data: {
            batchId: existing[0].batchId,
            jobs: Array.isArray(jobs) ? jobs : [],
            idempotentReplay: true,
          },
        });
      }

      const batchId = makeId("batch");
      const now = Date.now();
      await entities.AdminConverterBatch.create({
        batchId,
        actorEmail,
        actorId,
        acceptedCount: accepted.length,
        rejectedCount: urls.length - accepted.length,
        deferredCount: 0,
        sourceRightsAck: true,
        youtubeTermsAck: Boolean(payload.youtubeTermsAck),
        idempotencyKey,
        status: "processing",
        createdAt: now,
        updatedAt: now,
      });

      const control = await callControlService("POST", "/v1/jobs/create", {
        batchId,
        actorEmail,
        actorId,
        idempotencyKey,
        urls: accepted.map((a) => a.url),
        plan: planCheck.plan,
        acknowledgments: {
          sourceRights: true,
          youtubeTerms: Boolean(payload.youtubeTermsAck),
        },
      });

      const createdJobs = [];
      for (const item of accepted) {
        const jobId = makeId("job");
        const attemptId = makeId("att");
        const row = {
          jobId,
          batchId,
          actorEmail,
          actorId,
          provider: item.provider,
          redactedSourceLabel: item.label,
          status: control.ok ? "queued" : "failed",
          progressPhase: control.ok ? "queued" : "failed",
          progressFraction: 0,
          operationId: planCheck.operationId,
          errorCode: control.ok ? "" : (control.code || "SERVICE_UNAVAILABLE"),
          attemptId,
          stateVersion: 1,
          expiresAt: 0,
          createdAt: now,
          updatedAt: now,
          completedAt: 0,
        };
        await entities.AdminConverterJob.create(row);
        createdJobs.push(row);
      }

      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterBatch",
        targetId: batchId,
        outcome: control.ok ? "success" : "failure",
        requestId,
        detail: `jobs=${createdJobs.length};service=${control.ok ? "ok" : control.code}`,
      });

      if (!control.ok) {
        return json({
          ok: true,
          requestId,
          data: {
            batchId,
            jobs: createdJobs,
            warning: control.code || "SERVICE_UNAVAILABLE",
          },
        });
      }

      // Prefer control-service job IDs when returned.
      const remoteJobs = Array.isArray(control.data?.jobs) ? control.data.jobs as Array<Record<string, unknown>> : [];
      if (remoteJobs.length) {
        return json({
          ok: true,
          requestId,
          data: { batchId, jobs: remoteJobs, localProjections: createdJobs },
        });
      }

      return json({ ok: true, requestId, data: { batchId, jobs: createdJobs } });
    }

    if (action === "converter.job.list") {
      const limit = Math.min(100, Math.max(1, Number(payload.limit) || 50));
      const rows = await entities.AdminConverterJob.filter({ actorEmail });
      const items = (Array.isArray(rows) ? rows : [])
        .sort((a: { createdAt?: number }, b: { createdAt?: number }) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, limit)
        .map((row: Record<string, unknown>) => sanitizeJobProjection(row));
      return json({ ok: true, requestId, data: { items } });
    }

    if (action === "converter.job.get") {
      const jobId = String(payload.jobId || "").trim();
      if (!jobId) return errorResponse(400, "jobId is required.");
      const rows = await entities.AdminConverterJob.filter({ jobId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return errorResponse(404, "Job not found.");
      return json({ ok: true, requestId, data: sanitizeJobProjection(row) });
    }

    if (action === "converter.job.cancel") {
      const jobId = String(payload.jobId || "").trim();
      if (!jobId) return errorResponse(400, "jobId is required.");
      const rows = await entities.AdminConverterJob.filter({ jobId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) return errorResponse(404, "Job not found.");

      await callControlService("POST", "/v1/jobs/cancel", { jobId, actorEmail });
      await entities.AdminConverterJob.update(row.id, {
        status: "cancelled",
        progressPhase: "cancelled",
        errorCode: "CANCELLED",
        updatedAt: Date.now(),
        stateVersion: (Number(row.stateVersion) || 0) + 1,
      });
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterJob",
        targetId: jobId,
        outcome: "success",
        requestId,
      });
      return json({ ok: true, requestId, data: { jobId, status: "cancelled" } });
    }

    if (action === "converter.job.retry") {
      const jobId = String(payload.jobId || "").trim();
      if (!jobId) return errorResponse(400, "jobId is required.");
      const rows = await entities.AdminConverterJob.filter({ jobId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) return errorResponse(404, "Job not found.");
      if (!["failed", "cancelled"].includes(String(row.status))) {
        return errorResponse(400, "Only failed or cancelled jobs can be retried.");
      }

      const attemptId = makeId("att");
      await callControlService("POST", "/v1/jobs/retry", { jobId, actorEmail, attemptId });
      await entities.AdminConverterJob.update(row.id, {
        status: "queued",
        progressPhase: "queued",
        progressFraction: 0,
        errorCode: "",
        attemptId,
        updatedAt: Date.now(),
        stateVersion: (Number(row.stateVersion) || 0) + 1,
      });
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterJob",
        targetId: jobId,
        outcome: "success",
        requestId,
      });
      return json({ ok: true, requestId, data: { jobId, status: "queued", attemptId } });
    }

    if (action === "converter.job.download") {
      const jobId = String(payload.jobId || "").trim();
      if (!jobId) return errorResponse(400, "jobId is required.");
      const rows = await entities.AdminConverterJob.filter({ jobId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return errorResponse(404, "Job not found.", "DOWNLOAD_FORBIDDEN");
      if (String(row.status) !== "ready") {
        return errorResponse(403, "Download is not available.", "DOWNLOAD_FORBIDDEN");
      }
      if (row.expiresAt && Number(row.expiresAt) < Date.now()) {
        return errorResponse(410, "Output has expired.", "EXPIRED");
      }

      const control = await callControlService("POST", "/v1/jobs/download-token", {
        jobId,
        actorEmail,
        ttlMs: SIGNED_DOWNLOAD_TTL_MS,
      });

      if (!control.ok || !control.data?.downloadUrl) {
        await writeAudit(entities, {
          actorEmail,
          actorId,
          action,
          targetType: "AdminConverterJob",
          targetId: jobId,
          outcome: "failure",
          requestId,
          detail: `code=${control.code || "SERVICE_UNAVAILABLE"}`,
        });
        return errorResponse(503, "Download is temporarily unavailable.", control.code || "SERVICE_UNAVAILABLE");
      }

      const artifacts = await entities.AdminConverterArtifact.filter({ jobId });
      const art = Array.isArray(artifacts) ? artifacts[0] : null;
      if (art?.id) {
        await entities.AdminConverterArtifact.update(art.id, {
          downloadCount: (Number(art.downloadCount) || 0) + 1,
        });
      }

      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterJob",
        targetId: jobId,
        outcome: "success",
        requestId,
        detail: "download-issued",
      });

      return json({
        ok: true,
        requestId,
        data: {
          jobId,
          downloadUrl: String(control.data.downloadUrl),
          expiresInMs: SIGNED_DOWNLOAD_TTL_MS,
        },
      });
    }

    if (action === "converter.discovery.create") {
      if (Deno.env.get("ACCEPT_NEW_JOBS") === "false") {
        return errorResponse(503, "New jobs are temporarily disabled.", "SERVICE_UNAVAILABLE");
      }
      const url = String(payload.url || "").trim().slice(0, MAX_URL_LENGTH);
      if (!url) return errorResponse(400, "URL is required.", "URL_INVALID");
      if (!payload.sourceRightsAck) {
        return errorResponse(400, "Source rights acknowledgment is required.");
      }
      const idempotencyKey = String(payload.idempotencyKey || "").trim().slice(0, 128);
      if (!idempotencyKey) return errorResponse(400, "Idempotency key is required.");

      const existing = await entities.AdminConverterDiscovery.filter({ actorEmail, idempotencyKey });
      if (Array.isArray(existing) && existing[0]) {
        return json({
          ok: true,
          requestId,
          data: sanitizeDiscovery(existing[0]),
          idempotentReplay: true,
        });
      }

      const discoveryId = makeId("disc");
      const now = Date.now();
      const control = await callControlService("POST", "/v1/discovery/create", {
        discoveryId,
        actorEmail,
        actorId,
        url,
        idempotencyKey,
        youtubeTermsAck: Boolean(payload.youtubeTermsAck),
      });

      const row = {
        discoveryId,
        actorEmail,
        actorId,
        provider: typeof control.data?.provider === "string" ? control.data.provider : "youtube-playlist",
        redactedLabel: redactLabel(url),
        status: control.ok ? "discovering" : "failed",
        itemCount: 0,
        truncated: false,
        errorCode: control.ok ? "" : (control.code || "DISCOVERY_FAILED"),
        idempotencyKey,
        createdAt: now,
        updatedAt: now,
      };
      await entities.AdminConverterDiscovery.create(row);
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterDiscovery",
        targetId: discoveryId,
        outcome: control.ok ? "success" : "failure",
        requestId,
        detail: `provider=${row.provider}`,
      });
      return json({ ok: true, requestId, data: sanitizeDiscovery(row) });
    }

    if (action === "converter.discovery.get") {
      const discoveryId = String(payload.discoveryId || "").trim();
      if (!discoveryId) return errorResponse(400, "discoveryId is required.");
      const rows = await entities.AdminConverterDiscovery.filter({ discoveryId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return errorResponse(404, "Discovery not found.");
      const control = await callControlService("POST", "/v1/discovery/get", { discoveryId, actorEmail });
      if (control.ok && control.data) {
        const patch = {
          status: control.data.status || row.status,
          itemCount: Number(control.data.itemCount) || row.itemCount || 0,
          truncated: Boolean(control.data.truncated),
          errorCode: typeof control.data.errorCode === "string" ? control.data.errorCode : row.errorCode,
          updatedAt: Date.now(),
        };
        if (row.id) await entities.AdminConverterDiscovery.update(row.id, patch);
        return json({ ok: true, requestId, data: sanitizeDiscovery({ ...row, ...patch }) });
      }
      return json({ ok: true, requestId, data: sanitizeDiscovery(row) });
    }

    if (action === "converter.discovery.cancel") {
      const discoveryId = String(payload.discoveryId || "").trim();
      if (!discoveryId) return errorResponse(400, "discoveryId is required.");
      const rows = await entities.AdminConverterDiscovery.filter({ discoveryId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) return errorResponse(404, "Discovery not found.");
      await callControlService("POST", "/v1/discovery/cancel", { discoveryId, actorEmail });
      await entities.AdminConverterDiscovery.update(row.id, {
        status: "cancelled",
        errorCode: "CANCELLED",
        updatedAt: Date.now(),
      });
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterDiscovery",
        targetId: discoveryId,
        outcome: "success",
        requestId,
      });
      return json({ ok: true, requestId, data: { discoveryId, status: "cancelled" } });
    }

    if (action === "converter.discovery.items") {
      const discoveryId = String(payload.discoveryId || "").trim();
      if (!discoveryId) return errorResponse(400, "discoveryId is required.");
      const rows = await entities.AdminConverterDiscovery.filter({ discoveryId, actorEmail });
      if (!Array.isArray(rows) || !rows[0]) return errorResponse(404, "Discovery not found.");
      const limit = Math.min(200, Math.max(1, Number(payload.limit) || 50));
      const offset = Math.max(0, Number(payload.offset) || 0);
      const control = await callControlService("POST", "/v1/discovery/items", {
        discoveryId,
        actorEmail,
        limit,
        offset,
      });
      const items = Array.isArray(control.data?.items) ? control.data.items : [];
      return json({
        ok: true,
        requestId,
        data: {
          discoveryId,
          items: items.map(sanitizeDiscoveryItem),
          total: Number(control.data?.total) || items.length,
          truncated: Boolean(control.data?.truncated),
        },
      });
    }

    if (action === "converter.batch.confirm") {
      if (Deno.env.get("ACCEPT_NEW_JOBS") === "false") {
        return errorResponse(503, "New jobs are temporarily disabled.", "SERVICE_UNAVAILABLE");
      }
      const discoveryId = String(payload.discoveryId || "").trim();
      const itemIds = Array.isArray(payload.itemIds) ? payload.itemIds.map((id) => String(id)).slice(0, MAX_SELECTED + 1) : [];
      if (!discoveryId) return errorResponse(400, "discoveryId is required.");
      if (!itemIds.length) return errorResponse(400, "No items selected.", "SELECTION_EMPTY");
      if (itemIds.length > MAX_SELECTED) return errorResponse(400, "Too many items selected.", "QUOTA_EXCEEDED");
      if (!payload.sourceRightsAck) {
        return errorResponse(400, "Source rights acknowledgment is required.");
      }
      const planCheck = validatePlan(payload.plan);
      if (!planCheck.ok) return errorResponse(400, "Invalid conversion plan.", planCheck.code);

      const batchId = makeId("batch");
      const now = Date.now();
      const control = await callControlService("POST", "/v1/batch/confirm", {
        batchId,
        discoveryId,
        actorEmail,
        actorId,
        itemIds,
        plan: planCheck.plan,
        numberingPolicy: String(payload.numberingPolicy || "{num} - {title}.{ext}").slice(0, 120),
        mode: payload.mode === "audio" ? "audio" : "video",
        includeThumbnails: Boolean(payload.includeThumbnails),
        includeSubtitles: Boolean(payload.includeSubtitles),
        includeMetadata: payload.includeMetadata !== false,
        youtubeTermsAck: Boolean(payload.youtubeTermsAck),
        sidecarAck: Boolean(payload.sidecarAck),
      });

      await entities.AdminConverterBatch.create({
        batchId,
        actorEmail,
        actorId,
        kind: "playlist",
        discoveryId,
        acceptedCount: itemIds.length,
        rejectedCount: 0,
        deferredCount: 0,
        selectedCount: itemIds.length,
        readyCount: 0,
        failedCount: 0,
        paused: false,
        numberingPolicy: String(payload.numberingPolicy || "{num} - {title}.{ext}").slice(0, 120),
        packageId: "",
        sourceRightsAck: true,
        youtubeTermsAck: Boolean(payload.youtubeTermsAck),
        sidecarAck: Boolean(payload.sidecarAck),
        idempotencyKey: String(payload.idempotencyKey || batchId).slice(0, 128),
        status: control.ok ? "processing" : "failed",
        createdAt: now,
        updatedAt: now,
      });

      const remoteJobs = Array.isArray(control.data?.jobs) ? control.data.jobs as Array<Record<string, unknown>> : [];
      const createdJobs = [];
      for (let i = 0; i < itemIds.length; i += 1) {
        const remote = remoteJobs[i] || {};
        const jobId = String(remote.jobId || makeId("job"));
        const row = {
          jobId,
          batchId,
          actorEmail,
          actorId,
          provider: String(remote.provider || "youtube-playlist"),
          redactedSourceLabel: String(remote.redactedSourceLabel || `item-${i + 1}`),
          status: control.ok ? "queued" : "failed",
          progressPhase: control.ok ? "queued" : "failed",
          progressFraction: 0,
          operationId: planCheck.operationId,
          errorCode: control.ok ? "" : (control.code || "SERVICE_UNAVAILABLE"),
          attemptId: makeId("att"),
          stateVersion: 1,
          expiresAt: 0,
          createdAt: now,
          updatedAt: now,
          completedAt: 0,
        };
        await entities.AdminConverterJob.create(row);
        createdJobs.push(row);
      }

      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterBatch",
        targetId: batchId,
        outcome: control.ok ? "success" : "failure",
        requestId,
        detail: `selected=${itemIds.length}`,
      });

      return json({
        ok: true,
        requestId,
        data: { batchId, jobs: createdJobs.map(sanitizeJobProjection) },
      });
    }

    if (action === "converter.batch.pause" || action === "converter.batch.resume") {
      const batchId = String(payload.batchId || "").trim();
      if (!batchId) return errorResponse(400, "batchId is required.");
      const rows = await entities.AdminConverterBatch.filter({ batchId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) return errorResponse(404, "Batch not found.");
      const paused = action === "converter.batch.pause";
      const path = paused ? "/v1/batch/pause" : "/v1/batch/resume";
      const control = await callControlService("POST", path, { batchId, actorEmail });
      if (!control.ok && control.code === "PAUSE_REJECTED") {
        return errorResponse(400, "Pause was rejected.", "PAUSE_REJECTED");
      }
      await entities.AdminConverterBatch.update(row.id, {
        paused,
        status: paused ? "paused" : "processing",
        updatedAt: Date.now(),
      });
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterBatch",
        targetId: batchId,
        outcome: "success",
        requestId,
        detail: paused ? "paused" : "resumed",
      });
      return json({ ok: true, requestId, data: { batchId, paused } });
    }

    if (action === "converter.batch.retryFailed") {
      const batchId = String(payload.batchId || "").trim();
      if (!batchId) return errorResponse(400, "batchId is required.");
      const rows = await entities.AdminConverterBatch.filter({ batchId, actorEmail });
      if (!Array.isArray(rows) || !rows[0]) return errorResponse(404, "Batch not found.");
      const control = await callControlService("POST", "/v1/batch/retry-failed", { batchId, actorEmail });
      const jobs = await entities.AdminConverterJob.filter({ batchId, actorEmail });
      const failed = (Array.isArray(jobs) ? jobs : []).filter((j: { status?: string }) => j.status === "failed");
      for (const job of failed) {
        if (!job.id) continue;
        await entities.AdminConverterJob.update(job.id, {
          status: "queued",
          progressPhase: "queued",
          progressFraction: 0,
          errorCode: "",
          attemptId: makeId("att"),
          updatedAt: Date.now(),
          stateVersion: (Number(job.stateVersion) || 0) + 1,
        });
      }
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterBatch",
        targetId: batchId,
        outcome: "success",
        requestId,
        detail: `retried=${failed.length};service=${control.ok ? "ok" : control.code}`,
      });
      return json({ ok: true, requestId, data: { batchId, retried: failed.length } });
    }

    if (action === "converter.package.create") {
      if (Deno.env.get("ACCEPT_NEW_JOBS") === "false") {
        return errorResponse(503, "New jobs are temporarily disabled.", "SERVICE_UNAVAILABLE");
      }
      const batchId = String(payload.batchId || "").trim();
      if (!batchId) return errorResponse(400, "batchId is required.");
      const rows = await entities.AdminConverterBatch.filter({ batchId, actorEmail });
      const batch = Array.isArray(rows) ? rows[0] : null;
      if (!batch?.id) return errorResponse(404, "Batch not found.");

      const packageId = makeId("pkg");
      const now = Date.now();
      const control = await callControlService("POST", "/v1/packages/create", {
        packageId,
        batchId,
        actorEmail,
        actorId,
        includeThumbnails: Boolean(payload.includeThumbnails),
        includeSubtitles: Boolean(payload.includeSubtitles),
        includeMetadata: payload.includeMetadata !== false,
        readySubsetOnly: Boolean(payload.readySubsetOnly),
      });

      if (!control.ok && control.code === "PACKAGE_TOO_LARGE") {
        return errorResponse(400, "Package exceeds size limit.", "PACKAGE_TOO_LARGE");
      }
      if (!control.ok && control.code === "PACKAGE_INCOMPLETE") {
        return errorResponse(400, "Selected outputs are not ready.", "PACKAGE_INCOMPLETE");
      }

      const pkg = {
        packageId,
        batchId,
        actorEmail,
        actorId,
        status: control.ok ? "packaging" : "failed",
        entryCount: Number(control.data?.entryCount) || 0,
        sizeBucket: typeof control.data?.sizeBucket === "string" ? control.data.sizeBucket : "unknown",
        errorCode: control.ok ? "" : (control.code || "SERVICE_UNAVAILABLE"),
        includeThumbnails: Boolean(payload.includeThumbnails),
        includeSubtitles: Boolean(payload.includeSubtitles),
        includeMetadata: payload.includeMetadata !== false,
        readySubsetOnly: Boolean(payload.readySubsetOnly),
        expiresAt: now + 60 * 60 * 1000,
        downloadCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      await entities.AdminConverterPackage.create(pkg);
      await entities.AdminConverterBatch.update(batch.id, {
        packageId,
        kind: batch.kind || "playlist",
        updatedAt: now,
      });
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterPackage",
        targetId: packageId,
        outcome: control.ok ? "success" : "failure",
        requestId,
        detail: `batch=${batchId}`,
      });
      return json({ ok: true, requestId, data: sanitizePackage(pkg), warning: control.data?.warning || null });
    }

    if (action === "converter.package.get") {
      const packageId = String(payload.packageId || "").trim();
      if (!packageId) return errorResponse(400, "packageId is required.");
      const rows = await entities.AdminConverterPackage.filter({ packageId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return errorResponse(404, "Package not found.");
      const control = await callControlService("POST", "/v1/packages/get", { packageId, actorEmail });
      if (control.ok && control.data && row.id) {
        const patch = {
          status: control.data.status || row.status,
          entryCount: Number(control.data.entryCount) || row.entryCount,
          sizeBucket: typeof control.data.sizeBucket === "string" ? control.data.sizeBucket : row.sizeBucket,
          errorCode: typeof control.data.errorCode === "string" ? control.data.errorCode : row.errorCode,
          updatedAt: Date.now(),
        };
        await entities.AdminConverterPackage.update(row.id, patch);
        return json({ ok: true, requestId, data: sanitizePackage({ ...row, ...patch }) });
      }
      return json({ ok: true, requestId, data: sanitizePackage(row) });
    }

    if (action === "converter.package.download") {
      const packageId = String(payload.packageId || "").trim();
      if (!packageId) return errorResponse(400, "packageId is required.");
      const rows = await entities.AdminConverterPackage.filter({ packageId, actorEmail });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return errorResponse(404, "Package not found.", "DOWNLOAD_FORBIDDEN");
      if (String(row.status) !== "ready") {
        return errorResponse(403, "Download is not available.", "DOWNLOAD_FORBIDDEN");
      }
      if (row.expiresAt && Number(row.expiresAt) < Date.now()) {
        return errorResponse(410, "Package has expired.", "EXPIRED");
      }
      const control = await callControlService("POST", "/v1/packages/download-token", {
        packageId,
        actorEmail,
        ttlMs: SIGNED_DOWNLOAD_TTL_MS,
      });
      if (!control.ok || !control.data?.downloadUrl) {
        await writeAudit(entities, {
          actorEmail,
          actorId,
          action,
          targetType: "AdminConverterPackage",
          targetId: packageId,
          outcome: "failure",
          requestId,
          detail: `code=${control.code || "SERVICE_UNAVAILABLE"}`,
        });
        return errorResponse(503, "Download is temporarily unavailable.", control.code || "SERVICE_UNAVAILABLE");
      }
      if (row.id) {
        await entities.AdminConverterPackage.update(row.id, {
          downloadCount: (Number(row.downloadCount) || 0) + 1,
        });
      }
      await writeAudit(entities, {
        actorEmail,
        actorId,
        action,
        targetType: "AdminConverterPackage",
        targetId: packageId,
        outcome: "success",
        requestId,
        detail: "download-issued",
      });
      return json({
        ok: true,
        requestId,
        data: {
          packageId,
          downloadUrl: String(control.data.downloadUrl),
          expiresInMs: SIGNED_DOWNLOAD_TTL_MS,
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
    return errorResponse(500, "Unable to complete converter admin request.");
  }
});

function sanitizeJobProjection(row: Record<string, unknown>) {
  return {
    jobId: row.jobId,
    batchId: row.batchId,
    provider: row.provider,
    redactedSourceLabel: row.redactedSourceLabel,
    status: row.status,
    progressPhase: row.progressPhase,
    progressFraction: row.progressFraction,
    operationId: row.operationId,
    errorCode: row.errorCode || null,
    attemptId: row.attemptId,
    expiresAt: row.expiresAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt || null,
  };
}

function sanitizeDiscovery(row: Record<string, unknown>) {
  return {
    discoveryId: row.discoveryId,
    provider: row.provider,
    redactedLabel: row.redactedLabel,
    status: row.status,
    itemCount: row.itemCount || 0,
    truncated: Boolean(row.truncated),
    errorCode: row.errorCode || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sanitizeDiscoveryItem(row: Record<string, unknown>) {
  return {
    itemId: row.itemId || row.id,
    providerItemId: row.providerItemId,
    redactedTitle: row.redactedTitle || row.title || "item",
    durationBucket: row.durationBucket || "unknown",
    selected: Boolean(row.selected),
  };
}

function sanitizePackage(row: Record<string, unknown>) {
  return {
    packageId: row.packageId,
    batchId: row.batchId,
    status: row.status,
    entryCount: row.entryCount || 0,
    sizeBucket: row.sizeBucket || "unknown",
    errorCode: row.errorCode || null,
    includeThumbnails: Boolean(row.includeThumbnails),
    includeSubtitles: Boolean(row.includeSubtitles),
    includeMetadata: row.includeMetadata !== false,
    readySubsetOnly: Boolean(row.readySubsetOnly),
    expiresAt: row.expiresAt || null,
    downloadCount: row.downloadCount || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
