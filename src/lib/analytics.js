const ANON_KEY = 'veridian_anonymous_id';

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

export async function trackProductEvent(event, metadata = {}) {
  if (typeof window === 'undefined') return;
  try {
    const { base44 } = await import('@/api/base44Client');
    await base44.functions.invoke('logProductEvent', {
      event,
      anonymousId: getAnonymousId(),
      path: window.location.pathname,
      metadata,
    });
  } catch {
    // analytics must never block UX
  }
}

export function trackProductEventOnce(event, metadata = {}) {
  const key = `${event}:${JSON.stringify(metadata)}`;
  if (TRACKED_ONCE.has(key)) return;
  TRACKED_ONCE.add(key);
  trackProductEvent(event, metadata);
}
