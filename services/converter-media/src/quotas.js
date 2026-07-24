/** Hard quotas for admin converter URL processing (Plan 5 + 6). */

import { config } from './config.js';

export const QUOTAS = {
  maxUrlsPerSubmission: 10,
  maxInputBytes: 500 * 1024 * 1024,
  maxDurationMs: 2 * 60 * 60 * 1000,
  maxOutputBytes: 1024 * 1024 * 1024,
  maxConcurrentFetch: 2,
  maxConcurrentTranscode: 1,
  maxJobsPerDay: 20,
  maxBytesPerDay: 5 * 1024 * 1024 * 1024,

  // Plan 6
  maxDiscoveryItems: config.plan6.maxDiscoveryItems,
  maxSelectedItems: config.plan6.maxSelectedItems,
  maxConcurrentDiscoveries: config.plan6.maxConcurrentDiscoveries,
  packageHardCapBytes: config.plan6.packageHardCapBytes,
  packageWarnDesktopBytes: config.plan6.packageWarnDesktopBytes,
  packageWarnMobileBytes: config.plan6.packageWarnMobileBytes,

  // Plan 7
  maxRequestsPerAdminPerDay: config.plan7.maxRequestsPerAdminPerDay,
  maxConcurrentAiJobsPerAdmin: config.plan7.maxConcurrentAiJobsPerAdmin,
  maxOcrImageBytes: config.plan7.maxOcrImageBytes,
  maxSttAudioBytes: config.plan7.maxSttAudioBytes,
  maxSttVideoBytes: config.plan7.maxSttVideoBytes,
  maxPromptChars: config.plan7.maxPromptChars,
  maxCompletionChars: config.plan7.maxCompletionChars,
  aiTempRetentionMs: config.plan7.tempRetentionMs,
};

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function ensureQuotaRow(client, actorId) {
  const dayKey = todayKey();
  await client.query(
    `INSERT INTO quota_counters (actor_id, day_key)
     VALUES ($1, $2)
     ON CONFLICT (actor_id, day_key) DO NOTHING`,
    [actorId, dayKey],
  );
  const { rows } = await client.query(
    `SELECT * FROM quota_counters WHERE actor_id = $1 AND day_key = $2 FOR UPDATE`,
    [actorId, dayKey],
  );
  return rows[0];
}

export function checkDailyLimits(row, additionalJobs = 1, additionalBytes = 0) {
  if (row.job_count + additionalJobs > QUOTAS.maxJobsPerDay) {
    return { ok: false, code: 'QUOTA_EXCEEDED', detail: 'daily job limit' };
  }
  if (row.bytes_total + additionalBytes > QUOTAS.maxBytesPerDay) {
    return { ok: false, code: 'QUOTA_EXCEEDED', detail: 'daily bytes limit' };
  }
  return { ok: true };
}

export function checkConcurrency(row, kind) {
  if (kind === 'fetch' && row.fetch_active >= QUOTAS.maxConcurrentFetch) {
    return { ok: false, code: 'QUOTA_EXCEEDED', detail: 'fetch concurrency' };
  }
  if (kind === 'transcode' && row.transcode_active >= QUOTAS.maxConcurrentTranscode) {
    return { ok: false, code: 'QUOTA_EXCEEDED', detail: 'transcode concurrency' };
  }
  if (kind === 'discovery' && row.discovery_active >= QUOTAS.maxConcurrentDiscoveries) {
    return { ok: false, code: 'QUOTA_EXCEEDED', detail: 'discovery concurrency' };
  }
  if (kind === 'ai' && row.ai_active >= QUOTAS.maxConcurrentAiJobsPerAdmin) {
    return { ok: false, code: 'AI_BUDGET_EXCEEDED', detail: 'ai concurrency' };
  }
  return { ok: true };
}

export function checkAiDailyLimits(row, additionalRequests = 1) {
  if ((row.ai_requests_count || 0) + additionalRequests > QUOTAS.maxRequestsPerAdminPerDay) {
    return { ok: false, code: 'AI_BUDGET_EXCEEDED', detail: 'daily ai request limit' };
  }
  return { ok: true };
}

export function checkSelectionLimit(selectedCount) {
  if (selectedCount > QUOTAS.maxSelectedItems) {
    return { ok: false, code: 'QUOTA_EXCEEDED', detail: `max ${QUOTAS.maxSelectedItems} selected items` };
  }
  return { ok: true };
}

export function checkDiscoveryItemCap(itemCount) {
  if (itemCount > QUOTAS.maxDiscoveryItems) {
    return { ok: false, code: 'QUOTA_EXCEEDED', detail: `max ${QUOTAS.maxDiscoveryItems} discovery items` };
  }
  return { ok: true };
}

export function checkPackageSize(totalBytes) {
  if (totalBytes > QUOTAS.packageHardCapBytes) {
    return { ok: false, code: 'PACKAGE_TOO_LARGE', detail: 'package exceeds hard cap' };
  }
  return { ok: true };
}

export async function incrementDailyJobs(client, actorId, bytes = 0, jobCount = 1) {
  const dayKey = todayKey();
  await client.query(
    `INSERT INTO quota_counters (actor_id, day_key, job_count, bytes_total)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (actor_id, day_key)
     DO UPDATE SET job_count = quota_counters.job_count + EXCLUDED.job_count,
                   bytes_total = quota_counters.bytes_total + EXCLUDED.bytes_total,
                   updated_at = NOW()`,
    [actorId, dayKey, jobCount, bytes],
  );
}

export async function incrementDailyAiRequests(client, actorId, count = 1) {
  const dayKey = todayKey();
  await client.query(
    `INSERT INTO quota_counters (actor_id, day_key, ai_requests_count)
     VALUES ($1, $2, $3)
     ON CONFLICT (actor_id, day_key)
     DO UPDATE SET ai_requests_count = quota_counters.ai_requests_count + EXCLUDED.ai_requests_count,
                   updated_at = NOW()`,
    [actorId, dayKey, count],
  );
}

export async function adjustConcurrency(client, actorId, kind, delta) {
  const dayKey = todayKey();
  await ensureQuotaRow(client, actorId);
  const colMap = {
    fetch: 'fetch_active',
    transcode: 'transcode_active',
    discovery: 'discovery_active',
    ai: 'ai_active',
  };
  const col = colMap[kind];
  if (!col) return;
  await client.query(
    `UPDATE quota_counters SET ${col} = GREATEST(0, ${col} + $3), updated_at = NOW()
     WHERE actor_id = $1 AND day_key = $2`,
    [actorId, dayKey, delta],
  );
}
