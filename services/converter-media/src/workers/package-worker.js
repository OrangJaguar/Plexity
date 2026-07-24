import { config } from '../config.js';
import { withTransaction, query } from '../db.js';
import { buildAndUploadPackage } from '../package-builder.js';
import { packageSizeWarnings } from '../package-limits.js';
import { acquireLease, heartbeatLease, releaseLease } from '../queue.js';
import { Status, transitionPackage } from '../state-machine.js';
import { getObjectStream, randomStorageKey } from '../storage.js';

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function loadReadyEntries(pkg, batch) {
  const sql = pkg.ready_subset_only
    ? `SELECT j.*, a.artifact_id, a.storage_key, a.content_type, a.byte_size, a.sha256, a.kind
       FROM jobs j
       JOIN artifacts a ON a.job_id = j.job_id AND a.kind = 'primary'
       WHERE j.batch_id = $1 AND j.status = $2
       ORDER BY COALESCE(j.playlist_index, 999999), j.created_at ASC`
    : `SELECT j.*, a.artifact_id, a.storage_key, a.content_type, a.byte_size, a.sha256, a.kind
       FROM jobs j
       JOIN artifacts a ON a.job_id = j.job_id AND a.kind = 'primary'
       WHERE j.batch_id = $1
       ORDER BY COALESCE(j.playlist_index, 999999), j.created_at ASC`;

  const params = pkg.ready_subset_only ? [pkg.batch_id, Status.READY] : [pkg.batch_id];
  const { rows: jobs } = await query(sql, params);

  const entries = [];
  for (const row of jobs) {
    const stream = await getObjectStream(row.storage_key);
    if (!stream) continue;
    const buffer = await streamToBuffer(stream);
    const ext = row.content_type?.includes('video') ? '.mp4'
      : row.content_type?.includes('audio') ? '.mp3'
        : row.content_type?.includes('image') ? '.png' : '.bin';
    entries.push({
      job: row,
      artifact: {
        artifact_id: row.artifact_id,
        content_type: row.content_type,
        byte_size: row.byte_size,
        sha256: row.sha256,
        kind: row.kind,
      },
      buffer,
      fileName: `${row.job_id}${ext}`,
    });
  }
  return { entries, batch };
}

async function processPackage(pkg) {
  const leaseKey = `package:${pkg.package_id}`;
  let heartbeatTimer;

  try {
    heartbeatTimer = setInterval(() => {
      heartbeatLease(undefined, leaseKey, config.workerId).catch(() => {});
    }, config.leaseHeartbeatMs);

    const { rows: batches } = await query(`SELECT * FROM batches WHERE batch_id = $1`, [pkg.batch_id]);
    const batch = batches[0];
    if (!batch) throw Object.assign(new Error('batch missing'), { code: 'BATCH_NOT_FOUND' });

    const { entries } = await loadReadyEntries(pkg, batch);
    if (!entries.length) {
      throw Object.assign(new Error('no ready artifacts'), { code: 'PACKAGE_EMPTY' });
    }

    const objectKey = randomStorageKey('packages');
    const expiresAt = new Date(Date.now() + config.packageTtlMs);

    const built = await buildAndUploadPackage({
      entries,
      numberingPolicy: batch.numbering_policy || 'index-prefix',
      includeThumbnails: pkg.include_thumbnails,
      includeSubtitles: pkg.include_subtitles,
      includeMetadata: pkg.include_metadata,
      objectKey,
    });

    packageSizeWarnings(built.sizeBytes);

    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM packages WHERE package_id = $1 FOR UPDATE`,
        [pkg.package_id],
      );
      const current = rows[0];
      if (!current || current.status !== Status.PACKAGING) return;

      for (const entry of built.entries) {
        await client.query(
          `INSERT INTO package_entries (package_id, job_id, artifact_id, archive_path)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [current.package_id, entry.jobId, entry.artifactId, entry.archivePath],
        );
      }

      await transitionPackage(client, current.package_id, Status.PACKAGING, Status.READY, {
        entryCount: built.entries.length,
        sizeBytes: built.sizeBytes,
        objectKey: built.objectKey,
        expiresAt,
        errorCode: '',
      });
    });
  } catch (err) {
    const code = err.code || 'PACKAGE_FAILED';
    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM packages WHERE package_id = $1 FOR UPDATE`,
        [pkg.package_id],
      );
      if (rows[0]?.status === Status.PACKAGING) {
        await transitionPackage(client, pkg.package_id, Status.PACKAGING, Status.FAILED, {
          errorCode: code,
        });
      }
    });
  } finally {
    clearInterval(heartbeatTimer);
    await withTransaction(async (client) => {
      await releaseLease(client, leaseKey, config.workerId);
    });
  }
}

async function claimOnePackage() {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM packages WHERE status = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [Status.QUEUED],
    );
    const pkg = rows[0];
    if (!pkg) return null;

    const leaseKey = `package:${pkg.package_id}`;
    const lease = await acquireLease(client, {
      leaseKey,
      ownerId: config.workerId,
      jobId: null,
      leaseType: 'package',
    });
    if (!lease || lease.owner_id !== config.workerId) return null;

    const tr = await transitionPackage(client, pkg.package_id, Status.QUEUED, Status.PACKAGING, {});
    if (!tr.ok) {
      await releaseLease(client, leaseKey, config.workerId);
      return null;
    }

    return tr.pkg;
  });
}

export async function runPackageWorker(signal) {
  console.log(`[package-worker] starting as ${config.workerId}`);
  while (!signal?.aborted) {
    try {
      const pkg = await claimOnePackage();
      if (pkg) {
        await processPackage(pkg);
      } else {
        await new Promise((r) => setTimeout(r, config.workerPollMs));
      }
    } catch (err) {
      console.error('[package-worker] loop error', err);
      await new Promise((r) => setTimeout(r, config.workerPollMs));
    }
  }
}

export { processPackage };
