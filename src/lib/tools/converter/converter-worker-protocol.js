import { z } from 'zod';

export const LEGACY_PROTOCOL_VERSION = 1;
export const PROTOCOL_VERSION = 2;
export const SUPPORTED_PROTOCOL_VERSIONS = Object.freeze([LEGACY_PROTOCOL_VERSION, PROTOCOL_VERSION]);

export const REQUEST_TYPES = Object.freeze({
  ANALYZE: 'analyze',
  PROCESS: 'process',
  CANCEL: 'cancel',
  DISPOSE: 'dispose',
});

export const EVENT_TYPES = Object.freeze({
  READY: 'ready',
  PROGRESS: 'progress',
  RESULT: 'result',
  CANCELLED: 'cancelled',
  ERROR: 'error',
});

export const PROGRESS_PHASES = Object.freeze([
  'analyzing',
  'processing',
  'loading-engine',
  'packaging',
  'pass-1',
  'pass-2',
  'merging',
  'splitting',
]);

const protocolVersionSchema = z.union([
  z.literal(LEGACY_PROTOCOL_VERSION),
  z.literal(PROTOCOL_VERSION),
]);

const sourceDescriptorSchema = z.object({
  name: z.string().optional(),
  bytes: z.any().optional(),
  index: z.number().int().min(0).optional(),
});

const outputDescriptorSchema = z.object({
  name: z.string().optional(),
  index: z.number().int().min(0).optional(),
});

const analyzeRequestSchema = z.object({
  type: z.literal(REQUEST_TYPES.ANALYZE),
  protocolVersion: protocolVersionSchema,
  jobId: z.string().min(1),
  attemptId: z.string().min(1),
  operationId: z.string().min(1),
  options: z.record(z.unknown()).optional(),
  sourceBytes: z.any().optional(),
  sourceName: z.string().optional(),
  sources: z.array(sourceDescriptorSchema).optional(),
  outputs: z.array(outputDescriptorSchema).optional(),
});

const processRequestSchema = z.object({
  type: z.literal(REQUEST_TYPES.PROCESS),
  protocolVersion: protocolVersionSchema,
  jobId: z.string().min(1),
  attemptId: z.string().min(1),
  operationId: z.string().min(1),
  options: z.record(z.unknown()).optional(),
  sourceBytes: z.any().optional(),
  sourceName: z.string().optional(),
  sources: z.array(sourceDescriptorSchema).optional(),
  outputs: z.array(outputDescriptorSchema).optional(),
  engine: z.enum(['native', 'mediabunny', 'ffmpeg']).optional(),
});

const requestSchema = z.discriminatedUnion('type', [
  analyzeRequestSchema,
  processRequestSchema,
  z.object({
    type: z.literal(REQUEST_TYPES.CANCEL),
    protocolVersion: protocolVersionSchema,
    jobId: z.string().min(1),
    attemptId: z.string().min(1),
  }),
  z.object({
    type: z.literal(REQUEST_TYPES.DISPOSE),
    protocolVersion: protocolVersionSchema,
  }),
]);

const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(EVENT_TYPES.READY),
    protocolVersion: protocolVersionSchema,
  }),
  z.object({
    type: z.literal(EVENT_TYPES.PROGRESS),
    jobId: z.string().min(1),
    attemptId: z.string().min(1),
    phase: z.enum(PROGRESS_PHASES),
    fraction: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal(EVENT_TYPES.RESULT),
    jobId: z.string().min(1),
    attemptId: z.string().min(1),
    kind: z.enum(['analysis', 'output']),
    payload: z.record(z.unknown()),
  }),
  z.object({
    type: z.literal(EVENT_TYPES.CANCELLED),
    jobId: z.string().min(1),
    attemptId: z.string().min(1),
  }),
  z.object({
    type: z.literal(EVENT_TYPES.ERROR),
    jobId: z.string().optional(),
    attemptId: z.string().optional(),
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.record(z.unknown()).optional(),
  }),
]);

/**
 * @param {unknown} message
 * @returns {{ ok: true, value: z.infer<typeof requestSchema> } | { ok: false, error: string }}
 */
export function validateWorkerRequest(message) {
  const result = requestSchema.safeParse(message);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, value: result.data };
}

/**
 * @param {unknown} message
 * @returns {{ ok: true, value: z.infer<typeof eventSchema> } | { ok: false, error: string }}
 */
export function validateWorkerEvent(message) {
  const result = eventSchema.safeParse(message);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, value: result.data };
}

/**
 * Strip stack traces and non-serializable fields from errors.
 * @param {unknown} error
 * @returns {{ code: string, message: string, details?: Record<string, unknown> }}
 */
export function normalizeWorkerError(error) {
  if (error && typeof error === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (error);
    return {
      code: String(obj.code ?? 'UNKNOWN'),
      message: String(obj.message ?? 'Worker error'),
      details: obj.details && typeof obj.details === 'object'
        ? /** @type {Record<string, unknown>} */ (obj.details)
        : undefined,
    };
  }
  return { code: 'UNKNOWN', message: String(error ?? 'Worker error') };
}

/**
 * @param {z.infer<typeof eventSchema>} event
 * @returns {object}
 */
export function serializeWorkerEvent(event) {
  const validated = eventSchema.parse(event);
  if (validated.type === EVENT_TYPES.RESULT && event?.payload && typeof event.payload === 'object') {
    const raw = /** @type {Record<string, unknown>} */ (event.payload);
    return {
      ...validated,
      payload: {
        ...validated.payload,
        ...(raw.buffer != null ? { buffer: raw.buffer } : {}),
        ...(raw.bytes != null ? { bytes: raw.bytes } : {}),
      },
    };
  }
  return validated;
}

/**
 * @param {object} event
 * @returns {Transferable[]}
 */
export function collectEventTransferables(event) {
  /** @type {Transferable[]} */
  const list = [];
  const buffer = event?.payload?.buffer;
  if (buffer instanceof ArrayBuffer) {
    list.push(buffer);
  } else if (buffer && typeof buffer === 'object' && buffer.buffer instanceof ArrayBuffer) {
    list.push(buffer.buffer);
  }
  return list;
}

/**
 * @param {number} version
 * @returns {boolean}
 */
export function isSupportedProtocolVersion(version) {
  return SUPPORTED_PROTOCOL_VERSIONS.includes(Number(version));
}
