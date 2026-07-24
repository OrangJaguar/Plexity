import { useCallback, useEffect, useRef, useState } from 'react';
import {
  converterJobCancel,
  converterJobCreate,
  converterJobDownload,
  converterJobGet,
  converterJobList,
  converterJobRetry,
  converterUrlValidate,
} from '@/api/admin/converter-url-api';
import { parseUrlListCsv, parseUrlListText } from '@/lib/tools/converter/url-import-parse.js';
import {
  acceptedUrlsForCreate,
  canConfirmReview,
  createUrlImportReviewSession,
  reviewRequiresYouTubeAck,
  setReviewAcknowledgment,
} from '@/lib/tools/converter/url-import-review.js';
import { REMOTE_TERMINAL_STATES } from '@/lib/tools/converter/remote-job-schema.js';
import { trackConverterEvent } from '@/lib/tools/converter/converter-telemetry.js';
import { consumeRemoteAiPlanSeed } from '@/lib/tools/converter/ai/ai-plan-seed.js';

const ACTIVE_POLL_MS = 2000;
const IDLE_POLL_MS = 10000;
const MAX_BACKOFF_MS = 30000;

/**
 * Admin-only remote URL workspace. Never coerces remote jobs into File/OPFS local jobs.
 */
export function useAdminConverterUrlWorkspace() {
  const [reviewSession, setReviewSession] = useState(null);
  const [parseSummary, setParseSummary] = useState(null);
  const [remoteJobs, setRemoteJobs] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [statusMessage, setStatusMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const backoffRef = useRef(ACTIVE_POLL_MS);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshJobs = useCallback(async () => {
    try {
      const items = await converterJobList({ limit: 50 });
      if (!mountedRef.current) return;
      setRemoteJobs(Array.isArray(items) ? items : []);
      backoffRef.current = ACTIVE_POLL_MS;
    } catch (err) {
      if (!mountedRef.current) return;
      backoffRef.current = Math.min(MAX_BACKOFF_MS, (backoffRef.current || ACTIVE_POLL_MS) * 2);
      setError(err instanceof Error ? err.message : 'Unable to refresh remote jobs');
    }
  }, []);

  useEffect(() => {
    let timer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const hasActive = remoteJobs.some((j) => !REMOTE_TERMINAL_STATES.has(String(j.status)));
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const delay = hidden || !hasActive ? IDLE_POLL_MS : backoffRef.current;
      await refreshJobs();
      if (cancelled) return;
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, ACTIVE_POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refreshJobs, remoteJobs.length]);

  const importFromText = useCallback((text) => {
    const parsed = parseUrlListText(text);
    setParseSummary(parsed);
    setReviewSession(createUrlImportReviewSession(parsed));
    setError(null);
    setStatusMessage(
      `Parsed ${parsed.entries.length} entries — ${parsed.accepted.length} accepted for review.`,
    );
  }, []);

  const importFromCsv = useCallback((text) => {
    const parsed = parseUrlListCsv(text);
    setParseSummary(parsed);
    setReviewSession(createUrlImportReviewSession(parsed));
    setError(null);
    setStatusMessage(
      `Parsed CSV — ${parsed.accepted.length} accepted for review.`,
    );
  }, []);

  const setAck = useCallback((key, value) => {
    setReviewSession((prev) => (prev ? setReviewAcknowledgment(prev, key, value) : prev));
  }, []);

  const validateWithServer = useCallback(async () => {
    if (!reviewSession) return;
    setBusy(true);
    setError(null);
    try {
      const urls = acceptedUrlsForCreate(reviewSession);
      const data = await converterUrlValidate(urls);
      setStatusMessage(`Server validated ${data?.entries?.length ?? 0} entries.`);
      trackConverterEvent('remote_import_validate', {
        outcome: 'success',
        remoteSource: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      trackConverterEvent('remote_import_validate', {
        outcome: 'fail',
        remoteSource: true,
        statusCode: err?.code || 'URL_INVALID',
      });
    } finally {
      setBusy(false);
    }
  }, [reviewSession]);

  /**
   * @param {Record<string, unknown>} plan
   */
  const confirmAndCreate = useCallback(async (plan) => {
    if (!reviewSession) return;
    const gate = canConfirmReview(reviewSession);
    if (!gate.ok) {
      setError(gate.reason);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const seeded = consumeRemoteAiPlanSeed();
      const effectivePlan = (plan && typeof plan === 'object' && plan.operationId)
        ? plan
        : (seeded && seeded.operationId ? seeded : plan);
      const urls = acceptedUrlsForCreate(reviewSession);
      const data = await converterJobCreate({
        urls,
        plan: effectivePlan,
        idempotencyKey: reviewSession.sessionId,
        sourceRightsAck: reviewSession.acknowledgments.sourceRights,
        youtubeTermsAck: reviewSession.acknowledgments.youtubeTermsRisk,
      });
      const jobs = data?.jobs ?? data?.localProjections ?? [];
      setRemoteJobs((prev) => {
        const byId = new Map(prev.map((j) => [String(j.jobId), j]));
        for (const j of jobs) byId.set(String(j.jobId), j);
        return [...byId.values()];
      });
      setStatusMessage(`Created ${jobs.length} remote job(s).`);
      setReviewSession(null);
      setParseSummary(null);
      trackConverterEvent('remote_import_create', {
        outcome: 'success',
        remoteSource: true,
        provider: urls.some((u) => /youtube|youtu\.be/i.test(u)) ? 'youtube-single' : 'direct-https',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
      trackConverterEvent('remote_import_create', {
        outcome: 'fail',
        remoteSource: true,
        statusCode: err?.code || 'SERVICE_UNAVAILABLE',
      });
    } finally {
      setBusy(false);
    }
  }, [reviewSession]);

  const cancelRemoteJob = useCallback(async (jobId) => {
    setBusy(true);
    try {
      await converterJobCancel(jobId);
      await refreshJobs();
      setStatusMessage(`Cancelled ${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }, [refreshJobs]);

  const retryRemoteJob = useCallback(async (jobId) => {
    setBusy(true);
    try {
      await converterJobRetry(jobId);
      await refreshJobs();
      setStatusMessage(`Retrying ${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setBusy(false);
    }
  }, [refreshJobs]);

  const downloadRemoteJob = useCallback(async (jobId) => {
    setBusy(true);
    try {
      // Fresh authorization check via API before opening signed URL.
      const latest = await converterJobGet(jobId);
      if (String(latest?.status) !== 'ready') {
        throw new Error('Download is not available.');
      }
      const data = await converterJobDownload(jobId);
      if (data?.downloadUrl) {
        const anchor = document.createElement('a');
        anchor.href = data.downloadUrl;
        anchor.rel = 'noopener';
        anchor.download = '';
        anchor.click();
        setStatusMessage('Download started (signed link expires in minutes).');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const clearReview = useCallback(() => {
    setReviewSession(null);
    setParseSummary(null);
    setError(null);
  }, []);

  return {
    reviewSession,
    parseSummary,
    remoteJobs,
    statusMessage,
    busy,
    error,
    requiresYouTubeAck: reviewSession ? reviewRequiresYouTubeAck(reviewSession) : false,
    canConfirm: reviewSession ? canConfirmReview(reviewSession).ok : false,
    importFromText,
    importFromCsv,
    setAck,
    validateWithServer,
    confirmAndCreate,
    cancelRemoteJob,
    retryRemoteJob,
    downloadRemoteJob,
    refreshJobs,
    clearReview,
  };
}
