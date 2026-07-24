import crypto from 'node:crypto';
import { config } from '../config.js';
import { withTransaction } from '../db.js';
import { completeJson, transcribe, visionOcr } from '../ai-providers.js';
import { AiKind, transitionAiJob } from '../ai-state-machine.js';
import {
  adjustConcurrency,
  checkAiDailyLimits,
  checkConcurrency,
  ensureQuotaRow,
} from '../quotas.js';
import { acquireLease, heartbeatLease, releaseLease } from '../queue.js';
import { Status } from '../state-machine.js';
import { deleteObject, getObjectStream, headObject, putObject, randomStorageKey } from '../storage.js';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const VALID_KINDS = new Set(Object.values(AiKind));

/**
 * Extract audio track from video before STT (allowlisted ffmpeg argv only).
 * @param {Buffer} buffer
 * @param {string} [contentType]
 */
async function extractAudioForStt(buffer, contentType = '') {
  if (!String(contentType).startsWith('video/')) return { buffer, contentType: contentType || 'audio/wav' };
  const dir = await mkdtemp(path.join(tmpdir(), 'plexity-ai-stt-'));
  const inPath = path.join(dir, 'in.bin');
  const outPath = path.join(dir, 'out.wav');
  try {
    await writeFile(inPath, buffer);
    await new Promise((resolve, reject) => {
      const child = spawn('ffmpeg', ['-y', '-i', inPath, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', outPath], {
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let err = '';
      child.stderr?.on('data', (chunk) => { err += String(chunk); });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(Object.assign(new Error('ffmpeg extract failed'), { code: 'AI_PROVIDER_ERROR', detail: err.slice(0, 200) }));
      });
    });
    const audio = await readFile(outPath);
    return { buffer: audio, contentType: 'audio/wav' };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function streamToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function wipeInput(job, client) {
  if (job.object_key_in) {
    await deleteObject(job.object_key_in);
    await client.query(
      `UPDATE ai_jobs SET object_key_in = NULL, updated_at = NOW() WHERE id = $1`,
      [job.id],
    );
  }
}

async function failJob(client, job, errorCode) {
  await transitionAiJob(client, job.id, job.status, Status.FAILED, {
    errorCode,
    progressPhase: 'failed',
  });
  await adjustConcurrency(client, job.actor_id, 'ai', -1);
  await wipeInput(job, client);
}

function sidecarContentType(kind) {
  if (kind === AiKind.OCR || kind === AiKind.TRANSCRIBE || kind === AiKind.TRANSLATE) {
    return 'application/json; charset=utf-8';
  }
  return 'application/json; charset=utf-8';
}

function buildSidecarPayload(kind, result, options = {}) {
  if (kind === AiKind.OCR) {
    return JSON.stringify({
      kind,
      text: result.text,
      blocks: result.blocks || [],
      provider: result.provider,
      model: result.model,
    });
  }
  if (kind === AiKind.TRANSCRIBE) {
    return JSON.stringify({
      kind,
      text: result.text,
      vtt: result.vtt,
      provider: result.provider,
      model: result.model,
    });
  }
  if (kind === AiKind.TRANSLATE) {
    return JSON.stringify({
      kind,
      translation: result.json?.translation || result.json?.text || result.rawText,
      provider: result.provider,
      model: result.model,
    });
  }
  return JSON.stringify({
    kind,
    result: result.json || result,
    provider: result.provider,
    model: result.model,
    options,
  });
}

async function runKind(job) {
  const options = job.options_json || {};
  const head = job.object_key_in ? await headObject(job.object_key_in) : null;
  let buffer = null;

  if (job.object_key_in) {
    const body = await getObjectStream(job.object_key_in);
    if (!body) throw Object.assign(new Error('Missing input object'), { code: 'AI_VALIDATION_FAILED' });
    buffer = await streamToBuffer(body);
  }

  if (job.kind === AiKind.OCR) {
    if (!buffer?.length) throw Object.assign(new Error('OCR input required'), { code: 'AI_VALIDATION_FAILED' });
    if (buffer.length > config.plan7.maxOcrImageBytes) {
      throw Object.assign(new Error('Image too large'), { code: 'AI_UPLOAD_TOO_LARGE' });
    }
    return visionOcr({
      buffer,
      contentType: head?.ContentType,
      provider: job.provider,
      model: job.model,
      prompt: options.prompt,
      inputLabel: job.id,
    });
  }

  if (job.kind === AiKind.TRANSCRIBE) {
    if (!buffer?.length) throw Object.assign(new Error('Audio input required'), { code: 'AI_VALIDATION_FAILED' });
    const isVideo = String(head?.ContentType || '').startsWith('video/');
    const maxBytes = isVideo ? config.plan7.maxSttVideoBytes : config.plan7.maxSttAudioBytes;
    if (buffer.length > maxBytes) {
      throw Object.assign(new Error('Media too large'), { code: 'AI_UPLOAD_TOO_LARGE' });
    }
    const durationSeconds = Number(options.durationSeconds);
    const maxSeconds = isVideo
      ? (config.plan7.maxSttVideoSeconds || 2 * 60 * 60)
      : (config.plan7.maxSttAudioSeconds || 30 * 60);
    if (Number.isFinite(durationSeconds) && durationSeconds > maxSeconds) {
      throw Object.assign(new Error('Duration limit'), { code: 'AI_DURATION_LIMIT' });
    }
    const extracted = await extractAudioForStt(buffer, head?.ContentType);
    if (extracted.buffer.length > config.plan7.maxSttAudioBytes) {
      throw Object.assign(new Error('Extracted audio too large'), { code: 'AI_UPLOAD_TOO_LARGE' });
    }
    return transcribe({
      buffer: extracted.buffer,
      contentType: extracted.contentType,
      provider: job.provider,
      model: job.model,
      inputLabel: job.id,
    });
  }

  if (job.kind === AiKind.TRANSLATE) {
    const sourceText = options.text || (buffer ? buffer.toString('utf8') : '');
    if (!sourceText) throw Object.assign(new Error('Translate text required'), { code: 'AI_VALIDATION_FAILED' });
    const prompt = `Translate the following text to ${options.targetLocale || 'en'}. Return JSON {"translation":"..."} only.\n\n${sourceText.slice(0, config.plan7.maxPromptChars)}`;
    return completeJson({
      prompt,
      system: 'You are a translation assistant. Output JSON only.',
      provider: job.provider,
      model: job.model,
    });
  }

  if (job.kind === AiKind.ASSIST) {
    const prompt = options.prompt || (buffer ? buffer.toString('utf8') : '');
    if (!prompt) throw Object.assign(new Error('Assist prompt required'), { code: 'AI_VALIDATION_FAILED' });
    return completeJson({
      prompt: prompt.slice(0, config.plan7.maxPromptChars),
      system: options.system,
      provider: job.provider,
      model: job.model,
      schemaHint: options.schemaHint,
    });
  }

  throw Object.assign(new Error('Unknown kind'), { code: 'AI_VALIDATION_FAILED' });
}

async function processAiJob(job) {
  const leaseKey = `ai:${job.id}`;
  let heartbeatTimer;
  const timeoutMs = config.plan7.aiJobTimeoutMs;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; }, timeoutMs);

  try {
    heartbeatTimer = setInterval(() => {
      heartbeatLease(undefined, leaseKey, config.workerId).catch(() => {});
    }, config.leaseHeartbeatMs);

    const { rows: freshRows } = await withTransaction(async (client) => {
      const { rows } = await client.query(`SELECT * FROM ai_jobs WHERE id = $1 FOR UPDATE`, [job.id]);
      return rows;
    });
    const current = freshRows[0];
    if (!current || current.status !== Status.PROCESSING) return;
    if (current.cancel_requested) {
      await withTransaction(async (client) => {
        const { rows } = await client.query(`SELECT * FROM ai_jobs WHERE id = $1 FOR UPDATE`, [job.id]);
        if (rows[0]?.status !== Status.PROCESSING) return;
        await transitionAiJob(client, job.id, Status.PROCESSING, Status.CANCELLED, {
          errorCode: 'AI_CANCELLED',
          progressPhase: 'cancelled',
        });
        await adjustConcurrency(client, job.actor_id, 'ai', -1);
        await wipeInput(rows[0], client);
      });
      return;
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE ai_jobs SET progress_phase = 'running', progress_fraction = 0.35, updated_at = NOW() WHERE id = $1`,
        [job.id],
      );
    });

    if (timedOut) throw Object.assign(new Error('AI timeout'), { code: 'AI_TIMEOUT' });

    const result = await runKind(current);
    if (timedOut) throw Object.assign(new Error('AI timeout'), { code: 'AI_TIMEOUT' });

    const sidecar = Buffer.from(buildSidecarPayload(current.kind, result, current.options_json || {}), 'utf8');
    const outputKey = randomStorageKey('ai-sidecars');
    await putObject(outputKey, sidecar, sidecarContentType(current.kind));
    const expiresAt = new Date(Date.now() + config.plan7.tempRetentionMs);

    await withTransaction(async (client) => {
      const { rows } = await client.query(`SELECT * FROM ai_jobs WHERE id = $1 FOR UPDATE`, [job.id]);
      const row = rows[0];
      if (!row || row.status !== Status.PROCESSING) return;
      if (row.cancel_requested) {
        await deleteObject(outputKey);
        await transitionAiJob(client, job.id, Status.PROCESSING, Status.CANCELLED, {
          errorCode: 'AI_CANCELLED',
          progressPhase: 'cancelled',
        });
        await adjustConcurrency(client, job.actor_id, 'ai', -1);
        await wipeInput(row, client);
        return;
      }

      await transitionAiJob(client, job.id, Status.PROCESSING, Status.READY, {
        progressPhase: 'ready',
        progressFraction: 1,
        objectKeyOut: outputKey,
        provider: result.provider || row.provider,
        model: result.model || row.model,
        expiresAt,
        errorCode: '',
      });
      await adjustConcurrency(client, job.actor_id, 'ai', -1);
      await wipeInput(row, client);
    });
  } catch (err) {
    const code = err.code || 'AI_PROVIDER_ERROR';
    await withTransaction(async (client) => {
      const { rows } = await client.query(`SELECT * FROM ai_jobs WHERE id = $1 FOR UPDATE`, [job.id]);
      if (rows[0]?.status === Status.PROCESSING) await failJob(client, rows[0], code);
    });
  } finally {
    clearTimeout(timer);
    clearInterval(heartbeatTimer);
    await withTransaction(async (client) => {
      await releaseLease(client, leaseKey, config.workerId);
    });
  }
}

async function claimOneAiJob() {
  if (!config.enableAiProvider) return null;

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM ai_jobs WHERE status = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [Status.QUEUED],
    );
    const job = rows[0];
    if (!job) return null;

    const quota = await ensureQuotaRow(client, job.actor_id);
    const conc = checkConcurrency(quota, 'ai');
    if (!conc.ok) return null;

    const leaseKey = `ai:${job.id}`;
    const lease = await acquireLease(client, {
      leaseKey,
      ownerId: config.workerId,
      jobId: null,
      leaseType: 'ai',
    });
    if (!lease || lease.owner_id !== config.workerId) return null;

    const tr = await transitionAiJob(client, job.id, Status.QUEUED, Status.PROCESSING, {
      progressPhase: 'processing',
      progressFraction: 0.1,
    });
    if (!tr.ok) {
      await releaseLease(client, leaseKey, config.workerId);
      return null;
    }

    await adjustConcurrency(client, job.actor_id, 'ai', 1);
    return tr.job;
  });
}

export async function runAiWorker(signal) {
  console.log(`[ai-worker] starting as ${config.workerId} (egress via proxy when configured)`);
  while (!signal?.aborted) {
    try {
      const job = await claimOneAiJob();
      if (job) {
        await processAiJob(job);
      } else {
        await new Promise((r) => setTimeout(r, config.workerPollMs));
      }
    } catch (err) {
      console.error('[ai-worker] loop error', err);
      await new Promise((r) => setTimeout(r, config.workerPollMs));
    }
  }
}

export { processAiJob, VALID_KINDS };

function makeAiJobId() {
  return `aij-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

export { makeAiJobId };
