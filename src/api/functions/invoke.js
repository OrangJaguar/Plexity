/**
 * Invoke Supabase Edge Functions (JWT attached by client).
 */
import { getSupabase } from '@/api/supabaseClient';

const FUNCTION_NAMES = {
  toolsMarketData: 'tools-market-data',
  submitFeedback: 'submit-feedback',
  adminApi: 'admin-api',
};

function throwIfFunctionErrorBody(body) {
  if (!body?.error) return body;
  const msg = body.error?.message ?? body.error;
  throw new Error(typeof msg === 'string' ? msg : 'Request failed');
}

/**
 * @param {'toolsMarketData' | 'submitFeedback' | 'adminApi'} name
 * @param {Record<string, unknown>} [body]
 */
export async function invokeBackendFunction(name, body = {}) {
  const fn = FUNCTION_NAMES[name];
  if (!fn) throw new Error(`Unknown function: ${name}`);

  const { data, error } = await getSupabase().functions.invoke(fn, { body });
  if (error) {
    let message = error.message || 'Function request failed';
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === 'function') {
        const payload = await ctx.json();
        const nested = payload?.error?.message ?? payload?.error ?? payload?.message;
        if (typeof nested === 'string' && nested) message = nested;
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return throwIfFunctionErrorBody(data);
}
