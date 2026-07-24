import crypto from 'node:crypto';
import express from 'express';
import { config } from './config.js';
import { applySchema, query, withTransaction } from './db.js';
import { verifyRequestSignature, sha256Hex } from './hmac.js';
import { validatePlan } from './ffmpeg-builders.js';
import { classifyDiscoveryProvider, classifyProvider, resolveSource } from './connectors/index.js';
import { decryptSourceUrl } from './encryption.js';
import {
  QUOTAS,
  checkDailyLimits,
  checkSelectionLimit,
  checkAiDailyLimits,
  ensureQuotaRow,
  incrementDailyJobs,
  incrementDailyAiRequests,
} from './quotas.js';
import {
  JobStatus,
  Status,
  transitionDiscovery,
  transitionJob,
  transitionPackage,
  isActive,
} from './state-machine.js';
import { deleteObject, randomStorageKey, signedGetUrl, signedPutUrl } from './storage.js';
import { AiKind, isAiActive, transitionAiJob } from './ai-state-machine.js';
import { VALID_KINDS, makeAiJobId } from './workers/ai-worker.js';

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function payloadHash(body) {
  return sha256Hex(JSON.stringify(body));
}

function redactLabel(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const leaf = parts.length ? parts[parts.length - 1].slice(0, 48) : '';
    return leaf ? `${parsed.hostname}/…/${leaf}` : parsed.hostname;
  } catch {
    return 'invalid';
  }
}

function projectAiJob(row) {
  return {
    aiJobId: row.id,
    actorId: row.actor_id,
    kind: row.kind,
    status: row.status,
    progressPhase: row.progress_phase,
    progressFraction: row.progress_fraction,
    errorCode: row.error_code || null,
    provider: row.provider || null,
    model: row.model || null,
    cancelRequested: row.cancel_requested,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function projectJob(row) {
  return {
    jobId: row.job_id,
    batchId: row.batch_id,
    actorEmail: row.actor_email,
    actorId: row.actor_id,
    provider: row.provider,
    redactedSourceLabel: row.redacted_label,
    status: row.status,
    progressPhase: row.progress_phase,
    progressFraction: row.progress_fraction,
    operationId: row.operation_id,
    errorCode: row.error_code || null,
    attemptId: row.attempt_id,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
  };
}

function jsonError(res, status, code, message) {
  return res.status(status).json({ ok: false, code, error: message });
}

function hmacMiddleware(req, res, next) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks).toString('utf8');
    const auth = verifyRequestSignature(req, req.rawBody);
    if (!auth.ok) {
      return jsonError(res, auth.code === 'SERVICE_UNAVAILABLE' ? 503 : 401, auth.code, 'Authentication required');
    }
    try {
      req.body = req.rawBody ? JSON.parse(req.rawBody) : {};
    } catch {
      return jsonError(res, 400, 'INVALID_JSON', 'Invalid JSON body');
    }
    next();
  });
}

