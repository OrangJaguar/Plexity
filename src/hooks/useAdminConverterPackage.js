import { useCallback, useEffect, useRef, useState } from 'react';
import {
  converterPackageCreate,
  converterPackageDownload,
  converterPackageGet,
} from '@/api/admin/converter-url-api';
import {
  DEFAULT_REMOTE_PACKAGE_OPTIONS,
  normalizeRemotePackageOptions,
  validatePackageCreateRequest,
} from '@/lib/tools/converter/remote-package-model.js';
import { trackConverterEvent } from '@/lib/tools/converter/converter-telemetry.js';

/**
 * Admin remote package hook — does not use local converter ZIP/OPFS paths.
 */
export function useAdminConverterPackage({
  batchId = null,
  readyCount = 0,
  selectedCount = 0,
  estimatedBytes = 0,
  device = /** @type {'desktop' | 'mobile'} */ ('desktop'),
} = {}) {
  const [options, setOptions] = useState(DEFAULT_REMOTE_PACKAGE_OPTIONS);
  const [pkg, setPkg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [warning, setWarning] = useState(/** @type {string | null} */ (null));
  const [statusMessage, setStatusMessage] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!pkg?.packageId || pkg.status === 'ready' || pkg.status === 'failed') return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await converterPackageGet(String(pkg.packageId));
        if (mountedRef.current) setPkg(data);
      } catch {
        // ignore transient poll errors
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [pkg?.packageId, pkg?.status]);

  const updateOption = useCallback((key, value) => {
    setOptions((prev) => normalizeRemotePackageOptions({ ...prev, [key]: value }));
  }, []);

  const createPackage = useCallback(async () => {
    if (!batchId) {
      setError('BATCH_REQUIRED');
      return;
    }
    const gate = validatePackageCreateRequest({
      readyCount,
      selectedCount,
      estimatedBytes,
      device,
      options,
    });
    if (!gate.ok) {
      setError(gate.code);
      setWarning(null);
      return;
    }
    setWarning(gate.warning);
    setBusy(true);
    setError(null);
    try {
      const data = await converterPackageCreate({
        batchId,
        ...gate.options,
      });
      setPkg(data);
      setStatusMessage('Package job started.');
      trackConverterEvent('remote_package_create', {
        outcome: 'success',
        remoteSource: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Package create failed');
      trackConverterEvent('remote_package_create', {
        outcome: 'fail',
        remoteSource: true,
        statusCode: err?.code || 'SERVICE_UNAVAILABLE',
      });
    } finally {
      setBusy(false);
    }
  }, [batchId, readyCount, selectedCount, estimatedBytes, device, options]);

  const downloadPackage = useCallback(async () => {
    if (!pkg?.packageId) return;
    setBusy(true);
    try {
      const latest = await converterPackageGet(String(pkg.packageId));
      if (String(latest?.status) !== 'ready') throw new Error('Download is not available.');
      const data = await converterPackageDownload(String(pkg.packageId));
      if (data?.downloadUrl) {
        const anchor = document.createElement('a');
        anchor.href = data.downloadUrl;
        anchor.rel = 'noopener';
        anchor.download = '';
        anchor.click();
        setStatusMessage('Package download started (signed link expires in minutes).');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  }, [pkg]);

  return {
    options,
    updateOption,
    pkg,
    busy,
    error,
    warning,
    statusMessage,
    createPackage,
    downloadPackage,
  };
}
