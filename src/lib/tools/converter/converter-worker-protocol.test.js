import { describe, expect, it } from 'vitest';
import {
  EVENT_TYPES,
  LEGACY_PROTOCOL_VERSION,
  normalizeWorkerError,
  PROGRESS_PHASES,
  PROTOCOL_VERSION,
  REQUEST_TYPES,
  serializeWorkerEvent,
  SUPPORTED_PROTOCOL_VERSIONS,
  validateWorkerEvent,
  validateWorkerRequest,
} from '@/lib/tools/converter/converter-worker-protocol.js';

describe('converter-worker-protocol', () => {
  it('validates ready event for v1 and v2', () => {
    expect(validateWorkerEvent({ type: EVENT_TYPES.READY, protocolVersion: PROTOCOL_VERSION }).ok).toBe(true);
    expect(validateWorkerEvent({ type: EVENT_TYPES.READY, protocolVersion: LEGACY_PROTOCOL_VERSION }).ok).toBe(true);
    expect(SUPPORTED_PROTOCOL_VERSIONS).toEqual([1, 2]);
  });

  it('validates analyze request with source bytes', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const result = validateWorkerRequest({
      type: REQUEST_TYPES.ANALYZE,
      protocolVersion: LEGACY_PROTOCOL_VERSION,
      jobId: 'j1',
      attemptId: 'a1',
      operationId: 'csv-to-json',
      sourceBytes: bytes,
    });
    expect(result.ok).toBe(true);
  });

  it('validates v2 analyze request with sources and outputs arrays', () => {
    const result = validateWorkerRequest({
      type: REQUEST_TYPES.ANALYZE,
      protocolVersion: PROTOCOL_VERSION,
      jobId: 'j1',
      attemptId: 'a1',
      operationId: 'merge-mp4',
      sources: [{ name: 'a.mp4', index: 0 }, { name: 'b.mp4', index: 1 }],
      outputs: [{ name: 'merged.mp4', index: 0 }],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid protocol version', () => {
    const result = validateWorkerRequest({
      type: REQUEST_TYPES.CANCEL,
      protocolVersion: 99,
      jobId: 'j1',
      attemptId: 'a1',
    });
    expect(result.ok).toBe(false);
  });

  it('normalizeWorkerError strips stacks', () => {
    const err = new Error('boom');
    err.stack = 'secret stack';
    const normalized = normalizeWorkerError(err);
    expect(normalized.message).toBe('boom');
    expect(normalized).not.toHaveProperty('stack');
  });

  it('validates process request with an optional engine field', () => {
    const result = validateWorkerRequest({
      type: REQUEST_TYPES.PROCESS,
      protocolVersion: PROTOCOL_VERSION,
      jobId: 'j1',
      attemptId: 'a1',
      operationId: 'wav-to-mp3',
      sourceBytes: new Uint8Array([1]),
      engine: 'ffmpeg',
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.engine).toBe('ffmpeg');
  });

  it('rejects an unknown engine value on process requests', () => {
    const result = validateWorkerRequest({
      type: REQUEST_TYPES.PROCESS,
      protocolVersion: PROTOCOL_VERSION,
      jobId: 'j1',
      attemptId: 'a1',
      operationId: 'wav-to-mp3',
      engine: 'gpu',
    });
    expect(result.ok).toBe(false);
  });

  it('validates all supported progress phases', () => {
    for (const phase of PROGRESS_PHASES) {
      const result = validateWorkerEvent({
        type: EVENT_TYPES.PROGRESS,
        jobId: 'j1',
        attemptId: 'a1',
        phase,
        fraction: 0.5,
      });
      expect(result.ok).toBe(true);
    }
  });

  it('rejects unknown progress phases', () => {
    const result = validateWorkerEvent({
      type: EVENT_TYPES.PROGRESS,
      jobId: 'j1',
      attemptId: 'a1',
      phase: 'unknown-phase',
      fraction: 0.5,
    });
    expect(result.ok).toBe(false);
  });

  it('serializeWorkerEvent preserves ArrayBuffer payload fields', () => {
    const buffer = new ArrayBuffer(4);
    const payload = serializeWorkerEvent({
      type: EVENT_TYPES.RESULT,
      jobId: 'j1',
      attemptId: 'a1',
      kind: 'output',
      payload: { buffer, mimeType: 'image/png' },
    });
    expect(payload.payload.buffer).toBe(buffer);
    expect(payload.payload.mimeType).toBe('image/png');
  });
});
