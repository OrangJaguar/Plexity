import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { config } from '../config.js';
import { withTransaction } from '../db.js';
import { buildFfmpegInvocation, validatePlan } from '../ffmpeg-builders.js';
import { QUOTAS, adjustConcurrency, checkConcurrency, ensureQuotaRow } from '../quotas.js';
import { acquireLease, releaseLease, heartbeatLease } from '../queue.js';
import { JobStatus, transitionJob } from '../state-machine.js';
import { getObjectStream, putObject, randomStorageKey } from '../storage.js';
import { sha256Hex } from '../hmac.js';

function makeArtifactId() {
  return `art-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function which(bin) {
  return new Promise((resolve) => {
    const proc = spawn('sh', ['-lc', `command -v ${bin}`]);
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

async function runCommand(bin, args, { timeoutMs = QUOTAS.maxDurationMs } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(Object.assign(new Error('PROCESS_TIMEOUT'), { code: 'PROCESS_TIMEOUT' }));
    }, timeoutMs);

    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stderr });
      else reject(Object.assign(new Error(stderr || `${bin} failed`), { code: 'PROCESS_FAILED' }));
    });
  });
}

async function streamToFile(body, dest) {
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }
  await fs.writeFile(dest, Buffer.concat(chunks));
}

async function failJob(client, job, errorCode) {
  await transitionJob(client, job.job_id, job.state_version, job.status, JobStatus.FAILED, {
    errorCode,
    progressPhase: 'failed',
  });
  await adjustConcurrency(client, job.actor_id, 'transcode', -1);
}

async function processJob(job) {
  const leaseKey = `media:${job.job_id}`;
  let heartbeatTimer;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cm-media-'));

  try {
    heartbeatTimer = setInterval(() => {
      heartbeatLease(undefined, leaseKey, config.workerId).catch(() => {});
    }, config.leaseHeartbeatMs);

    const hasFfmpeg = await which('ffmpeg');
    const hasFfprobe = await which('ffprobe');
    if (!hasFfmpeg || !hasFfprobe) {
      throw Object.assign(new Error('ffmpeg/ffprobe not installed'), { code: 'PROCESS_BIN_MISSING' });
    }

    const planCheck = validatePlan(job.plan_json);
    if (!planCheck.ok) {
      throw Object.assign(new Error('Invalid plan'), { code: planCheck.code });
    }

    const inputPath = path.join(tmpDir, 'input.bin');
    const body = await getObjectStream(job.input_artifact_key);
    if (!body) throw Object.assign(new Error('Missing input artifact'), { code: 'PROCESS_INPUT_MISSING' });
    await streamToFile(body, inputPath);

    const probe = buildFfmpegInvocation(planCheck.operationId, planCheck.plan, inputPath, path.join(tmpDir, 'out.tmp'));
    if (!probe) throw Object.assign(new Error('Unsupported operation'), { code: 'PLAN_INVALID' });

    const outputPath = path.join(tmpDir, `out${probe.outputExt}`);
    const invocation = buildFfmpegInvocation(planCheck.operationId, planCheck.plan, inputPath, outputPath);

    await runCommand('ffprobe', invocation.ffprobeArgs, { timeoutMs: 60_000 });
    await runCommand('ffmpeg', invocation.ffmpegArgs, { timeoutMs: QUOTAS.maxDurationMs });

    const outStat = await fs.stat(outputPath);
    if (outStat.size > QUOTAS.maxOutputBytes) {
      throw Object.assign(new Error('Output too large'), { code: 'QUOTA_EXCEEDED' });
    }

    const outBuf = await fs.readFile(outputPath);
    const hash = sha256Hex(outBuf);
    const storageKey = randomStorageKey('outputs');
    await putObject(storageKey, outBuf, invocation.mimeType);

    const expiresAt = new Date(Date.now() + config.readyJobTtlMs);

    await withTransaction(async (client) => {
      const { rows } = await client.query(`SELECT * FROM jobs WHERE job_id = $1 FOR UPDATE`, [job.job_id]);
      const current = rows[0];
      if (!current || current.status !== JobStatus.PROCESSING) return;

      const artifactId = makeArtifactId();
      await client.query(
        `INSERT INTO artifacts (artifact_id, job_id, kind, storage_key, content_type, byte_size, sha256, expires_at)
         VALUES ($1, $2, 'primary', $3, $4, $5, $6, $7)`,
        [artifactId, job.job_id, storageKey, invocation.mimeType, outStat.size, hash, expiresAt],
      );

      await transitionJob(client, job.job_id, current.state_version, JobStatus.PROCESSING, JobStatus.READY, {
        progressPhase: 'ready',
        progressFraction: 1,
        outputBytes: outStat.size,
        outputArtifactKey: storageKey,
        completedAt: new Date(),
        expiresAt,
      });
      await adjustConcurrency(client, job.actor_id, 'transcode', -1);
    });
  } catch (err) {
    const code = err.code || 'PROCESS_FAILED';
    await withTransaction(async (client) => {
      const { rows } = await client.query(`SELECT * FROM jobs WHERE job_id = $1 FOR UPDATE`, [job.job_id]);
      if (rows[0]) await failJob(client, rows[0], code);
    });
  } finally {
    clearInterval(heartbeatTimer);
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
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
      [JobStatus.FETCHED],
    );
    const job = rows[0];
    if (!job) return null;

    const q = await ensureQuotaRow(client, job.actor_id);
    const conc = checkConcurrency(q, 'transcode');
    if (!conc.ok) return null;

    const leaseKey = `media:${job.job_id}`;
    const lease = await acquireLease(client, {
      leaseKey,
      ownerId: config.workerId,
      jobId: job.job_id,
      leaseType: 'media',
    });
    if (!lease || lease.owner_id !== config.workerId) return null;

    const tr = await transitionJob(client, job.job_id, job.state_version, JobStatus.FETCHED, JobStatus.PROCESSING, {
      progressPhase: 'processing',
      progressFraction: 0.6,
    });
    if (!tr.ok) {
      await releaseLease(client, leaseKey, config.workerId);
      return null;
    }

    await adjustConcurrency(client, job.actor_id, 'transcode', 1);
    return tr.job;
  });
}

export async function runMediaWorker(signal) {
  console.log(`[media-worker] starting as ${config.workerId} (no external egress)`);
  while (!signal?.aborted) {
    try {
      const job = await claimOneJob();
      if (job) {
        await processJob(job);
      } else {
        await new Promise((r) => setTimeout(r, config.workerPollMs));
      }
    } catch (err) {
      console.error('[media-worker] loop error', err);
      await new Promise((r) => setTimeout(r, config.workerPollMs));
    }
  }
}

export { processJob };
