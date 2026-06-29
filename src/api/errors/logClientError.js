import { base44 } from '@/api/base44Client';
import { fingerprintError } from '@/utils/errors/fingerprintError';
import { getEnvironment } from '@/utils/errors/getEnvironment';
import { collectClientInfo } from '@/utils/errors/collectClientInfo';

const recentFingerprints = new Map();
const DEDUPE_MS = 60_000;

function shouldSend(groupId) {
  const now = Date.now();
  const last = recentFingerprints.get(groupId);
  if (last && now - last < DEDUPE_MS) return false;
  recentFingerprints.set(groupId, now);
  return true;
}

/**
 * Fire-and-forget client error logging. Never throws to callers.
 */
export function logClientError({
  message,
  stack,
  route,
  source = 'client',
  context,
} = {}) {
  if (!message) return;

  const stackStr = stack ?? '';
  const groupId = fingerprintError(message, stackStr);
  if (!shouldSend(groupId)) return;

  const payload = {
    message: String(message).slice(0, 2000),
    stack: stackStr.slice(0, 8000),
    route: route ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
    source,
    environment: getEnvironment(),
    clientInfo: collectClientInfo(),
    context: context ?? {},
  };

  base44.functions.invoke('logAppError', payload).catch(() => {
    // Silently ignore logging failures
  });
}
