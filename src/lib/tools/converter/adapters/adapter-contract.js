/**
 * @typedef {object} AdapterAnalyzeResult
 * @property {Record<string, unknown>} metadata
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [durationSec]
 * @property {number} [rowCount]
 */

/**
 * @typedef {object} AdapterProcessResult
 * @property {Blob} blob
 * @property {string} mimeType
 * @property {string} [fileName]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} AdapterContext
 * @property {string} operationId
 * @property {Record<string, unknown>} options
 * @property {(phase: 'analyzing' | 'processing', fraction: number) => void} [onProgress]
 * @property {AbortSignal} [signal]
 */

/**
 * Converter adapter contract:
 * - analyze(sourceBytes, ctx) -> AdapterAnalyzeResult
 * - process(sourceBytes, ctx) -> AdapterProcessResult
 * - supports(operationId, deviceHints) -> { supported, reason? }
 * - cleanup() -> void (optional)
 *
 * Adapters must fail closed with { code, message } errors.
 */

/**
 * @param {unknown} error
 * @param {string} [fallbackCode]
 * @returns {{ code: string, message: string }}
 */
export function adapterError(error, fallbackCode = 'ADAPTER_ERROR') {
  if (error && typeof error === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (error);
    const err = new Error(String(obj.message ?? 'Adapter error'));
    /** @type {Record<string, unknown>} */ (err).code = String(obj.code ?? fallbackCode);
    return err;
  }
  const err = new Error(String(error ?? 'Adapter error'));
  /** @type {Record<string, unknown>} */ (err).code = fallbackCode;
  return err;
}

/**
 * @param {AbortSignal | undefined} signal
 */
export function throwIfAborted(signal) {
  if (signal?.aborted) {
    const err = new Error('Cancelled');
    /** @type {Record<string, unknown>} */ (err).code = 'CANCELLED';
    throw err;
  }
}

/**
 * @param {string} operationId
 * @param {Record<string, import('../conversion-capabilities.js').ConversionOperation>} registry
 * @returns {import('../conversion-capabilities.js').ConversionOperation}
 */
export function requireOperation(operationId, registry) {
  const op = registry[operationId];
  if (!op) {
    const err = new Error(`Unknown operation: ${operationId}`);
    /** @type {Record<string, unknown>} */ (err).code = 'OPERATION_UNSUPPORTED';
    throw err;
  }
  return op;
}
