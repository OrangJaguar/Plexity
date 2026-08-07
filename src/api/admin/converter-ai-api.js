/**
 * Converter AI assist / OCR / transcribe admin API.
 * Disabled after Supabase migration (was Base44-only).
 */
import {
  converterServerFeaturesEnabled,
  converterServerUnavailableError,
} from '@/lib/tools/converter/converter-feature-flags';

async function invokeAdminConverterAiApi() {
  if (!converterServerFeaturesEnabled()) {
    throw converterServerUnavailableError('Converter AI');
  }
  throw converterServerUnavailableError('Converter AI');
}

export async function converterAiSession() {
  return invokeAdminConverterAiApi();
}

export async function converterAiAssistPlan() {
  return invokeAdminConverterAiApi();
}

export async function converterAiAssistNaming() {
  return invokeAdminConverterAiApi();
}

export async function converterAiAssistSummary() {
  return invokeAdminConverterAiApi();
}

export async function converterAiAssistCompress() {
  return invokeAdminConverterAiApi();
}

export async function converterAiOcrRun() {
  return invokeAdminConverterAiApi();
}

export async function converterAiOcrGet() {
  return invokeAdminConverterAiApi();
}

export async function converterAiOcrAltText() {
  return invokeAdminConverterAiApi();
}

export async function converterAiTranscribeRun() {
  return invokeAdminConverterAiApi();
}

export async function converterAiTranscribeGet() {
  return invokeAdminConverterAiApi();
}

export async function converterAiTranscribeTranslate() {
  return invokeAdminConverterAiApi();
}

export async function converterAiSubtitleGenerate() {
  return invokeAdminConverterAiApi();
}

export async function converterAiJobCancel() {
  return invokeAdminConverterAiApi();
}

export async function converterAiUsageSummary() {
  return invokeAdminConverterAiApi();
}
