/**
 * OpenAI-compatible provider adapter (server-side only).
 * Browser builds must never hold API keys — this module documents the contract
 * and exposes a factory used by tests/mocks. Production HTTP lives in
 * services/converter-media/src/ai-providers.js and Base44 adminConverterAiApi.
 */

import { AI_ERROR_CODES } from './ai-quotas.js';

/**
 * @param {{
 *   apiKey?: string,
 *   baseUrl?: string,
 *   chatModel?: string,
 *   whisperModel?: string,
 *   visionModel?: string,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
export function createOpenAiCompatibleProvider(opts = {}) {
  const apiKey = opts.apiKey || '';
  const baseUrl = (opts.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const fetchImpl = opts.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);

  if (!apiKey) {
    return {
      id: 'openai-compatible',
      async health() {
        return { ok: false, code: AI_ERROR_CODES.SERVICE_UNAVAILABLE };
      },
      async completeJson() {
        const err = new Error('OpenAI key not configured');
        err.code = AI_ERROR_CODES.SERVICE_UNAVAILABLE;
        throw err;
      },
    };
  }

  return {
    id: 'openai-compatible',
    async health() {
      return { ok: Boolean(apiKey && fetchImpl) };
    },
    async completeJson({ system, user }) {
      if (!fetchImpl) {
        const err = new Error('fetch unavailable');
        err.code = AI_ERROR_CODES.SERVICE_UNAVAILABLE;
        throw err;
      }
      const res = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: opts.chatModel || 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) {
        const err = new Error('OpenAI provider error');
        err.code = AI_ERROR_CODES.AI_PROVIDER_ERROR;
        throw err;
      }
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '{}';
      return {
        json: JSON.parse(raw),
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        model: opts.chatModel || 'gpt-4o-mini',
      };
    },
    async transcribe({ bytes, mimeType }) {
      if (!fetchImpl) {
        const err = new Error('fetch unavailable');
        err.code = AI_ERROR_CODES.SERVICE_UNAVAILABLE;
        throw err;
      }
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: mimeType || 'audio/wav' }), 'audio.wav');
      form.append('model', opts.whisperModel || 'whisper-1');
      const res = await fetchImpl(`${baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!res.ok) {
        const err = new Error('Whisper provider error');
        err.code = AI_ERROR_CODES.AI_PROVIDER_ERROR;
        throw err;
      }
      const data = await res.json();
      return { text: String(data.text || ''), cues: [] };
    },
    async visionOcr({ bytes, mimeType, prompt }) {
      if (!fetchImpl) {
        const err = new Error('fetch unavailable');
        err.code = AI_ERROR_CODES.SERVICE_UNAVAILABLE;
        throw err;
      }
      const b64 = btoa(String.fromCharCode(...new Uint8Array(bytes).slice(0, 4_000_000)));
      const res = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: opts.visionModel || opts.chatModel || 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt || 'Extract all visible text as JSON {"text":"..."}' },
              { type: 'image_url', image_url: { url: `data:${mimeType || 'image/png'};base64,${b64}` } },
            ],
          }],
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) {
        const err = new Error('Vision provider error');
        err.code = AI_ERROR_CODES.AI_PROVIDER_ERROR;
        throw err;
      }
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '{}';
      const json = JSON.parse(raw);
      return { text: String(json.text || ''), tables: Array.isArray(json.tables) ? json.tables : [] };
    },
  };
}
