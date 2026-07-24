import { base44 } from '@/api/base44Client';
import { unwrapFunctionInvoke } from '@/api/tools/invoke-response';

const API_VERSION = 1;

/**
 * Invoke the allowlisted Base44 adminApi gateway.
 * @param {string} action
 * @param {Record<string, unknown>} [payload]
 */
export async function invokeAdminApi(action, payload = {}) {
  const res = await base44.functions.invoke('adminApi', {
    version: API_VERSION,
    action,
    payload,
  });
  const body = unwrapFunctionInvoke(res);
  if (body?.ok === false || body?.error) {
    const msg = body?.error?.message ?? body?.error ?? 'Admin request failed';
    throw new Error(typeof msg === 'string' ? msg : 'Admin request failed');
  }
  return body;
}

export async function adminSession() {
  const body = await invokeAdminApi('session');
  return body.data;
}

export async function adminListFeedback() {
  const body = await invokeAdminApi('feedback.list');
  return body.data?.items ?? [];
}

/**
 * @param {string} id
 * @param {{ status?: string, adminNotes?: string }} patch
 */
export async function adminUpdateFeedback(id, patch) {
  const body = await invokeAdminApi('feedback.update', { id, ...patch });
  return body.data;
}