export async function createControlApp() {
  await applySchema();

  const app = express();
  app.disable('x-powered-by');

  app.get('/health', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({
        ok: true,
        role: config.role,
        acceptNewJobs: config.acceptNewJobs,
        acceptNewAiJobs: config.acceptNewAiJobs,
        aiProviderEnabled: config.enableAiProvider,
        youtubeEnabled: config.enableYoutubeConnector,
        feedEnabled: config.enableFeedConnector,
        plan6: {
          maxDiscoveryItems: QUOTAS.maxDiscoveryItems,
          maxSelectedItems: QUOTAS.maxSelectedItems,
          packageHardCapBytes: QUOTAS.packageHardCapBytes,
        },
        plan7: {
          maxRequestsPerAdminPerDay: QUOTAS.maxRequestsPerAdminPerDay,
          maxConcurrentAiJobsPerAdmin: QUOTAS.maxConcurrentAiJobsPerAdmin,
          tempRetentionMs: QUOTAS.aiTempRetentionMs,
        },
      });
    } catch {
      res.status(503).json({ ok: false, code: 'SERVICE_UNAVAILABLE' });
    }
  });

  app.post('/v1/jobs/create', hmacMiddleware, async (req, res) => {
    if (!config.acceptNewJobs) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'New jobs are temporarily disabled');
    }

    const {
      batchId,
      actorId,
      actorEmail,
      idempotencyKey,
      urls,
      plan,
    } = req.body || {};

    if (!batchId || !actorId || !actorEmail || !idempotencyKey) {
      return jsonError(res, 400, 'INVALID_REQUEST', 'Missing required fields');
    }

    const urlList = Array.isArray(urls) ? urls.map(String).filter(Boolean).slice(0, QUOTAS.maxUrlsPerSubmission) : [];
    if (!urlList.length) {
      return jsonError(res, 400, 'URL_INVALID', 'At least one URL is required');
    }

    const planCheck = validatePlan(plan);
    if (!planCheck.ok) {
      return jsonError(res, 400, planCheck.code, 'Invalid conversion plan');
    }

    const hash = payloadHash({ batchId, actorId, urls: urlList, plan });

    try {
      const result = await withTransaction(async (client) => {
        const existing = await client.query(
          `SELECT * FROM idempotency_keys WHERE actor_id = $1 AND idempotency_key = $2`,
          [actorId, idempotencyKey],
        );
        if (existing.rows[0]) {
          if (existing.rows[0].payload_hash !== hash) {
            return { conflict: true };
          }
          const { rows: jobs } = await client.query(
            `SELECT * FROM jobs WHERE batch_id = $1 ORDER BY created_at ASC`,
            [existing.rows[0].batch_id],
          );
          return { replay: true, batchId: existing.rows[0].batch_id, jobs };
        }

        const quota = await ensureQuotaRow(client, actorId);
        const daily = checkDailyLimits(quota, urlList.length, 0);
        if (!daily.ok) {
          return { quota: daily };
        }

        await client.query(
          `INSERT INTO batches (batch_id, actor_id, actor_email, accepted_count, status)
           VALUES ($1, $2, $3, $4, 'processing')`,
          [batchId, actorId, actorEmail, urlList.length],
        );

        await client.query(
          `INSERT INTO idempotency_keys (actor_id, idempotency_key, payload_hash, batch_id)
           VALUES ($1, $2, $3, $4)`,
          [actorId, idempotencyKey, hash, batchId],
        );

        const created = [];
        for (const url of urlList) {
          try {
            await resolveSource(url);
          } catch (err) {
            return { urlError: err.code || 'URL_INVALID', url };
          }

          const provider = classifyProvider(url);
          const jobId = makeId('job');
          const attemptId = makeId('att');

          await client.query(
            `INSERT INTO jobs (
              job_id, batch_id, actor_id, actor_email, provider, source_url, redacted_label,
              operation_id, plan_json, status, progress_phase, attempt_id
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              jobId,
              batchId,
              actorId,
              actorEmail,
              provider,
              url,
              redactLabel(url),
              planCheck.operationId,
              JSON.stringify(planCheck.plan),
              JobStatus.QUEUED,
              'queued',
              attemptId,
            ],
          );

          await client.query(
            `INSERT INTO job_attempts (attempt_id, job_id, status) VALUES ($1, $2, 'active')`,
            [attemptId, jobId],
          );

          const { rows } = await client.query(`SELECT * FROM jobs WHERE job_id = $1`, [jobId]);
          created.push(rows[0]);
        }

        await incrementDailyJobs(client, actorId, 0, urlList.length);
        return { batchId, jobs: created };
      });

      if (result.conflict) {
        return jsonError(res, 409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key reused with different payload');
      }
      if (result.quota) {
        return jsonError(res, 429, result.quota.code, result.quota.detail);
      }
      if (result.urlError) {
        return jsonError(res, 400, result.urlError, 'URL rejected');
      }

      const jobs = (result.jobs || []).map(projectJob);
      return res.json({
        ok: true,
        batchId: result.batchId,
        jobs,
        idempotentReplay: Boolean(result.replay),
      });
    } catch (err) {
      console.error('[control-api] create error', err);
      return jsonError(res, 500, 'INTERNAL', 'Unable to create jobs');
    }
  });

  app.post('/v1/jobs/cancel', hmacMiddleware, async (req, res) => {
    const { jobId, actorEmail } = req.body || {};
    if (!jobId) return jsonError(res, 400, 'INVALID_REQUEST', 'jobId required');

    try {
      await withTransaction(async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM jobs WHERE job_id = $1 AND ($2::text IS NULL OR actor_email = $2) FOR UPDATE`,
          [jobId, actorEmail || null],
        );
        const job = rows[0];
        if (!job) throw Object.assign(new Error('not found'), { status: 404 });
        if (!isActive(job.status)) return;

        await transitionJob(client, job.job_id, job.state_version, job.status, JobStatus.CANCELLED, {
          errorCode: 'CANCELLED',
          progressPhase: 'cancelled',
        });
        await client.query(
          `UPDATE job_attempts SET status = 'cancelled', finished_at = NOW() WHERE job_id = $1 AND status = 'active'`,
          [jobId],
        );
      });
      return res.json({ ok: true, jobId, status: JobStatus.CANCELLED });
    } catch (err) {
      if (err.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'Job not found');
      return jsonError(res, 500, 'INTERNAL', 'Cancel failed');
    }
  });

  app.post('/v1/jobs/retry', hmacMiddleware, async (req, res) => {
    if (!config.acceptNewJobs) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'Retries disabled while ACCEPT_NEW_JOBS=false');
    }

    const { jobId, actorEmail, attemptId } = req.body || {};
    if (!jobId || !attemptId) return jsonError(res, 400, 'INVALID_REQUEST', 'jobId and attemptId required');

    try {
      const job = await withTransaction(async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM jobs WHERE job_id = $1 AND ($2::text IS NULL OR actor_email = $2) FOR UPDATE`,
          [jobId, actorEmail || null],
        );
        const row = rows[0];
        if (!row) throw Object.assign(new Error('not found'), { status: 404 });
        if (![JobStatus.FAILED, JobStatus.CANCELLED].includes(row.status)) {
          throw Object.assign(new Error('bad state'), { status: 400, code: 'INVALID_STATE' });
        }

        await client.query(
          `INSERT INTO job_attempts (attempt_id, job_id, status) VALUES ($1, $2, 'active')`,
          [attemptId, jobId],
        );

        const tr = await transitionJob(client, row.job_id, row.state_version, row.status, JobStatus.QUEUED, {
          attemptId,
          errorCode: '',
          progressPhase: 'queued',
          progressFraction: 0,
        });
        if (!tr.ok) throw Object.assign(new Error('cas'), { status: 409 });
        return tr.job;
      });

      return res.json({ ok: true, job: projectJob(job) });
    } catch (err) {
      if (err.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'Job not found');
      if (err.status === 400) return jsonError(res, 400, err.code || 'INVALID_STATE', 'Cannot retry job');
      if (err.status === 409) return jsonError(res, 409, 'CAS_CONFLICT', 'Concurrent modification');
      return jsonError(res, 500, 'INTERNAL', 'Retry failed');
    }
  });

  app.post('/v1/discovery/create', hmacMiddleware, async (req, res) => {
    if (!config.acceptNewJobs) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'Discovery temporarily disabled');
    }

    const { actorId, url, idempotencyKey } = req.body || {};
    if (!actorId || !url || !idempotencyKey) {
      return jsonError(res, 400, 'INVALID_REQUEST', 'actorId, url, idempotencyKey required');
    }

    const provider = classifyDiscoveryProvider(url);
    if (!provider) {
      return jsonError(res, 400, 'PROVIDER_UNSUPPORTED', 'URL does not support discovery');
    }

    const discoveryId = makeId('disc');

    try {
      const row = await withTransaction(async (client) => {
        const quota = await ensureQuotaRow(client, actorId);
        const daily = checkDailyLimits(quota, 0, 0);
        if (!daily.ok) return { quota: daily };

        await client.query(
          `INSERT INTO discoveries (
            discovery_id, actor_id, provider, redacted_label, status, idempotency_key, source_url
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            discoveryId,
            actorId,
            provider,
            redactLabel(url),
            Status.DISCOVERING,
            idempotencyKey,
            url,
          ],
        );
        const { rows } = await client.query(`SELECT * FROM discoveries WHERE discovery_id = $1`, [discoveryId]);
        return { discovery: rows[0] };
      });

      if (row.quota) return jsonError(res, 429, row.quota.code, row.quota.detail);

      return res.json({
        ok: true,
        discoveryId,
        status: Status.DISCOVERING,
        provider,
        redactedLabel: row.discovery.redacted_label,
      });
    } catch (err) {
      console.error('[control-api] discovery create', err);
      return jsonError(res, 500, 'INTERNAL', 'Unable to create discovery');
    }
  });

  app.post('/v1/discovery/get', hmacMiddleware, async (req, res) => {
    const { discoveryId, actorId } = req.body || {};
    if (!discoveryId) return jsonError(res, 400, 'INVALID_REQUEST', 'discoveryId required');

    const { rows } = await query(
      `SELECT * FROM discoveries WHERE discovery_id = $1 AND ($2::text IS NULL OR actor_id = $2)`,
      [discoveryId, actorId || null],
    );
    const discovery = rows[0];
    if (!discovery) return jsonError(res, 404, 'NOT_FOUND', 'Discovery not found');

    const { rows: items } = await query(
      `SELECT item_id, provider_item_id, redacted_title, duration_bucket, selected, playlist_index, metadata_json
       FROM discovery_items WHERE discovery_id = $1 ORDER BY playlist_index ASC, created_at ASC`,
      [discoveryId],
    );

    return res.json({
      ok: true,
      discovery: {
        discoveryId: discovery.discovery_id,
        provider: discovery.provider,
        redactedLabel: discovery.redacted_label,
        status: discovery.status,
        itemCount: discovery.item_count,
        errorCode: discovery.error_code || null,
        cancelRequested: discovery.cancel_requested,
        createdAt: new Date(discovery.created_at).getTime(),
        updatedAt: new Date(discovery.updated_at).getTime(),
      },
      items: items.map((it) => ({
        itemId: it.item_id,
        providerItemId: it.provider_item_id,
        title: it.redacted_title,
        durationBucket: it.duration_bucket,
        selected: it.selected,
        playlistIndex: it.playlist_index,
        metadata: it.metadata_json,
      })),
    });
  });

  app.post('/v1/discovery/cancel', hmacMiddleware, async (req, res) => {
    const { discoveryId, actorId } = req.body || {};
    if (!discoveryId) return jsonError(res, 400, 'INVALID_REQUEST', 'discoveryId required');

    try {
      await withTransaction(async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM discoveries WHERE discovery_id = $1 AND ($2::text IS NULL OR actor_id = $2) FOR UPDATE`,
          [discoveryId, actorId || null],
        );
        const discovery = rows[0];
        if (!discovery) throw Object.assign(new Error('not found'), { status: 404 });

        if (discovery.status === Status.DISCOVERING) {
          await client.query(
            `UPDATE discoveries SET cancel_requested = TRUE, updated_at = NOW() WHERE discovery_id = $1`,
            [discoveryId],
          );
        } else if (discovery.status === Status.DISCOVERED) {
          await transitionDiscovery(client, discoveryId, Status.DISCOVERED, Status.CANCELLED, {
            errorCode: 'CANCELLED',
          });
        }
      });
      return res.json({ ok: true, discoveryId, status: Status.CANCELLED });
    } catch (err) {
      if (err.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'Discovery not found');
      return jsonError(res, 500, 'INTERNAL', 'Cancel failed');
    }
  });

  app.post('/v1/discovery/items', hmacMiddleware, async (req, res) => {
    const { discoveryId, actorId, selections } = req.body || {};
    if (!discoveryId || !Array.isArray(selections)) {
      return jsonError(res, 400, 'INVALID_REQUEST', 'discoveryId and selections[] required');
    }

    const selectedIds = selections.map((s) => String(s.itemId || s)).filter(Boolean);
    const selCheck = checkSelectionLimit(selectedIds.length);
    if (!selCheck.ok) return jsonError(res, 429, selCheck.code, selCheck.detail);

    try {
      const result = await withTransaction(async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM discoveries WHERE discovery_id = $1 AND ($2::text IS NULL OR actor_id = $2) FOR UPDATE`,
          [discoveryId, actorId || null],
        );
        const discovery = rows[0];
        if (!discovery) throw Object.assign(new Error('not found'), { status: 404 });
        if (discovery.status !== Status.DISCOVERED) {
          throw Object.assign(new Error('bad state'), { status: 400, code: 'INVALID_STATE' });
        }

        await client.query(
          `UPDATE discovery_items SET selected = FALSE WHERE discovery_id = $1`,
          [discoveryId],
        );

        if (selectedIds.length) {
          await client.query(
            `UPDATE discovery_items SET selected = TRUE
             WHERE discovery_id = $1 AND item_id = ANY($2::text[])`,
            [discoveryId, selectedIds],
          );
        }

        const { rows: countRows } = await client.query(
          `SELECT COUNT(*)::int AS n FROM discovery_items WHERE discovery_id = $1 AND selected = TRUE`,
          [discoveryId],
        );
        return { selectedCount: countRows[0].n };
      });

      return res.json({ ok: true, discoveryId, selectedCount: result.selectedCount });
    } catch (err) {
      if (err.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'Discovery not found');
      if (err.status === 400) return jsonError(res, 400, err.code || 'INVALID_STATE', 'Cannot update selections');
      return jsonError(res, 500, 'INTERNAL', 'Selection update failed');
    }
  });

  app.post('/v1/batch/confirm', hmacMiddleware, async (req, res) => {
    if (!config.acceptNewJobs) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'Batch confirm disabled');
    }

    const {
      batchId,
      actorId,
      actorEmail,
      discoveryId,
      plan,
      numberingPolicy,
      idempotencyKey,
    } = req.body || {};

    if (!batchId || !actorId || !actorEmail || !discoveryId || !idempotencyKey) {
      return jsonError(res, 400, 'INVALID_REQUEST', 'Missing required fields');
    }

    const planCheck = validatePlan(plan);
    if (!planCheck.ok) return jsonError(res, 400, planCheck.code, 'Invalid conversion plan');

    try {
      const result = await withTransaction(async (client) => {
        const { rows: discRows } = await client.query(
          `SELECT * FROM discoveries WHERE discovery_id = $1 AND actor_id = $2 FOR UPDATE`,
          [discoveryId, actorId],
        );
        const discovery = discRows[0];
        if (!discovery || discovery.status !== Status.DISCOVERED) {
          return { state: 'INVALID_STATE' };
        }

        const { rows: selectedItems } = await client.query(
          `SELECT * FROM discovery_items
           WHERE discovery_id = $1 AND selected = TRUE
           ORDER BY playlist_index ASC, created_at ASC`,
          [discoveryId],
        );

        const selCheck = checkSelectionLimit(selectedItems.length);
        if (!selCheck.ok) return { quota: selCheck };
        if (!selectedItems.length) return { state: 'NO_SELECTION' };

        const quota = await ensureQuotaRow(client, actorId);
        const daily = checkDailyLimits(quota, selectedItems.length, 0);
        if (!daily.ok) return { quota: daily };

        await client.query(
          `INSERT INTO batches (
            batch_id, actor_id, actor_email, status, kind, discovery_id,
            selected_count, numbering_policy, accepted_count
          ) VALUES ($1,$2,$3,'processing','discovery',$4,$5,$6,$7)`,
          [
            batchId,
            actorId,
            actorEmail,
            discoveryId,
            selectedItems.length,
            numberingPolicy || 'index-prefix',
            selectedItems.length,
          ],
        );

        const created = [];
        for (const item of selectedItems) {
          const sourceUrl = decryptSourceUrl(item.encrypted_source_url);
          const provider = classifyProvider(sourceUrl);
          const jobId = makeId('job');
          const attemptId = makeId('att');

          await client.query(
            `INSERT INTO jobs (
              job_id, batch_id, actor_id, actor_email, provider, source_url, redacted_label,
              operation_id, plan_json, status, progress_phase, attempt_id,
              discovery_item_id, playlist_index
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [
              jobId,
              batchId,
              actorId,
              actorEmail,
              provider,
              sourceUrl,
              item.redacted_title || discovery.redacted_label,
              planCheck.operationId,
              JSON.stringify(planCheck.plan),
              JobStatus.QUEUED,
              'queued',
              attemptId,
              item.item_id,
              item.playlist_index,
            ],
          );

          await client.query(
            `INSERT INTO job_attempts (attempt_id, job_id, status) VALUES ($1, $2, 'active')`,
            [attemptId, jobId],
          );

          const { rows } = await client.query(`SELECT * FROM jobs WHERE job_id = $1`, [jobId]);
          created.push(rows[0]);
        }

        await incrementDailyJobs(client, actorId, 0, selectedItems.length);
        return { batchId, jobs: created, selectedCount: selectedItems.length };
      });

      if (result.state === 'INVALID_STATE') {
        return jsonError(res, 400, 'INVALID_STATE', 'Discovery not ready for confirm');
      }
      if (result.state === 'NO_SELECTION') {
        return jsonError(res, 400, 'NO_SELECTION', 'No items selected');
      }
      if (result.quota) return jsonError(res, 429, result.quota.code, result.quota.detail);

      return res.json({
        ok: true,
        batchId: result.batchId,
        selectedCount: result.selectedCount,
        jobs: (result.jobs || []).map(projectJob),
      });
    } catch (err) {
      console.error('[control-api] batch confirm', err);
      return jsonError(res, 500, 'INTERNAL', 'Batch confirm failed');
    }
  });

  app.post('/v1/batch/pause', hmacMiddleware, async (req, res) => {
    const { batchId, actorId } = req.body || {};
    if (!batchId) return jsonError(res, 400, 'INVALID_REQUEST', 'batchId required');

    try {
      await withTransaction(async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM batches WHERE batch_id = $1 AND ($2::text IS NULL OR actor_id = $2) FOR UPDATE`,
          [batchId, actorId || null],
        );
        const batch = rows[0];
        if (!batch) throw Object.assign(new Error('not found'), { status: 404 });
        await client.query(
          `UPDATE batches SET paused = TRUE, status = $2, updated_at = NOW() WHERE batch_id = $1`,
          [batchId, Status.PAUSED],
        );
      });
      return res.json({ ok: true, batchId, paused: true, status: Status.PAUSED });
    } catch (err) {
      if (err.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'Batch not found');
      return jsonError(res, 500, 'INTERNAL', 'Pause failed');
    }
  });

  app.post('/v1/batch/resume', hmacMiddleware, async (req, res) => {
    const { batchId, actorId } = req.body || {};
    if (!batchId) return jsonError(res, 400, 'INVALID_REQUEST', 'batchId required');

    try {
      await withTransaction(async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM batches WHERE batch_id = $1 AND ($2::text IS NULL OR actor_id = $2) FOR UPDATE`,
          [batchId, actorId || null],
        );
        const batch = rows[0];
        if (!batch) throw Object.assign(new Error('not found'), { status: 404 });
        await client.query(
          `UPDATE batches SET paused = FALSE, status = 'processing', updated_at = NOW() WHERE batch_id = $1`,
          [batchId],
        );
      });
      return res.json({ ok: true, batchId, paused: false, status: 'processing' });
    } catch (err) {
      if (err.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'Batch not found');
      return jsonError(res, 500, 'INTERNAL', 'Resume failed');
    }
  });

  app.post('/v1/batch/retry-failed', hmacMiddleware, async (req, res) => {
    if (!config.acceptNewJobs) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'Retries disabled');
    }

    const { batchId, actorId, actorEmail } = req.body || {};
    if (!batchId) return jsonError(res, 400, 'INVALID_REQUEST', 'batchId required');

    try {
      const retried = await withTransaction(async (client) => {
        const { rows: batchRows } = await client.query(
          `SELECT * FROM batches WHERE batch_id = $1 AND ($2::text IS NULL OR actor_id = $2) FOR UPDATE`,
          [batchId, actorId || null],
        );
        if (!batchRows[0]) throw Object.assign(new Error('not found'), { status: 404 });
        if (batchRows[0].paused) throw Object.assign(new Error('paused'), { status: 400, code: 'BATCH_PAUSED' });

        const { rows: failedJobs } = await client.query(
          `SELECT * FROM jobs WHERE batch_id = $1 AND status = $2 FOR UPDATE`,
          [batchId, JobStatus.FAILED],
        );

        const jobs = [];
        for (const row of failedJobs) {
          const attemptId = makeId('att');
          await client.query(
            `INSERT INTO job_attempts (attempt_id, job_id, status) VALUES ($1, $2, 'active')`,
            [attemptId, row.job_id],
          );
          const tr = await transitionJob(client, row.job_id, row.state_version, JobStatus.FAILED, JobStatus.QUEUED, {
            attemptId,
            errorCode: '',
            progressPhase: 'queued',
            progressFraction: 0,
          });
          if (tr.ok) jobs.push(tr.job);
        }
        return jobs;
      });

      return res.json({ ok: true, batchId, retriedCount: retried.length, jobs: retried.map(projectJob) });
    } catch (err) {
      if (err.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'Batch not found');
      if (err.status === 400) return jsonError(res, 400, err.code || 'BATCH_PAUSED', 'Batch is paused');
      return jsonError(res, 500, 'INTERNAL', 'Retry failed jobs failed');
    }
  });

  app.post('/v1/packages/create', hmacMiddleware, async (req, res) => {
    const {
      packageId: clientPackageId,
      batchId,
      actorId,
      includeThumbnails,
      includeSubtitles,
      includeMetadata,
      readySubsetOnly,
    } = req.body || {};

    if (!batchId || !actorId) {
      return jsonError(res, 400, 'INVALID_REQUEST', 'batchId and actorId required');
    }

    const packageId = clientPackageId || makeId('pkg');

    try {
      const pkg = await withTransaction(async (client) => {
        const { rows: batchRows } = await client.query(
          `SELECT * FROM batches WHERE batch_id = $1 AND actor_id = $2`,
          [batchId, actorId],
        );
        if (!batchRows[0]) throw Object.assign(new Error('not found'), { status: 404 });

        await client.query(
          `INSERT INTO packages (
            package_id, batch_id, actor_id, status,
            include_thumbnails, include_subtitles, include_metadata, ready_subset_only
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            packageId,
            batchId,
            actorId,
            Status.QUEUED,
            Boolean(includeThumbnails),
            Boolean(includeSubtitles),
            Boolean(includeMetadata),
            readySubsetOnly !== false,
          ],
        );
        const { rows } = await client.query(`SELECT * FROM packages WHERE package_id = $1`, [packageId]);
        return rows[0];
      });

      return res.json({
        ok: true,
        packageId: pkg.package_id,
        batchId: pkg.batch_id,
        status: pkg.status,
      });
    } catch (err) {
      if (err.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'Batch not found');
      return jsonError(res, 500, 'INTERNAL', 'Package create failed');
    }
  });

  app.post('/v1/packages/get', hmacMiddleware, async (req, res) => {
    const { packageId, actorId } = req.body || {};
    if (!packageId) return jsonError(res, 400, 'INVALID_REQUEST', 'packageId required');

    const { rows } = await query(
      `SELECT * FROM packages WHERE package_id = $1 AND ($2::text IS NULL OR actor_id = $2)`,
      [packageId, actorId || null],
    );
    const pkg = rows[0];
    if (!pkg) return jsonError(res, 404, 'NOT_FOUND', 'Package not found');

    const { rows: entries } = await query(
      `SELECT job_id, artifact_id, archive_path FROM package_entries WHERE package_id = $1`,
      [packageId],
    );

    return res.json({
      ok: true,
      package: {
        packageId: pkg.package_id,
        batchId: pkg.batch_id,
        status: pkg.status,
        entryCount: pkg.entry_count,
        sizeBytes: Number(pkg.size_bytes),
        errorCode: pkg.error_code || null,
        expiresAt: pkg.expires_at ? new Date(pkg.expires_at).getTime() : null,
        includeThumbnails: pkg.include_thumbnails,
        includeSubtitles: pkg.include_subtitles,
        includeMetadata: pkg.include_metadata,
        readySubsetOnly: pkg.ready_subset_only,
        createdAt: new Date(pkg.created_at).getTime(),
        updatedAt: new Date(pkg.updated_at).getTime(),
      },
      entries: entries.map((e) => ({
        jobId: e.job_id,
        artifactId: e.artifact_id,
        archivePath: e.archive_path,
      })),
    });
  });

  app.post('/v1/packages/download-token', hmacMiddleware, async (req, res) => {
    const { packageId, actorId, ttlMs } = req.body || {};
    if (!packageId) return jsonError(res, 400, 'INVALID_REQUEST', 'packageId required');

    const { rows } = await query(
      `SELECT * FROM packages WHERE package_id = $1 AND ($2::text IS NULL OR actor_id = $2)`,
      [packageId, actorId || null],
    );
    const pkg = rows[0];
    if (!pkg) return jsonError(res, 404, 'NOT_FOUND', 'Package not found');
    if (pkg.status !== Status.READY) {
      return jsonError(res, 403, 'DOWNLOAD_FORBIDDEN', 'Package not ready');
    }
    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      return jsonError(res, 410, 'EXPIRED', 'Package expired');
    }
    if (!pkg.object_key) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'Missing package object');
    }

    const downloadUrl = await signedGetUrl(pkg.object_key, ttlMs || config.signedDownloadTtlMs);
    return res.json({
      ok: true,
      packageId,
      downloadUrl,
      sizeBytes: Number(pkg.size_bytes),
      expiresInMs: ttlMs || config.signedDownloadTtlMs,
    });
  });

  app.post('/v1/jobs/download-token', hmacMiddleware, async (req, res) => {
    const { jobId, actorEmail, ttlMs } = req.body || {};
    if (!jobId) return jsonError(res, 400, 'INVALID_REQUEST', 'jobId required');

    const { rows } = await query(
      `SELECT * FROM jobs WHERE job_id = $1 AND ($2::text IS NULL OR actor_email = $2)`,
      [jobId, actorEmail || null],
    );
    const job = rows[0];
    if (!job) return jsonError(res, 404, 'NOT_FOUND', 'Job not found');
    if (job.status !== JobStatus.READY) {
      return jsonError(res, 403, 'DOWNLOAD_FORBIDDEN', 'Job not ready');
    }
    if (job.expires_at && new Date(job.expires_at) < new Date()) {
      return jsonError(res, 410, 'EXPIRED', 'Output expired');
    }
    if (!job.output_artifact_key) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'Missing output artifact');
    }

    const downloadUrl = await signedGetUrl(job.output_artifact_key, ttlMs || config.signedDownloadTtlMs);
    return res.json({
      ok: true,
      jobId,
      downloadUrl,
      expiresInMs: ttlMs || config.signedDownloadTtlMs,
    });
  });

  app.post('/v1/ai/create', hmacMiddleware, async (req, res) => {
    if (!config.enableAiProvider) {
      return jsonError(res, 503, 'AI_DISABLED', 'AI provider is disabled');
    }
    if (!config.acceptNewAiJobs) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'New AI jobs are temporarily disabled');
    }

    const {
      actorId,
      kind,
      objectKeyIn,
      provider,
      model,
      options,
    } = req.body || {};

    if (!actorId || !kind) {
      return jsonError(res, 400, 'INVALID_REQUEST', 'actorId and kind required');
    }
    if (!VALID_KINDS.has(kind)) {
      return jsonError(res, 400, 'AI_VALIDATION_FAILED', 'Invalid AI kind');
    }

    const needsInputObject = kind === AiKind.OCR || kind === AiKind.TRANSCRIBE;
    const opts = options && typeof options === 'object' ? options : {};
    const hasTextOption = Boolean(opts.prompt || opts.text);
    if (needsInputObject && !objectKeyIn) {
      return jsonError(res, 400, 'AI_VALIDATION_FAILED', 'objectKeyIn required for this kind');
    }
    if ((kind === AiKind.ASSIST || kind === AiKind.TRANSLATE) && !objectKeyIn && !hasTextOption) {
      return jsonError(res, 400, 'AI_VALIDATION_FAILED', 'objectKeyIn or options.text/prompt required');
    }

    const aiJobId = makeAiJobId();
    const expiresAt = new Date(Date.now() + config.plan7.tempRetentionMs);

    try {
      const row = await withTransaction(async (client) => {
        const quota = await ensureQuotaRow(client, actorId);
        const daily = checkAiDailyLimits(quota, 1);
        if (!daily.ok) return { quota: daily };

        await client.query(
          `INSERT INTO ai_jobs (
            id, actor_id, kind, status, progress_phase, object_key_in,
            provider, model, options_json, expires_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            aiJobId,
            actorId,
            kind,
            Status.QUEUED,
            'queued',
            objectKeyIn || null,
            provider || '',
            model || config.plan7.primaryModel,
            JSON.stringify(opts),
            expiresAt,
          ],
        );
        await incrementDailyAiRequests(client, actorId, 1);
        const { rows } = await client.query(`SELECT * FROM ai_jobs WHERE id = $1`, [aiJobId]);
        return { job: rows[0] };
      });

      if (row.quota) return jsonError(res, 429, row.quota.code, row.quota.detail);

      return res.json({ ok: true, aiJob: projectAiJob(row.job) });
    } catch (err) {
      console.error('[control-api] ai create', err);
      return jsonError(res, 500, 'INTERNAL', 'Unable to create AI job');
    }
  });

  app.post('/v1/ai/get', hmacMiddleware, async (req, res) => {
    const { aiJobId, actorId } = req.body || {};
    if (!aiJobId) return jsonError(res, 400, 'INVALID_REQUEST', 'aiJobId required');

    const { rows } = await query(
      `SELECT * FROM ai_jobs WHERE id = $1 AND ($2::text IS NULL OR actor_id = $2)`,
      [aiJobId, actorId || null],
    );
    const job = rows[0];
    if (!job) return jsonError(res, 404, 'NOT_FOUND', 'AI job not found');

    return res.json({ ok: true, aiJob: projectAiJob(job) });
  });

  app.post('/v1/ai/cancel', hmacMiddleware, async (req, res) => {
    const { aiJobId, actorId } = req.body || {};
    if (!aiJobId) return jsonError(res, 400, 'INVALID_REQUEST', 'aiJobId required');

    try {
      const result = await withTransaction(async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM ai_jobs WHERE id = $1 AND ($2::text IS NULL OR actor_id = $2) FOR UPDATE`,
          [aiJobId, actorId || null],
        );
        const job = rows[0];
        if (!job) throw Object.assign(new Error('not found'), { status: 404 });
        if (!isAiActive(job.status)) {
          return { job, cancelled: job.status === Status.CANCELLED };
        }

        if (job.status === Status.QUEUED) {
          const tr = await transitionAiJob(client, job.id, Status.QUEUED, Status.CANCELLED, {
            errorCode: 'AI_CANCELLED',
            progressPhase: 'cancelled',
          });
          if (job.object_key_in) await deleteObject(job.object_key_in);
          if (tr.job) {
            await client.query(
              `UPDATE ai_jobs SET object_key_in = NULL, updated_at = NOW() WHERE id = $1`,
              [aiJobId],
            );
          }
          return { job: tr.job || job, cancelled: true };
        }

        await client.query(
          `UPDATE ai_jobs SET cancel_requested = TRUE, updated_at = NOW() WHERE id = $1`,
          [aiJobId],
        );
        const { rows: updated } = await client.query(`SELECT * FROM ai_jobs WHERE id = $1`, [aiJobId]);
        return { job: updated[0], cancelRequested: true };
      });

      return res.json({
        ok: true,
        aiJob: projectAiJob(result.job),
        cancelRequested: Boolean(result.cancelRequested),
        status: result.job.status,
      });
    } catch (err) {
      if (err.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'AI job not found');
      return jsonError(res, 500, 'INTERNAL', 'Cancel failed');
    }
  });

  app.post('/v1/ai/download-sidecar', hmacMiddleware, async (req, res) => {
    const { aiJobId, actorId, ttlMs } = req.body || {};
    if (!aiJobId) return jsonError(res, 400, 'INVALID_REQUEST', 'aiJobId required');

    const { rows } = await query(
      `SELECT * FROM ai_jobs WHERE id = $1 AND ($2::text IS NULL OR actor_id = $2)`,
      [aiJobId, actorId || null],
    );
    const job = rows[0];
    if (!job) return jsonError(res, 404, 'NOT_FOUND', 'AI job not found');
    if (job.status !== Status.READY) {
      return jsonError(res, 403, 'DOWNLOAD_FORBIDDEN', 'AI sidecar not ready');
    }
    if (job.expires_at && new Date(job.expires_at) < new Date()) {
      return jsonError(res, 410, 'EXPIRED', 'AI sidecar expired');
    }
    if (!job.object_key_out) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'Missing sidecar object');
    }

    const downloadUrl = await signedGetUrl(job.object_key_out, ttlMs || config.signedDownloadTtlMs);
    return res.json({
      ok: true,
      aiJobId,
      downloadUrl,
      expiresInMs: ttlMs || config.signedDownloadTtlMs,
    });
  });

  app.post('/v1/ai/upload-url', hmacMiddleware, async (req, res) => {
    if (!config.enableAiProvider) {
      return jsonError(res, 503, 'AI_DISABLED', 'AI provider is disabled');
    }
    if (!config.acceptNewAiJobs) {
      return jsonError(res, 503, 'SERVICE_UNAVAILABLE', 'New AI jobs are temporarily disabled');
    }
    const { actorId, contentType, purpose } = req.body || {};
    if (!actorId) return jsonError(res, 400, 'INVALID_REQUEST', 'actorId required');
    const allowed = new Set(['ocr', 'transcribe', 'assist']);
    if (!allowed.has(String(purpose || ''))) {
      return jsonError(res, 400, 'AI_VALIDATION_FAILED', 'Invalid upload purpose');
    }
    const objectKey = randomStorageKey('ai-temp');
    const ttlMs = Math.min(config.plan7.tempRetentionMs, 15 * 60 * 1000);
    const uploadUrl = await signedPutUrl(objectKey, contentType || 'application/octet-stream', 5 * 60 * 1000);
    return res.json({
      ok: true,
      objectKey,
      uploadUrl,
      expiresInMs: 5 * 60 * 1000,
      tempRetentionMs: ttlMs,
    });
  });

  return app;
}

export async function startControlServer() {
  const app = await createControlApp();
  return new Promise((resolve) => {
    const server = app.listen(config.port, config.host, () => {
      console.log(`[api] listening on ${config.host}:${config.port}`);
      resolve(server);
    });
  });
}
