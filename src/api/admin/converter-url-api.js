/**
 * Converter URL / job / discovery admin API.
 * Server backends were Base44-only and are disabled after the Supabase migration
 * unless VITE_CONVERTER_SERVER_FEATURES=true (not supported yet).
 */
import {
  converterServerFeaturesEnabled,
  converterServerUnavailableError,
} from '@/lib/tools/converter/converter-feature-flags';

async function invokeAdminConverterApi() {
  if (!converterServerFeaturesEnabled()) {
    throw converterServerUnavailableError('Authorized URL import');
  }
  throw converterServerUnavailableError('Authorized URL import');
}

export async function converterUrlSession() {
  return invokeAdminConverterApi();
}

export async function converterUrlValidate() {
  return invokeAdminConverterApi();
}

export async function converterJobCreate() {
  return invokeAdminConverterApi();
}

export async function converterJobList() {
  return invokeAdminConverterApi();
}

export async function converterJobGet() {
  return invokeAdminConverterApi();
}

export async function converterJobCancel() {
  return invokeAdminConverterApi();
}

export async function converterJobRetry() {
  return invokeAdminConverterApi();
}

export async function converterJobDownload() {
  return invokeAdminConverterApi();
}

export async function converterDiscoveryCreate() {
  return invokeAdminConverterApi();
}

export async function converterDiscoveryGet() {
  return invokeAdminConverterApi();
}

export async function converterDiscoveryCancel() {
  return invokeAdminConverterApi();
}

export async function converterDiscoveryItems() {
  return invokeAdminConverterApi();
}

export async function converterBatchConfirm() {
  return invokeAdminConverterApi();
}

export async function converterBatchPause() {
  return invokeAdminConverterApi();
}

export async function converterBatchResume() {
  return invokeAdminConverterApi();
}

export async function converterBatchRetryFailed() {
  return invokeAdminConverterApi();
}

export async function converterPackageCreate() {
  return invokeAdminConverterApi();
}

export async function converterPackageGet() {
  return invokeAdminConverterApi();
}

export async function converterPackageDownload() {
  return invokeAdminConverterApi();
}
