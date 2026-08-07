const ANON_KEY = 'plexity_anonymous_id';

const TRACKED_ONCE = new Set();

function getAnonymousId() {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

/** Soft-fail product analytics (no remote sink after Base44 removal). */
export async function trackProductEvent(event, metadata = {}) {
  if (typeof window === 'undefined') return;
  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, { anonymousId: getAnonymousId(), ...metadata });
  }
}

export function trackProductEventOnce(event, metadata = {}) {
  const key = `${event}:${JSON.stringify(metadata)}`;
  if (TRACKED_ONCE.has(key)) return;
  TRACKED_ONCE.add(key);
  trackProductEvent(event, metadata);
}
