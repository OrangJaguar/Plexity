const buckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

/**
 * Fixed-window rate limit. Returns true if the request is allowed.
 */
export function checkRequestRateLimit(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

export function rateLimitKey(scope: string, req: Request, extra?: string) {
  const ip = getClientIp(req);
  const suffix = extra ? `:${extra}` : "";
  return `${scope}:${ip}${suffix}`;
}
