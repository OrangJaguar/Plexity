/**
 * Plan 7 AI provider interface — deterministic mocks without keys; real APIs when configured.
 */

import crypto from 'node:crypto';
import { fetch } from 'undici';
import { config } from './config.js';

const OPENAI_BASE = 'https://api.openai.com/v1';
const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';

function hashSeed(input) {
  return crypto.createHash('sha256').update(String(input || '')).digest('hex').slice(0, 12);
}

function pickProvider(preferred) {
  if (preferred === 'anthropic' && config.plan7.anthropicApiKey) return 'anthropic';
  if (preferred === 'openai-compatible' && config.plan7.openaiApiKey) return 'openai-compatible';
  if (config.plan7.openaiApiKey) return 'openai-compatible';
  if (config.plan7.anthropicApiKey) return 'anthropic';
  return null;
}

export function hasRealProvider() {
  return Boolean(config.plan7.openaiApiKey || config.plan7.anthropicApiKey);
}

export function resolveModel({ provider, model }) {
  const resolvedProvider = pickProvider(provider) || 'mock';
  const resolvedModel = model || config.plan7.primaryModel || config.plan7.fallbackModel;
  return { provider: resolvedProvider, model: resolvedModel };
}

function mockCompleteJson({ prompt, schemaHint }) {
  const seed = hashSeed(prompt);
  const payload = {
    mock: true,
    seed,
    summary: `Mock assist output (${seed})`,
    schemaHint: schemaHint || null,
    text: `Deterministic completion for prompt hash ${seed}.`,
  };
  return {
    provider: 'mock',
    model: 'mock-json',
    json: payload,
    rawText: JSON.stringify(payload, null, 2),
  };
}

function mockTranscribe({ inputLabel }) {
  const seed = hashSeed(inputLabel);
  const text = `Mock transcript segment one (${seed}).\nMock transcript segment two.`;
  return {
    provider: 'mock',
    model: 'mock-whisper',
    text,
    vtt: `WEBVTT\n\n00:00:00.000 --> 00:00:03.000\n${text.split('\n')[0]}\n`,
  };
}

function mockVisionOcr({ inputLabel }) {
  const seed = hashSeed(inputLabel);
  const text = `Mock OCR text block A (${seed})\nMock OCR text block B`;
  return {
    provider: 'mock',
    model: 'mock-vision',
    text,
    blocks: [
      { text: `Mock OCR text block A (${seed})`, confidence: 0.99 },
      { text: 'Mock OCR text block B', confidence: 0.97 },
    ],
  };
}

async function openaiJson({ model, system, prompt }) {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.plan7.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || config.plan7.primaryModel,
      response_format: { type: 'json_object' },
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: Math.min(config.plan7.maxCompletionChars, 4096),
    }),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`OpenAI HTTP ${res.status}`), { code: 'AI_PROVIDER_ERROR' });
  }
  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content || '{}';
  let json;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = { text: rawText };
  }
  return {
    provider: 'openai-compatible',
    model: data.model || model,
    json,
    rawText,
  };
}

async function anthropicJson({ model, system, prompt }) {
  const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': config.plan7.anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || config.plan7.fallbackModel,
      max_tokens: Math.min(config.plan7.maxCompletionChars, 4096),
      system: system || 'Respond with valid JSON only.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`Anthropic HTTP ${res.status}`), { code: 'AI_PROVIDER_ERROR' });
  }
  const data = await res.json();
  const rawText = data.content?.find((c) => c.type === 'text')?.text || '{}';
  let json;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = { text: rawText };
  }
  return {
    provider: 'anthropic',
    model: data.model || model,
    json,
    rawText,
  };
}

async function openaiTranscribe({ buffer, contentType, model }) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: contentType || 'audio/wav' }), 'input.wav');
  form.append('model', model || 'whisper-1');
  form.append('response_format', 'verbose_json');

  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.plan7.openaiApiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw Object.assign(new Error(`OpenAI transcribe HTTP ${res.status}`), { code: 'AI_PROVIDER_ERROR' });
  }
  const data = await res.json();
  const text = data.text || '';
  return {
    provider: 'openai-compatible',
    model: data.model || model || 'whisper-1',
    text,
    vtt: `WEBVTT\n\n00:00:00.000 --> 00:00:30.000\n${text}\n`,
  };
}

async function openaiVisionOcr({ buffer, contentType, model, prompt }) {
  const b64 = Buffer.from(buffer).toString('base64');
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.plan7.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || config.plan7.primaryModel,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt || 'Extract all visible text. Return plain text only.' },
          { type: 'image_url', image_url: { url: `data:${contentType || 'image/png'};base64,${b64}` } },
        ],
      }],
      max_tokens: Math.min(config.plan7.maxCompletionChars, 4096),
    }),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`OpenAI vision HTTP ${res.status}`), { code: 'AI_PROVIDER_ERROR' });
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return {
    provider: 'openai-compatible',
    model: data.model || model,
    text,
    blocks: [{ text, confidence: 1 }],
  };
}

/**
 * @param {{ prompt: string, system?: string, provider?: string, model?: string, schemaHint?: string }} opts
 */
export async function completeJson(opts = {}) {
  const prompt = String(opts.prompt || '').slice(0, config.plan7.maxPromptChars);
  if (!prompt) {
    throw Object.assign(new Error('prompt required'), { code: 'AI_VALIDATION_FAILED' });
  }

  const { provider, model } = resolveModel(opts);
  if (provider === 'mock') return mockCompleteJson({ prompt, schemaHint: opts.schemaHint });
  if (provider === 'anthropic') return anthropicJson({ model, system: opts.system, prompt });
  return openaiJson({ model, system: opts.system, prompt });
}

/**
 * @param {{ buffer: Buffer, contentType?: string, provider?: string, model?: string, inputLabel?: string }} opts
 */
export async function transcribe(opts = {}) {
  if (!opts.buffer?.length) {
    throw Object.assign(new Error('input required'), { code: 'AI_VALIDATION_FAILED' });
  }
  if (opts.buffer.length > config.plan7.maxSttAudioBytes) {
    throw Object.assign(new Error('audio too large'), { code: 'AI_UPLOAD_TOO_LARGE' });
  }

  const { provider, model } = resolveModel(opts);
  if (provider === 'mock') {
    return mockTranscribe({ inputLabel: opts.inputLabel || opts.buffer.length });
  }
  if (!config.plan7.openaiApiKey) {
    return mockTranscribe({ inputLabel: opts.inputLabel || opts.buffer.length });
  }
  return openaiTranscribe({ buffer: opts.buffer, contentType: opts.contentType, model });
}

/**
 * @param {{ buffer: Buffer, contentType?: string, provider?: string, model?: string, prompt?: string, inputLabel?: string }} opts
 */
export async function visionOcr(opts = {}) {
  if (!opts.buffer?.length) {
    throw Object.assign(new Error('input required'), { code: 'AI_VALIDATION_FAILED' });
  }
  if (opts.buffer.length > config.plan7.maxOcrImageBytes) {
    throw Object.assign(new Error('image too large'), { code: 'AI_UPLOAD_TOO_LARGE' });
  }

  const { provider, model } = resolveModel(opts);
  if (provider === 'mock') {
    return mockVisionOcr({ inputLabel: opts.inputLabel || opts.buffer.length });
  }
  if (config.plan7.openaiApiKey) {
    return openaiVisionOcr({
      buffer: opts.buffer,
      contentType: opts.contentType,
      model,
      prompt: opts.prompt,
    });
  }
  return mockVisionOcr({ inputLabel: opts.inputLabel || opts.buffer.length });
}
