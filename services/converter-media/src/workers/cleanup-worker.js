import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { wipedEncryptedUrl } from '../encryption.js';
import { JobStatus, Status, transitionJob, isDiscoveryTerminal } from '../state-machine.js';
import { transitionAiJob } from '../ai-state-machine.js';
import { reclaimExpiredLeases, releaseLease } from '../queue.js';
import { deleteObject } from '../storage.js';
import { adjustConcurrency } from '../quotas.js';

async function expireReadyJobs() {
  const { rows } = await query(
    `SELECT * FROM jobs
     WHERE status = $1 AND expires_at IS NOT NULL AND expires_at < NOW()`,
    [JobStatus.READY],
  );

  for (const job of rows) {
    await withTransaction(async (client) => {
      const { rows: locked } = await client.query(
        `SELECT * FROM jobs WHERE job_id = $1 FOR UPDATE`,
        [job.job_id],
      );
      const current = locked[0];
      if (!current || current.status !== JobStatus.READY) return;

      if (current.output_artifact_key) await deleteObject(current.output_artifact_key);
      if (current.input_artifact_key) await deleteObject(current.input_artifact_key);

      await client.query(`DELETE FROM artifacts WHERE job_id = $1`, [job.job_id]);
      await transitionJob(client, current.job_id, current.state_version, JobStatus.READY, JobStatus.FAILED, {
        errorCode: 'EXPIRED',
        progressPhase: 'expired',
      });
    });
  }
  return rows.length;
}

async function expirePackages() {
  const { rows } = await query(
    `SELECT * FROM packages
     WHERE status = $1 AND expires_at IS NOT NULL AND expires_at < NOW()`,
    [Status.READY],
  );

  for (const pkg of rows) {
    await withTransaction(async (client) => {
      const { rows: locked } = await client.query(
        `SELECT * FROM packages WHERE package_id = $1 FOR UPDATE`,
        [pkg.package_id],
      );
      const current = locked[0];
      if (!current || current.status !== Status.READY) return;

      if (current.object_key) await deleteObject(current.object_key);
      await client.query(`DELETE FROM package_entries WHERE package_id = $1`, [current.package_id]);
      await client.query(
        `UPDATE packages SET status = $2, error_code = 'EXPIRED', object_key = NULL, updated_at = NOW()
         WHERE package_id = $1`,
        [current.package_id, Status.FAILED],
      );
    });
  }
  return rows.length;
}

async function cleanupFailedPackageObjects() {
  const { rows } = await query(
    `SELECT * FROM packages WHERE status = $1 AND object_key IS NOT NULL`,
    [Status.FAILED],
  );

  for (const pkg of rows) {
    if (pkg.object_key) {
      await deleteObject(pkg.object_key);
      await query(
        `UPDATE packages SET object_key = NULL, updated_at = NOW() WHERE package_id = $1`,
        [pkg.package_id],
      );
    }
  }
  return rows.length;
}

async function wipeDiscoverySecrets() {
  const { rows } = await query(
    `SELECT discovery_id, status FROM discoveries
     WHERE status = ANY($1::text[])`,
    [[Status.DISCOVERED, Status.FAILED, Status.CANCELLED]],
  );

  let wiped = 0;
  for (const disc of rows) {
    if (!isDiscoveryTerminal(disc.status)) continue;
    const res = await query(
      `UPDATE discovery_items SET encrypted_source_url = $1
       WHERE discovery_id = $2 AND encrypted_source_url <> ''`,
      [wipedEncryptedUrl(), disc.discovery_id],
    );
    wiped += res.rowCount || 0;
  }
  return wiped;
}

async function cleanupOrphanArtifacts() {
  const cutoff = new Date(Date.now() - config.orphanArtifactTtlMs);
  const { rows } = await query(
    `SELECT a.* FROM artifacts a
     LEFT JOIN jobs j ON j.job_id = a.job_id
     WHERE (j.job_id IS NULL OR j.status IN ('failed', 'cancelled'))
       AND a.created_at < $1`,
    [cutoff],
  );

  for (const art of rows) {
    await deleteObject(art.storage_key);
    await query(`DELETE FROM artifacts WHERE id = $1`, [art.id]);
  }
  return rows.length;
}

async function expireAiJobs() {
  const { rows } = await query(
    `SELECT * FROM ai_jobs
     WHERE status = $1 AND expires_at IS NOT NULL AND expires_at < NOW()`,
    [Status.READY],
  );

  for (const job of rows) {
    await withTransaction(async (client) => {
      const { rows: locked } = await client.query(
        `SELECT * FROM ai_jobs WHERE id = $1 FOR UPDATE`,
        [job.id],
      );
      const current = locked[0];
      if (!current || current.status !== Status.READY) return;

      if (current.object_key_out) await deleteObject(current.object_key_out);
      if (current.object_key_in) await deleteObject(current.object_key_in);

      await transitionAiJob(client, current.id, Status.READY, Status.FAILED, {
        errorCode: 'EXPIRED',
        progressPhase: 'expired',
        objectKeyOut: null,
        objectKeyIn: null,
      });
    });
  }
  return rows.length;
}

