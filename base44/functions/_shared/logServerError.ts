import { upsertErrorLog, clipString } from "../_shared/errorLog.ts";

type Base44Client = ReturnType<typeof import("npm:@base44/sdk@0.8.31").createClientFromRequest>;

export async function logServerError(
  base44: Base44Client,
  route: string,
  err: unknown,
  context?: Record<string, unknown>,
) {
  try {
    const message = err instanceof Error ? err.message : String(err);
    await upsertErrorLog(base44, {
      message: clipString(message, 2000),
      stack: err instanceof Error ? clipString(err.stack, 8000) : undefined,
      route,
      source: "server",
      environment: Deno.env.get("ENVIRONMENT") ?? "production",
      context,
    });
  } catch (logErr) {
    console.error("[logServerError]", logErr);
  }
}
