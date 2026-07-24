import { useCallback, useEffect, useRef, useState } from 'react';
import {
  converterBatchConfirm,
  converterBatchPause,
  converterBatchResume,
  converterBatchRetryFailed,
  converterDiscoveryCancel,
  converterDiscoveryCreate,
  converterDiscoveryGet,
  converterDiscoveryItems,
  converterJobList,
} from '@/api/admin/converter-url-api';
import {
  filterDiscoveryItems,
  normalizeDiscoveryItems,
  setAllSelected,
  setItemSelected,
  validateSelection,
} from '@/lib/tools/converter/playlist-selection.js';
import { AUDIO_VIDEO_MODES } from '@/lib/tools/converter/remote-job-schema.js';
import { consumeRemoteAiPlanSeed } from '@/lib/tools/converter/ai/ai-plan-seed.js';
import { trackConverterEvent } from '@/lib/tools/converter/converter-telemetry.js';

const POLL_MS = 2000;

/**
 * Admin playlist/feed discovery workspace — never uses File/OPFS.
 */
export function useAdminConverterPlaylistWorkspace() {
  const [url, setUrl] = useState('');
  const [discovery, setDiscovery] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(/** @type {'audio' | 'video'} */ ('video'));
  const [numberingPolicy, setNumberingPolicy] = useState('{num} - {title}.{ext}');
  const [includeThumbnails, setIncludeThumbnails] = useState(false);
  const [includeSubtitles, setIncludeSubtitles] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [acks, setAcks] = useState({
    sourceRights: false,
    youtubeTermsRisk: false,
    sidecarDisclosure: false,
  });
  const [batchId, setBatchId] = useState(/** @type {string | null} */ (null));
  const [batchPaused, setBatchPaused] = useState(false);
  const [childJobs, setChildJobs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [statusMessage, setStatusMessage] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const filteredItems = filterDiscoveryItems(items, query);
  const selectedCount = items.filter((i) => i.selected).length;

  const refreshDiscovery = useCallback(async (discoveryId) => {
    const data = await converterDiscoveryGet(discoveryId);
    if (!mountedRef.current) return data;
    setDiscovery(data);
    if (data?.status === 'discovered' || data?.status === 'ready' || Number(data?.itemCount) > 0) {
      const page = await converterDiscoveryItems(discoveryId, { limit: 200, offset: 0 });
      if (!mountedRef.current) return data;
      setItems(normalizeDiscoveryItems(page?.items || []).map((item) => ({
        ...item,
        selected: false,
      })));
    }
    return data;
  }, []);

  useEffect(() => {
    if (!discovery?.discoveryId) return undefined;
    if (['failed', 'cancelled', 'discovered'].includes(String(discovery.status))) return undefined;
    const timer = setInterval(() => {
      void refreshDiscovery(String(discovery.discoveryId));
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [discovery?.discoveryId, discovery?.status, refreshDiscovery]);

  useEffect(() => {
    if (!batchId) return undefined;
    const timer = setInterval(async () => {
      try {
        const jobs = await converterJobList({ limit: 100 });
        if (!mountedRef.current) return;
        setChildJobs((Array.isArray(jobs) ? jobs : []).filter((j) => String(j.batchId) === batchId));
      } catch {
        // keep last known
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [batchId]);

  const startDiscovery = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (!acks.sourceRights) throw new Error('SOURCE_RIGHTS_REQUIRED');
      const data = await converterDiscoveryCreate({
        url: url.trim(),
        idempotencyKey: `disc-${Date.now().toString(36)}`,
        sourceRightsAck: acks.sourceRights,
        youtubeTermsAck: acks.youtubeTermsRisk,
      });
      setDiscovery(data);
      setStatusMessage('Discovery started.');
      trackConverterEvent('remote_discovery_start', {
        outcome: 'success',
        remoteSource: true,
        provider: data?.provider || 'youtube-playlist',
      });
      await refreshDiscovery(String(data.discoveryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
      trackConverterEvent('remote_discovery_start', {
        outcome: 'fail',
        remoteSource: true,
        statusCode: err?.code || 'DISCOVERY_FAILED',
      });
    } finally {
      setBusy(false);
    }
  }, [acks, url, refreshDiscovery]);

  const cancelDiscovery = useCallback(async () => {
    if (!discovery?.discoveryId) return;
    setBusy(true);
    try {
      await converterDiscoveryCancel(String(discovery.discoveryId));
      setDiscovery((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      setStatusMessage('Discovery cancelled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }, [discovery]);

  const selectAll = useCallback((selected) => {
    setItems((prev) => setAllSelected(prev, selected));
  }, []);

  const toggleItem = useCallback((itemId, selected) => {
    setItems((prev) => setItemSelected(prev, itemId, selected));
  }, []);

  const confirmBatch = useCallback(async () => {
    const gate = validateSelection(items);
    if (!gate.ok) {
      setError(gate.code);
      return;
    }
    if (!acks.sourceRights) {
      setError('SOURCE_RIGHTS_REQUIRED');
      return;
    }
    if ((includeThumbnails || includeSubtitles) && !acks.sidecarDisclosure) {
      setError('SIDECAR_ACK_REQUIRED');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const seeded = consumeRemoteAiPlanSeed();
      const plan = (seeded && seeded.operationId)
        ? { ...seeded, schemaVersion: 2 }
        : AUDIO_VIDEO_MODES[mode]
          ? { operationId: AUDIO_VIDEO_MODES[mode].operationId, schemaVersion: 2 }
          : { operationId: 'video-to-mp4', schemaVersion: 2 };
      const data = await converterBatchConfirm({
        discoveryId: String(discovery.discoveryId),
        itemIds: gate.selected.map((i) => i.itemId),
        plan,
        sourceRightsAck: true,
        youtubeTermsAck: acks.youtubeTermsRisk,
        sidecarAck: acks.sidecarDisclosure,
        numberingPolicy,
        mode,
        includeThumbnails,
        includeSubtitles,
        includeMetadata,
        idempotencyKey: `batch-${discovery.discoveryId}-${Date.now().toString(36)}`,
      });
      setBatchId(String(data.batchId));
      setChildJobs(data.jobs || []);
      setStatusMessage(`Started ${gate.selected.length} jobs.`);
      trackConverterEvent('remote_batch_confirm', {
        outcome: 'success',
        remoteSource: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setBusy(false);
    }
  }, [
    items,
    acks,
    discovery,
    mode,
    numberingPolicy,
    includeThumbnails,
    includeSubtitles,
    includeMetadata,
  ]);

  const pauseBatch = useCallback(async () => {
    if (!batchId) return;
    await converterBatchPause(batchId);
    setBatchPaused(true);
    setStatusMessage('Batch paused.');
  }, [batchId]);

  const resumeBatch = useCallback(async () => {
    if (!batchId) return;
    await converterBatchResume(batchId);
    setBatchPaused(false);
    setStatusMessage('Batch resumed.');
  }, [batchId]);

  const retryFailed = useCallback(async () => {
    if (!batchId) return;
    const data = await converterBatchRetryFailed(batchId);
    setStatusMessage(`Retried ${data?.retried ?? 0} failed jobs.`);
  }, [batchId]);

  const setAck = useCallback((key, value) => {
    setAcks((prev) => ({ ...prev, [key]: Boolean(value) }));
  }, []);

  const readyCount = childJobs.filter((j) => j.status === 'ready').length;
  const failedCount = childJobs.filter((j) => j.status === 'failed').length;

  return {
    url,
    setUrl,
    discovery,
    items: filteredItems,
    allItems: items,
    query,
    setQuery,
    mode,
    setMode,
    numberingPolicy,
    setNumberingPolicy,
    includeThumbnails,
    setIncludeThumbnails,
    includeSubtitles,
    setIncludeSubtitles,
    includeMetadata,
    setIncludeMetadata,
    acks,
    setAck,
    selectedCount,
    batchId,
    batchPaused,
    childJobs,
    readyCount,
    failedCount,
    busy,
    error,
    statusMessage,
    startDiscovery,
    cancelDiscovery,
    selectAll,
    toggleItem,
    confirmBatch,
    pauseBatch,
    resumeBatch,
    retryFailed,
  };
}
