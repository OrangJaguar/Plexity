/**
 * Coarse, privacy-safe telemetry for the converter tool.
 * Props are always run through sanitizeTelemetryProps before reaching the
 * sink — see converter-privacy.js for the exact allowlist.
 */

import { sanitizeTelemetryProps } from './converter-privacy.js';

export const TELEMETRY_EVENTS = Object.freeze({
  IMPORT: 'import',
  CONVERT_START: 'convert_start',
  CONVERT_COMPLETE: 'convert_complete',
  CONVERT_FAIL: 'convert_fail',
  PACKAGE_START: 'package_start',
  PACKAGE_COMPLETE: 'package_complete',
  PACKAGE_FAIL: 'package_fail',
  RUNTIME_LOAD: 'runtime_load',
  PRESET_APPLY: 'preset_apply',
  REMOTE_IMPORT_VALIDATE: 'remote_import_validate',
  REMOTE_IMPORT_CREATE: 'remote_import_create',
  REMOTE_IMPORT_COMPLETE: 'remote_import_complete',
  REMOTE_IMPORT_FAIL: 'remote_import_fail',
  REMOTE_DISCOVERY_START: 'remote_discovery_start',
  REMOTE_BATCH_CONFIRM: 'remote_batch_confirm',
  REMOTE_PACKAGE_CREATE: 'remote_package_create',
  AI_ASSIST_PLAN: 'ai_assist_plan',
  AI_OCR_RUN: 'ai_ocr_run',
  AI_TRANSCRIBE_RUN: 'ai_transcribe_run',
  AI_FAIL: 'ai_fail',
});

const ALLOWED_EVENT_NAMES = Object.freeze(new Set(Object.values(TELEMETRY_EVENTS)));

/** @param {string} _name @param {Readonly<Record<string, unknown>>} _props */
function noopSink(_name, _props) {
  // No default sink — telemetry is opt-in via setTelemetrySink.
}

/** @type {(name: string, props: Readonly<Record<string, unknown>>) => void} */
let sink = noopSink;

/**
 * Install a telemetry sink (e.g. for tests or an app-level analytics bridge).
 * @param {((name: string, props: Readonly<Record<string, unknown>>) => void) | null | undefined} fn
 */
export function setTelemetrySink(fn) {
  sink = typeof fn === 'function' ? fn : noopSink;
}

/**
 * Restore the default no-op sink.
 */
export function resetTelemetrySink() {
  sink = noopSink;
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} [props]
 */
export function trackConverterEvent(name, props = {}) {
  if (!ALLOWED_EVENT_NAMES.has(name)) return;
  const safeProps = sanitizeTelemetryProps(props);
  try {
    sink(name, safeProps);
  } catch {
    // Telemetry must never throw into a conversion/UI code path.
  }
}
