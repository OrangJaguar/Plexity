/**
 * adminApi — allowlisted privileged admin gateway.
 *
 * IMPORTANT (Base44 deploy): Do not import from ../_shared or sibling folders.
 * Each function deploys as a standalone bundle.
 *
 * Actions (versioned allowlist only):
 * - session
 * - feedback.list
 * - feedback.update
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

type Base44Client = ReturnType<typeof createClientFromRequest>;

const API_VERSION = 1;
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_ACTIONS = new Set(["session", "feedback.list", "feedback.update"]);
const FEEDBACK_STATUSES = new Set(["new", "reviewing", "resolved", "closed"]);
const MAX_ADMIN_NOTES = 8000;
const MAX_LIST = 500;

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function errorResponse(status: number, message: string) {
  return json({ error: { message } }, status);
}

function serviceEntities(base44: Base44Client) {
  return base44.asServiceRole?.entities ?? base44.entities;
}

function makeRequestId() {
  return `adm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
    // Audit failure must not break the primary action response.
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

  let base44: Base44Client;
  try {
    base44 = createClientFromRequest(req);
  } catch {
    return errorResponse(500, "Unable to initialize admin API.");
  }

  let user: { id?: string; email?: string; role?: string };
  try {
    user = await base44.auth.me();
  } catch {
    return errorResponse(401, "Authentication required.");
  }

  if (!user?.email) {
    return errorResponse(401, "Authentication required.");
  }

  if (user.role !== "admin") {
    return errorResponse(403, "Admin access required.");
  }

  const entities = serviceEntities(base44);

  try {
    if (action === "session") {
      return json({
        ok: true,
        requestId,
        data: {
          email: user.email,
          role: user.role,
          version: API_VERSION,
          actions: [...ALLOWED_ACTIONS],
        },
      });
    }

    if (action === "feedback.list") {
      const rows = await entities.ToolsFeedback.list("-createdAt", MAX_LIST);
      return json({
        ok: true,
        requestId,
        data: { items: rows ?? [] },
      });
    }

    if (action === "feedback.update") {
      const id = String(payload.id || "").trim();
      if (!id || id.length > 128) {
        return errorResponse(400, "Invalid feedback id.");
      }

      const patch: Record<string, unknown> = { updatedAt: Date.now() };
      if (payload.status !== undefined) {
        const status = String(payload.status).trim();
        if (!FEEDBACK_STATUSES.has(status)) {
          return errorResponse(400, "Invalid feedback status.");
        }
        patch.status = status;
      }
      if (payload.adminNotes !== undefined) {
        const notes = String(payload.adminNotes);
        if (notes.length > MAX_ADMIN_NOTES) {
          return errorResponse(400, "Admin notes too long.");
        }
        patch.adminNotes = notes;
      }

      if (Object.keys(patch).length <= 1) {
        return errorResponse(400, "No valid fields to update.");
      }

      const updated = await entities.ToolsFeedback.update(id, patch);
      await writeAudit(entities, {
        actorEmail: user.email,
        actorId: user.id,
        action,
        targetType: "ToolsFeedback",
        targetId: id,
        outcome: "success",
        requestId,
        detail: Object.keys(patch).filter((k) => k !== "updatedAt").join(","),
      });

      return json({
        ok: true,
        requestId,
        data: updated,
      });
    }

    return errorResponse(400, "Unknown or disallowed action.");
  } catch {
    await writeAudit(entities, {
      actorEmail: user.email!,
      actorId: user.id,
      action,
      outcome: "failure",
      requestId,
      detail: "handler_error",
    });
    return errorResponse(500, "Admin action failed.");
  }
});
