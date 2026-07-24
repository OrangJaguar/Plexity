import { useCallback, useEffect, useState } from 'react';
import {
  converterAiAssistCompress,
  converterAiAssistPlan,
  converterAiSession,
} from '@/api/admin/converter-ai-api';
import { sanitizeUserNlRequest } from '@/lib/tools/converter/ai/prompt-safety.js';
import { trackConverterEvent, TELEMETRY_EVENTS } from '@/lib/tools/converter/converter-telemetry.js';

/**
 * Admin AI assist hook — never coerces AI blobs into local File/OPFS jobs.
 */
export function useAdminConverterAiAssist() {
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [softBudgetWarning, setSoftBudgetWarning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    converterAiSession()
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => { cancelled = true; };
  }, []);

  const clearDraft = useCallback(() => setDraft(null), []);

  const requestPlan = useCallback(async (text) => {
    const gate = sanitizeUserNlRequest(text);
    if (!gate.ok) {
      setError(gate.code);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await converterAiAssistPlan({ request: gate.text, confirmed: true });
      setDraft(data);
      setSoftBudgetWarning(Boolean(data.softBudgetWarning));
      trackConverterEvent(TELEMETRY_EVENTS.AI_ASSIST_PLAN, {
        outcome: 'success',
        aiAction: 'assist.plan',
        provider: 'openai-compatible',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assist failed');
      trackConverterEvent(TELEMETRY_EVENTS.AI_FAIL, {
        outcome: 'fail',
        aiAction: 'assist.plan',
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const requestCompress = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await converterAiAssistCompress({ confirmed: true });
      setDraft(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compress assist failed');
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    session,
    draft,
    busy,
    error,
    softBudgetWarning,
    requestPlan,
    requestCompress,
    clearDraft,
  };
}
