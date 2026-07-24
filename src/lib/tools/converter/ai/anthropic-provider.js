/**
 * Anthropic chat/vision adapter (server-side secrets only).
 * Fallback for JSON completions — no Whisper STT on this provider.
 */

import { AI_ERROR_CODES } from './ai-quotas.js';

/**
 * @param {{
 *   apiKey?: string,
 *   model?: string,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
export function createAnthropicProvider(opts = {}) {
  const apiKey = opts.apiKey || '';
  const model = opts.model || 'claude-3-5-haiku-latest';
  const fetchImpl = opts.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);

  return {
    id: 'anthropic',
    async health() {
      return { ok: Boolean(apiKey && fetchImpl) };
    },
    async completeJson({ system, user }) {
      if (!apiKey || !fetchImpl) {
        const err = new Error('Anthropic key not configured');
        err.code = AI_ERROR_CODES.SERVICE_UNAVAILABLE;
        throw err;
      }
      const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: system || undefined,
          messages: [{ role: 'user', content: user }],
        }),
      });
      if (!res.ok) {
        const err = new Error('Anthropic provider error');
        err.code = AI_ERROR_CODES.AI_PROVIDER_ERROR;
        throw err;
      }
      const data = await res.json();
      const raw = data.content?.find((c) => c.type === 'text')?.text || '{}';
      let json;
      try {
        json = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        json = match ? JSON.parse(match[0]) : {};
      }
      return {
        json,
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
        model,
      };
    },
    async visionOcr({ bytes, mimeType, prompt }) {
      if (!apiKey || !fetchImpl) {
        const err = new Error('Anthropic key not configured');
        err.code = AI_ERROR_CODES.SERVICE_UNAVAILABLE;
        throw err;
      }
      const b64 = btoa(String.fromCharCode(...new Uint8Array(bytes).slice(0, 4_000_000)));
      const mediaType = mimeType || 'image/png';
      const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: b64 },
              },
              {
                type: 'text',
                text: `${prompt || 'Extract text'} Return JSON {"text":"..."}`,
              },
            ],
          }],
        }),
      });
      if (!res.ok) {
        const err = new Error('Anthropic vision error');
        err.code = AI_ERROR_CODES.AI_PROVIDER_ERROR;
        throw err;
      }
      const data = await res.json();
      const raw = data.content?.find((c) => c.type === 'text')?.text || '{}';
      let json;
      try {
        json = JSON.parse(raw);
      } catch {
        json = { text: raw };
      }
      return { text: String(json.text || raw || ''), tables: [] };
    },
  };
}
