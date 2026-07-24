import { QUOTAS } from './quotas.js';

/**
 * Pure package size admission checks (unit-testable).
 */

export function admitPackageEntry(currentBytes, entryBytes) {
  const next = currentBytes + entryBytes;
  if (next > QUOTAS.packageHardCapBytes) {
    return {
      ok: false,
      code: 'PACKAGE_TOO_LARGE',
      message: `Package would exceed ${QUOTAS.packageHardCapBytes} byte hard cap`,
    };
  }
  return { ok: true, totalBytes: next };
}

export function packageSizeWarnings(totalBytes) {
  const warnings = [];
  if (totalBytes >= QUOTAS.packageWarnDesktopBytes) {
    warnings.push({ code: 'PACKAGE_WARN_DESKTOP', thresholdBytes: QUOTAS.packageWarnDesktopBytes });
  }
  if (totalBytes >= QUOTAS.packageWarnMobileBytes) {
    warnings.push({ code: 'PACKAGE_WARN_MOBILE', thresholdBytes: QUOTAS.packageWarnMobileBytes });
  }
  return warnings;
}

export function pickCompressionMethod(contentType, fileName) {
  const ct = String(contentType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();
  if (ct.startsWith('video/') || ct.startsWith('audio/') || ct.startsWith('image/')) {
    return 'store';
  }
  if (name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.jpg') || name.endsWith('.png')) {
    return 'store';
  }
  if (ct.includes('json') || ct.includes('text') || ct.includes('xml') || ct.includes('csv')) {
    return 'deflate';
  }
  return 'deflate';
}
