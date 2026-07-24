import { base44 } from '@/api/base44Client';
import { unwrapFunctionInvoke } from '@/api/tools/invoke-response';

const API_VERSION = 1;

/**
 * Invoke the allowlisted Base44 adminConverterApi gateway.
 * @param {string} action
 * @param {Record<string, unknown>} [payload]
 */
export async function invokeAdminConverterApi(action, payload = {}) {
  const res = await base44.functions.invoke('adminConverterApi', {
    version: API_VERSION,
    action,
    payload,
  });
  const body = unwrapFunctionInvoke(res);
  if (body?.ok === false || body?.error) {
    const msg = body?.error?.message ?? body?.error ?? 'Converter admin request failed';
    const err = new Error(typeof msg === 'string' ? msg : 'Converter admin request failed');
    if (typeof body?.error?.code === 'string') {
      err.code = body.error.code;
    }
    throw err;
  }
  return body;
}

export async function converterUrlSession() {
  const body = await invokeAdminConverterApi('session');
  return body.data;
}

/**
 * @param {string[]} urls
 */
export async function converterUrlValidate(urls) {
  const body = await invokeAdminConverterApi('converter.url.validate', { urls });
  return body.data;
}

/**
 * @param {{
 *   urls: string[],
 *   plan: Record<string, unknown>,
 *   idempotencyKey: string,
 *   sourceRightsAck: boolean,
 *   youtubeTermsAck?: boolean,
 * }} input
 */
export async function converterJobCreate(input) {
  const body = await invokeAdminConverterApi('converter.job.create', input);
  return body.data;
}

/**
 * @param {{ limit?: number }} [opts]
 */
export async function converterJobList(opts = {}) {
  const body = await invokeAdminConverterApi('converter.job.list', opts);
  return body.data?.items ?? [];
}

/**
 * @param {string} jobId
 */
export async function converterJobGet(jobId) {
  const body = await invokeAdminConverterApi('converter.job.get', { jobId });
  return body.data;
}

/**
 * @param {string} jobId
 */
export async function converterJobCancel(jobId) {
  const body = await invokeAdminConverterApi('converter.job.cancel', { jobId });
  return body.data;
}

/**
 * @param {string} jobId
 */
export async function converterJobRetry(jobId) {
  const body = await invokeAdminConverterApi('converter.job.retry', { jobId });
  return body.data;
}

/**
 * @param {string} jobId
 * @returns {Promise<{ jobId: string, downloadUrl: string, expiresInMs: number }>}
 */
export async function converterJobDownload(jobId) {
  const body = await invokeAdminConverterApi('converter.job.download', { jobId });
  return body.data;
}

/**
 * @param {{
 *   url: string,
 *   idempotencyKey: string,
 *   sourceRightsAck: boolean,
 *   youtubeTermsAck?: boolean,
 * }} input
 */
export async function converterDiscoveryCreate(input) {
  const body = await invokeAdminConverterApi('converter.discovery.create', input);
  return body.data;
}

/** @param {string} discoveryId */
export async function converterDiscoveryGet(discoveryId) {
  const body = await invokeAdminConverterApi('converter.discovery.get', { discoveryId });
  return body.data;
}

/** @param {string} discoveryId */
export async function converterDiscoveryCancel(discoveryId) {
  const body = await invokeAdminConverterApi('converter.discovery.cancel', { discoveryId });
  return body.data;
}

/**
 * @param {string} discoveryId
 * @param {{ limit?: number, offset?: number }} [opts]
 */
export async function converterDiscoveryItems(discoveryId, opts = {}) {
  const body = await invokeAdminConverterApi('converter.discovery.items', {
    discoveryId,
    ...opts,
  });
  return body.data;
}

/**
 * @param {{
 *   discoveryId: string,
 *   itemIds: string[],
 *   plan: Record<string, unknown>,
 *   idempotencyKey?: string,
 *   sourceRightsAck: boolean,
 *   youtubeTermsAck?: boolean,
 *   sidecarAck?: boolean,
 *   numberingPolicy?: string,
 *   mode?: 'audio' | 'video',
 *   includeThumbnails?: boolean,
 *   includeSubtitles?: boolean,
 *   includeMetadata?: boolean,
 * }} input
 */
export async function converterBatchConfirm(input) {
  const body = await invokeAdminConverterApi('converter.batch.confirm', input);
  return body.data;
}

/** @param {string} batchId */
export async function converterBatchPause(batchId) {
  const body = await invokeAdminConverterApi('converter.batch.pause', { batchId });
  return body.data;
}

/** @param {string} batchId */
export async function converterBatchResume(batchId) {
  const body = await invokeAdminConverterApi('converter.batch.resume', { batchId });
  return body.data;
}

/** @param {string} batchId */
export async function converterBatchRetryFailed(batchId) {
  const body = await invokeAdminConverterApi('converter.batch.retryFailed', { batchId });
  return body.data;
}

/**
 * @param {{
 *   batchId: string,
 *   includeThumbnails?: boolean,
 *   includeSubtitles?: boolean,
 *   includeMetadata?: boolean,
 *   readySubsetOnly?: boolean,
 * }} input
 */
export async function converterPackageCreate(input) {
  const body = await invokeAdminConverterApi('converter.package.create', input);
  return body.data;
}

/** @param {string} packageId */
export async function converterPackageGet(packageId) {
  const body = await invokeAdminConverterApi('converter.package.get', { packageId });
  return body.data;
}

/** @param {string} packageId */
export async function converterPackageDownload(packageId) {
  const body = await invokeAdminConverterApi('converter.package.download', { packageId });
  return body.data;
}
