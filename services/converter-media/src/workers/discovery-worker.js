import crypto from 'node:crypto';
import { config } from '../config.js';
import { withTransaction } from '../db.js';
import { discoverSource } from '../connectors/index.js';
import { encryptSourceUrl } from '../encryption.js';
import {
  adjustConcurrency,
  checkConcurrency,
  checkDiscoveryItemCap,
  ensureQuotaRow,
} from '../quotas.js';
import { acquireLease, heartbeatLease, releaseLease } from '../queue.js';
import { Status, transitionDiscovery } from '../state-machine.js';

function makeItemId() {
  return `ditem-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function durationBucket(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return 'unknown';
  if (seconds < 60) return 'lt1m';
  if (seconds < 600) return '1to10m';
  if (seconds < 3600) return '10to60m';
  return 'gt60m';
}

async function failDiscovery(client, discovery, errorCode) {
  await transitionDiscovery(client, discovery.discovery_id, discovery.status, Status.FAILED, {
    errorCode,
  });
  await adjustConcurrency(client, discovery.actor_id, 'discovery', -1);
}

async function processDiscovery(discovery) {
  const leaseKey = `discovery:${discovery.discovery_id}`;
  let heartbeatTimer;

  try {
    heartbeatTimer = setInterval(() => {
      heartbeatLease(undefined, leaseKey, config.workerId).catch(() => {});
    }, config.leaseHeartbeatMs);

    const result = await discoverSource(discovery.source_url, {
      maxItems: config.plan6.maxDiscoveryItems,
    });

    const capCheck = checkDiscoveryItemCap(result.items.length);
    if (!capCheck.ok) {
      throw Object.assign(new Error(capCheck.detail), { code: capCheck.code });
    }

    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM discoveries WHERE discovery_id = $1 FOR UPDATE`,
        [discovery.discovery_id],
      );
      const current = rows[0];
      if (!current || current.status !== Status.DISCOVERING) return;
      if (current.cancel_requested) {
        await transitionDiscovery(client, current.discovery_id, Status.DISCOVERING, Status.CANCELLED, {
          errorCode: 'CANCELLED',
        });
        await adjustConcurrency(client, current.actor_id, 'discovery', -1);
        return;
      }

      for (const item of result.items) {
        const itemId = makeItemId();
        await client.query(
          `INSERT INTO discovery_items (
            item_id, discovery_id, provider_item_id, redacted_title, duration_bucket,
            encrypted_source_url, selected, playlist_index, metadata_json
          ) VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7,$8)`,
          [
            itemId,
            current.discovery_id,
            item.providerItemId,
            item.title,
            item.durationBucket || durationBucket(item.durationSeconds),
            encryptSourceUrl(item.sourceUrl),
            item.playlistIndex ?? 0,
            JSON.stringify(item.metadata || {}),
          ],
        );
      }

      await transitionDiscovery(client, current.discovery_id, Status.DISCOVERING, Status.DISCOVERED, {
        itemCount: result.items.length,
        errorCode: result.truncated ? 'TRUNCATED' : '',
      });
      await adjustConcurrency(client, current.actor_id, 'discovery', -1);
    });
  } catch (err) {
    const code = err.code || 'DISCOVERY_FAILED';
    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM discoveries WHERE discovery_id = $1 FOR UPDATE`,
        [discovery.discovery_id],
      );
      if (rows[0]) await failDiscovery(client, rows[0], code);
    });
  } finally {
    clearInterval(heartbeatTimer);
    await withTransaction(async (client) => {
      await releaseLease(client, leaseKey, config.workerId);
    });
  }
}

async function claimOneDiscovery() {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM discoveries WHERE status = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [Status.DISCOVERING],
    );
    const discovery = rows[0];
    if (!discovery) return null;

    const q = await ensureQuotaRow(client, discovery.actor_id);
    const conc = checkConcurrency(q, 'discovery');
    if (!conc.ok) return null;

    const leaseKey = `discovery:${discovery.discovery_id}`;
    const lease = await acquireLease(client, {
      leaseKey,
      ownerId: config.workerId,
      jobId: null,
      leaseType: 'discovery',
    });
    if (!lease || lease.owner_id !== config.workerId) return null;

    await adjustConcurrency(client, discovery.actor_id, 'discovery', 1);
    return discovery;
  });
}

export async function runDiscoveryWorker(signal) {
  console.log(`[discovery-worker] starting as ${config.workerId}`);
  while (!signal?.aborted) {
    try {
      const discovery = await claimOneDiscovery();
      if (discovery) {
        await processDiscovery(discovery);
      } else {
        await new Promise((r) => setTimeout(r, config.workerPollMs));
      }
    } catch (err) {
      console.error('[discovery-worker] loop error', err);
      await new Promise((r) => setTimeout(r, config.workerPollMs));
    }
  }
}

export { processDiscovery };
