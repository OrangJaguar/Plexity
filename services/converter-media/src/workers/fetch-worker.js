import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProxyAgent } from 'undici';
import { config } from '../config.js';
import { withTransaction } from '../db.js';
import { resolveSource } from '../connectors/index.js';
import { QUOTAS, adjustConcurrency, checkConcurrency, ensureQuotaRow } from '../quotas.js';
import {
  acquireLease,
  releaseLease,
  heartbeatLease,
} from '../queue.js';
import { JobStatus, transitionJob } from '../state-machine.js';
import { safeFetchStream, SsrfError } from '../ssrf.js';
import { randomStorageKey, putObject } from '../storage.js';
import { sha256Hex } from '../hmac.js';

function makeArtifactId() {
  return `art-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function getDispatcher() {
  if (!config.egressProxyUrl) return undefined;
  return new ProxyAgent(config.egressProxyUrl);
}

async function downloadViaYtdlp(url, ytdlpArgs) {
  const args = [...(ytdlpArgs || ['--no-playlist', '-o', '-']), url];
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', (buf) => {
      received += buf.length;
      if (received > QUOTAS.maxInputBytes) {
        proc.kill('SIGKILL');
        reject(new SsrfError('QUOTA_EXCEEDED', 'yt-dlp stream exceeded input cap'));
        return;
      }
      chunks.push(buf);
    });
    proc.stderr.on('data', () => {});
    proc.on('error', (err) => reject(new SsrfError('FETCH_NETWORK', err.message)));
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new SsrfError('FETCH_UPSTREAM_4XX', `yt-dlp exited ${code}`));
        return;
      }
      resolve({
        buffer: Buffer.concat(chunks),
        contentType: 'application/octet-stream',
        byteSize: received,
      });
    });
  });
}

async function failJob(client, job, errorCode) {
  await transitionJob(client, job.job_id, job.state_version, job.status, JobStatus.FAILED, {
    errorCode,
    progressPhase: 'failed',
  });
  await adjustConcurrency(client, job.actor_id, 'fetch', -1);
}

async function processJob(job) {
  const leaseKey = `fetch:${job.job_id}`;
  let heartbeatTimer;

  try {
    heartbeatTimer = setInterval(() => {
      heartbeatLease(undefined, leaseKey, config.workerId).catch(() => {});
    }, config.leaseHeartbeatMs);

    const connector = await resolveSource(job.source_url);
    let payload;

    if (connector.provider === 'youtube-single') {
      payload = await downloadViaYtdlp(connector.resolvedUrl, connector.metadata.ytdlpArgs);
    } else {
      payload = await safeFetchStream(connector.resolvedUrl, {
        dispatcher: getDispatcher(),
        maxBytes: QUOTAS.maxInputBytes,
        deadlineMs: 120_000,
      });
    }

    const hash = sha256Hex(payload.buffer);
    const storageKey = randomStorageKey('inputs');
    await putObject(storageKey, payload.buffer, payload.contentType);

    await withTransaction(async (client) => {
      const { rows } = await client.query(`SELECT * FROM jobs WHERE job_id = $1 FOR UPDATE`, [job.job_id]);
      const current = rows[0];
      if (!current || current.status !== JobStatus.FETCHING) return;

      const artifactId = makeArtifactId();
      await client.query(
        `INSERT INTO artifacts (artifact_id, job_id, kind, storage_key, content_type, byte_size, sha256)
         VALUES ($1, $2, 'input', $3, $4, $5, $6)`,
        [artifactId, job.job_id, storageKey, payload.contentType, payload.byteSize, hash],
      );

      await transitionJob(client, job.job_id, current.state_version, JobStatus.FETCHING, JobStatus.FETCHED, {
        progressPhase: 'fetched',
        progressFraction: 0.4,
        inputBytes: payload.byteSize,
        inputArtifactKey: storageKey,
      });
      await adjustConcurrency(client, job.actor_id, 'fetch', -1);
    });
  } catch (err) {
    const code = err instanceof SsrfError ? err.code : (err.code || 'FETCH_NETWORK');
    await withTransaction(async (client) => {
      const { rows } = await client.query(`SELECT * FROM jobs WHERE job_id = $1 FOR UPDATE`, [job.job_id]);
      if (rows[0]) await failJob(client, rows[0], code);
    });
  } finally {
    clearInterval(heartbeatTimer);
    await withTransaction(async (client) => {
      await releaseLease(client, leaseKey, config.workerId);
    });
  }
}

async function claimOneJob() {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT j.* FROM jobs j
       JOIN batches b ON b.batch_id = j.batch_id
       WHERE j.status = $1 AND b.paused = FALSE
       ORDER BY j.created_at ASC LIMIT 1 FOR UPDATE OF j SKIP LOCKED`,
      [JobStatus.QUEUED],
    );
    const job = rows[0];
    if (!job) return null;

    const q = await ensureQuotaRow(client, job.actor_id);
    const conc = checkConcurrency(q, 'fetch');
    if (!conc.ok) return null;

    const leaseKey = `fetch:${job.job_id}`;
    const lease = await acquireLease(client, {
      leaseKey,
      ownerId: config.workerId,
      jobId: job.job_id,
      leaseType: 'fetch',
    });
    if (!lease || lease.owner_id !== config.workerId) return null;

    const tr = await transitionJob(client, job.job_id, job.state_version, JobStatus.QUEUED, JobStatus.FETCHING, {
      progressPhase: 'fetching',
      progressFraction: 0.1,
    });
    if (!tr.ok) {
      await releaseLease(client, leaseKey, config.workerId);
      return null;
    }

    await adjustConcurrency(client, job.actor_id, 'fetch', 1);
    return tr.job;
  });
}

export async function runFetchWorker(signal) {
  console.log(`[fetch-worker] starting as ${config.workerId}`);
  while (!signal?.aborted) {
    try {
      const job = await claimOneJob();
      if (job) {
        await processJob(job);
      } else {
        await new Promise((r) => setTimeout(r, config.workerPollMs));
      }
    } catch (err) {
      console.error('[fetch-worker] loop error', err);
      await new Promise((r) => setTimeout(r, config.workerPollMs));
    }
  }
}

// Export for testing
export { processJob, downloadViaYtdlp };