async function cleanupAiTerminalObjects() {
  const { rows } = await query(
    `SELECT * FROM ai_jobs
     WHERE status = ANY($1::text[]) AND (object_key_in IS NOT NULL OR object_key_out IS NOT NULL)`,
    [[Status.FAILED, Status.CANCELLED]],
  );

  let cleaned = 0;
  for (const job of rows) {
    if (job.object_key_in) {
      await deleteObject(job.object_key_in);
      await query(`UPDATE ai_jobs SET object_key_in = NULL, updated_at = NOW() WHERE id = $1`, [job.id]);
      cleaned += 1;
    }
    if (job.object_key_out) {
      await deleteObject(job.object_key_out);
      await query(`UPDATE ai_jobs SET object_key_out = NULL, updated_at = NOW() WHERE id = $1`, [job.id]);
      cleaned += 1;
    }
  }
  return cleaned;
}

async function cleanupCancelledLeftovers() {
  const { rows } = await query(
    `SELECT * FROM jobs WHERE status = $1 AND updated_at < NOW() - INTERVAL '1 hour'`,
    [JobStatus.CANCELLED],
  );

  for (const job of rows) {
    if (job.input_artifact_key) await deleteObject(job.input_artifact_key);
    if (job.output_artifact_key) await deleteObject(job.output_artifact_key);
    await query(`DELETE FROM artifacts WHERE job_id = $1`, [job.job_id]);
    await query(`DELETE FROM worker_leases WHERE job_id = $1`, [job.job_id]);
  }
  return rows.length;
}

async function resetStaleActiveJobs() {
  const reclaimed = await withTransaction(async (client) => {
    const expired = await reclaimExpiredLeases(client);
    let count = 0;
    for (const lease of expired) {
      if (!lease.job_id) {
        await releaseLease(client, lease.lease_key, lease.owner_id);
        continue;
      }

      if (lease.lease_type === 'ai') {
        const aiJobId = lease.lease_key.startsWith('ai:') ? lease.lease_key.slice(3) : null;
        const { rows: aiRows } = aiJobId
          ? await client.query(`SELECT * FROM ai_jobs WHERE id = $1 FOR UPDATE`, [aiJobId])
          : { rows: [] };
        const aiJob = aiRows[0];
        if (aiJob?.status === Status.PROCESSING) {
          await adjustConcurrency(client, aiJob.actor_id, 'ai', -1);
          await transitionAiJob(client, aiJob.id, Status.PROCESSING, Status.QUEUED, {
            errorCode: 'LEASE_LOST',
            progressPhase: 'queued',
            progressFraction: 0,
          });
          count += 1;
        }
        await releaseLease(client, lease.lease_key, lease.owner_id);
        continue;
      }

      const { rows } = await client.query(`SELECT * FROM jobs WHERE job_id = $1 FOR UPDATE`, [lease.job_id]);
      const job = rows[0];
      if (!job) continue;
      if ([JobStatus.FETCHING, JobStatus.PROCESSING].includes(job.status)) {
        const kind = lease.lease_type === 'fetch' ? 'fetch' : 'transcode';
        await adjustConcurrency(client, job.actor_id, kind, -1);
        await transitionJob(client, job.job_id, job.state_version, job.status, JobStatus.QUEUED, {
          errorCode: 'LEASE_LOST',
          progressPhase: 'queued',
          progressFraction: 0,
        });
        count += 1;
      }
      await releaseLease(client, lease.lease_key, lease.owner_id);
    }
    return count;
  });
  return reclaimed;
}

export async function runCleanupPass() {
  const [
    expired,
    packages,
    packageOrphans,
    discoveryWiped,
    orphans,
    cancelled,
    aiExpired,
    aiTerminalCleaned,
    reclaimed,
  ] = await Promise.all([
    expireReadyJobs(),
    expirePackages(),
    cleanupFailedPackageObjects(),
    wipeDiscoverySecrets(),
    cleanupOrphanArtifacts(),
    cleanupCancelledLeftovers(),
    expireAiJobs(),
    cleanupAiTerminalObjects(),
    resetStaleActiveJobs(),
  ]);
  return {
    expired,
    packages,
    packageOrphans,
    discoveryWiped,
    orphans,
    cancelled,
    aiExpired,
    aiTerminalCleaned,
    reclaimed,
  };
}

export async function runCleanupWorker(signal) {
  console.log('[cleanup-worker] starting');
  while (!signal?.aborted) {
    try {
      const stats = await runCleanupPass();
      console.log('[cleanup-worker] pass', stats);
    } catch (err) {
      console.error('[cleanup-worker] error', err);
    }
    await new Promise((r) => setTimeout(r, config.cleanupIntervalMs));
  }
}
