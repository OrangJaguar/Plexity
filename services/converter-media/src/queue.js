import { config } from './config.js';
import { query, withTransaction } from './db.js';

/**
 * Durable worker leases with owner, expiry, heartbeat, and reclaim.
 */
export async function acquireLease(client, { leaseKey, ownerId, jobId, leaseType, ttlMs = config.leaseTtlMs }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  await client.query(
    `DELETE FROM worker_leases WHERE lease_key = $1 AND expires_at < NOW()`,
    [leaseKey],
  );

  const insert = await client.query(
    `INSERT INTO worker_leases (lease_key, owner_id, job_id, lease_type, expires_at, heartbeat_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (lease_key) DO NOTHING
     RETURNING *`,
    [leaseKey, ownerId, jobId, leaseType, expiresAt],
  );

  if (insert.rows[0]) return insert.rows[0];

  const reclaim = await client.query(
    `UPDATE worker_leases
     SET owner_id = $2, job_id = $3, expires_at = $4, heartbeat_at = NOW()
     WHERE lease_key = $1 AND expires_at < NOW()
     RETURNING *`,
    [leaseKey, ownerId, jobId, expiresAt],
  );
  return reclaim.rows[0] || null;
}

export async function heartbeatLease(client, leaseKey, ownerId, ttlMs = config.leaseTtlMs) {
  const expiresAt = new Date(Date.now() + ttlMs);
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `UPDATE worker_leases
     SET expires_at = $3, heartbeat_at = NOW()
     WHERE lease_key = $1 AND owner_id = $2
     RETURNING *`,
    [leaseKey, ownerId, expiresAt],
  );
  return rows[0] || null;
}

export async function releaseLease(client, leaseKey, ownerId) {
  await client.query(
    `DELETE FROM worker_leases WHERE lease_key = $1 AND owner_id = $2`,
    [leaseKey, ownerId],
  );
}

export async function reclaimExpiredLeases(client) {
  const { rows } = await client.query(
    `DELETE FROM worker_leases WHERE expires_at < NOW() RETURNING *`,
  );
  return rows;
}

export async function claimNextJob(client, { leaseType, ownerId, fromStatus, toStatus, onClaim }) {
  const { rows } = await client.query(
    `SELECT * FROM jobs WHERE status = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
    [fromStatus],
  );
  const job = rows[0];
  if (!job) return null;

  const leaseKey = `${leaseType}:${job.job_id}`;
  const lease = await acquireLease(client, {
    leaseKey,
    ownerId,
    jobId: job.job_id,
    leaseType,
  });
  if (!lease || lease.owner_id !== ownerId) return null;

  const result = await onClaim(client, job);
  if (!result?.ok) {
    await releaseLease(client, leaseKey, ownerId);
    return null;
  }

  return { job: result.job || job, leaseKey };
}