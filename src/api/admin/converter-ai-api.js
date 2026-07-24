import { base44 } from '@/api/base44Client';
import { unwrapFunctionInvoke } from '@/api/tools/invoke-response';

const API_VERSION = 1;

/**
 * @param {string} action
 * @param {Record<string, unknown>} [payload]
 */
export async function invokeAdminConverterAiApi(action, payload = {}) {
  const res = await base44.functions.invoke('adminConverterAiApi', {
    version: API_VERSION,
    action,
    payload,
  });
  const body = unwrapFunctionInvoke(res);
  if (body?.ok === false || body?.error) {
    const msg = body?.error?.message ?? body?.error ?? 'Converter AI request failed';
    const err = new Error(typeof msg === 'string' ? msg : 'Converter AI request failed');
    if (typeof body?.error?.code === 'string') err.code = body.error.code;
    throw err;
  }
  return body;
}

export async function converterAiSession() {
  const body = await invokeAdminConverterAiApi('session');
  return body.data;
}

/** @param {{ request: string, confirmed: boolean }} input */
export async function converterAiAssistPlan(input) {
  const body = await invokeAdminConverterAiApi('converter.ai.assist.plan', input);
  return body.data;
}

/** @param {{ confirmed: boolean, count?: number }} input */
export async function converterAiAssistNaming(input) {
  const body = await invokeAdminConverterAiApi('converter.ai.assist.naming', input);
  return body.data;
}

/** @param {{ confirmed: boolean }} input */
export async function converterAiAssistSummary(input) {
  const body = await invokeAdminConverterAiApi('converter.ai.assist.summary', input);
  return body.data;
}

/** @param {{ confirmed: boolean }} input */
export async function converterAiAssistCompress(input) {
  const body = await invokeAdminConverterAiApi('converter.ai.assist.compress', input);
  return body.data;
}

/** @param {{ confirmed: boolean, uploadId?: string }} input */
export async function converterAiOcrRun(input) {
  const body = await invokeAdminConverterAiApi('converter.ai.ocr.run', input);
  return body.data;
}

/** @param {string} jobId */
export async function converterAiOcrGet(jobId) {
  const body = await invokeAdminConverterAiApi('converter.ai.ocr.get', { jobId });
  return body.data;
}

/** @param {{ confirmed: boolean }} input */
export async function converterAiOcrAltText(input) {
  const body = await invokeAdminConverterAiApi('converter.ai.ocr.altText', input);
  return body.data;
}

/** @param {{ confirmed: boolean, uploadId?: string }} input */
export async function converterAiTranscribeRun(input) {
  const body = await invokeAdminConverterAiApi('converter.ai.transcribe.run', input);
  return body.data;
}

/** @param {string} jobId */
export async function converterAiTranscribeGet(jobId) {
  const body = await invokeAdminConverterAiApi('converter.ai.transcribe.get', { jobId });
  return body.data;
}

/** @param {{ confirmed: boolean, language?: string, cues?: unknown }} input */
export async function converterAiTranscribeTranslate(input) {
  const body = await invokeAdminConverterAiApi('converter.ai.transcribe.translate', input);
  return body.data;
}

/** @param {{ confirmed: boolean, format?: 'srt'|'vtt', cues?: unknown }} input */
export async function converterAiSubtitleGenerate(input) {
  const body = await invokeAdminConverterAiApi('converter.ai.subtitle.generate', input);
  return body.data;
}

/** @param {string} jobId */
export async function converterAiJobCancel(jobId) {
  const body = await invokeAdminConverterAiApi('converter.ai.job.cancel', { jobId });
  return body.data;
}

export async function converterAiUsageSummary() {
  const body = await invokeAdminConverterAiApi('converter.ai.usage.summary');
  return body.data;
}
