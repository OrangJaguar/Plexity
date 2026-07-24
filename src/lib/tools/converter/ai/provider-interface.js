/**
 * Provider interface + selection/fallback for Plan 7 (browser-safe types;
 * real HTTP runs in Base44/Docker only).
 */

import { AI_ERROR_CODES, AI_PROVIDERS } from './ai-quotas.js';

/**
 * @typedef {{
 *   id: string,
 *   completeJson: (args: { system: string, user: string, schemaHint?: string }) => Promise<{ json: unknown, inputTokens?: number, outputTokens?: number, model: string }>,
 *   transcribe?: (args: { bytes: Uint8Array, mimeType?: string }) => Promise<{ text: string, cues?: Array<{ start: number, end: number, text: string }> }>,
 *   visionOcr?: (args: { bytes: Uint8Array, mimeType?: string, prompt?: string }) => Promise<{ text: string, tables?: unknown[] }>,
 * }} AiProvider
 */

/**
 * Deterministic mock provider for unit tests and offline admin smoke.
 * @returns {AiProvider}
 */
export function createMockAiProvider() {
  return {
    id: 'openai-compatible',
    async health() {
      return { ok: true };
    },
    async completeJson({ user }) {
      const wantsCompress = /compress|smaller|size/i.test(user);
      const json = wantsCompress
        ? {
          plan: { operationId: 'video-to-mp4', options: { targetBytes: 5_000_000 }, goalId: 'under-size' },
          explanation: 'Prefer a smaller MP4 for sharing.',
          warnings: ['Approximate size only'],
        }
        : {
          plan: { operationId: 'audio-to-mp3', options: {}, goalId: 'podcast' },
          explanation: 'Convert audio to MP3 for broad compatibility.',
          warnings: [],
        };
      return { json, inputTokens: 120, outputTokens: 80, model: 'mock-chat' };
    },
    async transcribe() {
      return {
        text: 'Hello world.',
        cues: [{ start: 0, end: 1.2, text: 'Hello world.' }],
      };
    },
    async visionOcr() {
      return { text: 'Sample OCR text', tables: [] };
    },
  };
}

/**
 * @param {{
 *   primary?: AiProvider | null,
 *   fallback?: AiProvider | null,
 *   enabled?: boolean,
 * }} opts
 */
export function createProviderRouter(opts = {}) {
  const enabled = opts.enabled !== false;
  const primary = opts.primary || null;
  const fallback = opts.fallback || null;

  return {
    enabled,
    list() {
      return AI_PROVIDERS.filter((id) => (primary && primary.id === id) || (fallback && fallback.id === id));
    },
    /**
     * @param {'completeJson' | 'transcribe' | 'visionOcr'} method
     * @param {Record<string, unknown>} args
     */
    async call(method, args) {
      if (!enabled) {
        const err = new Error('AI provider disabled');
        err.code = AI_ERROR_CODES.AI_DISABLED;
        throw err;
      }
      const chain = [primary, fallback].filter(Boolean);
      if (!chain.length) {
        const err = new Error('No AI provider configured');
        err.code = AI_ERROR_CODES.SERVICE_UNAVAILABLE;
        throw err;
      }
      let lastErr = null;
      for (const provider of chain) {
        const fn = provider[method];
        if (typeof fn !== 'function') continue;
        try {
          return await fn.call(provider, args);
        } catch (err) {
          lastErr = err;
        }
      }
      const err = lastErr || new Error('AI provider error');
      err.code = err.code || AI_ERROR_CODES.AI_PROVIDER_ERROR;
      throw err;
    },
  };
}
