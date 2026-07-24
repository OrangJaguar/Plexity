/** CAS state transitions aligned with remote admin projections (Plan 5 + 6). */

export const Status = {
  DISCOVERING: 'discovering',
  DISCOVERED: 'discovered',
  PAUSED: 'paused',
  PACKAGING: 'packaging',
  QUEUED: 'queued',
  FETCHING: 'fetching',
  FETCHED: 'fetched',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/** @deprecated use Status — kept for Plan 5 call sites */
export const JobStatus = {
  QUEUED: Status.QUEUED,
  FETCHING: Status.FETCHING,
  FETCHED: Status.FETCHED,
  PROCESSING: Status.PROCESSING,
  READY: Status.READY,
  FAILED: Status.FAILED,
  CANCELLED: Status.CANCELLED,
  PAUSED: Status.PAUSED,
};

const JOB_TRANSITIONS = {
  [Status.QUEUED]: new Set([Status.FETCHING, Status.CANCELLED, Status.FAILED, Status.PAUSED]),
  [Status.FETCHING]: new Set([Status.FETCHED, Status.FAILED, Status.CANCELLED]),
  [Status.FETCHED]: new Set([Status.PROCESSING, Status.FAILED, Status.CANCELLED]),
  [Status.PROCESSING]: new Set([Status.READY, Status.FAILED, Status.CANCELLED]),
  [Status.READY]: new Set([]),
  [Status.FAILED]: new Set([Status.QUEUED]),
  [Status.CANCELLED]: new Set([Status.QUEUED]),
  [Status.PAUSED]: new Set([Status.QUEUED, Status.CANCELLED]),
};

const DISCOVERY_TRANSITIONS = {
  [Status.DISCOVERING]: new Set([Status.DISCOVERED, Status.FAILED, Status.CANCELLED]),
  [Status.DISCOVERED]: new Set([Status.CANCELLED]),
  [Status.FAILED]: new Set([]),
  [Status.CANCELLED]: new Set([]),
};

const PACKAGE_TRANSITIONS = {
  [Status.QUEUED]: new Set([Status.PACKAGING, Status.CANCELLED, Status.FAILED]),
  [Status.PACKAGING]: new Set([Status.READY, Status.FAILED, Status.CANCELLED]),
  [Status.READY]: new Set([]),
  [Status.FAILED]: new Set([Status.QUEUED]),
  [Status.CANCELLED]: new Set([]),
};

const BATCH_TRANSITIONS = {
  discovering: new Set(['discovered', 'processing', Status.FAILED, Status.CANCELLED]),
  discovered: new Set(['processing', Status.CANCELLED]),
  processing: new Set([Status.PAUSED, Status.FAILED, Status.CANCELLED, 'completed']),
  [Status.PAUSED]: new Set(['processing', Status.CANCELLED]),
  completed: new Set([]),
  [Status.FAILED]: new Set([]),
  [Status.CANCELLED]: new Set([]),
};

const TRANSITION_MAP = {
  job: JOB_TRANSITIONS,
  discovery: DISCOVERY_TRANSITIONS,
  package: PACKAGE_TRANSITIONS,
  batch: BATCH_TRANSITIONS,
};

export function canTransition(from, to, entity = 'job') {
  const allowed = TRANSITION_MAP[entity]?.[from];
  return Boolean(allowed?.has(to));
}

function buildPatchFields(patch, fields, values, startIdx) {
  let idx = startIdx;
  if (patch.progressPhase !== undefined) {
    fields.push(`progress_phase = $${idx++}`);
    values.push(patch.progressPhase);
  }
  if (patch.progressFraction !== undefined) {
    fields.push(`progress_fraction = $${idx++}`);
    values.push(patch.progressFraction);
  }
  if (patch.errorCode !== undefined) {
    fields.push(`error_code = $${idx++}`);
    values.push(patch.errorCode);
  }
  if (patch.attemptId !== undefined) {
    fields.push(`attempt_id = $${idx++}`);
    values.push(patch.attemptId);
  }
  if (patch.inputBytes !== undefined) {
    fields.push(`input_bytes = $${idx++}`);
    values.push(patch.inputBytes);
  }
  if (patch.outputBytes !== undefined) {
    fields.push(`output_bytes = $${idx++}`);
    values.push(patch.outputBytes);
  }
  if (patch.durationMs !== undefined) {
    fields.push(`duration_ms = $${idx++}`);
    values.push(patch.durationMs);
  }
  if (patch.inputArtifactKey !== undefined) {
    fields.push(`input_artifact_key = $${idx++}`);
    values.push(patch.inputArtifactKey);
  }
  if (patch.outputArtifactKey !== undefined) {
    fields.push(`output_artifact_key = $${idx++}`);
    values.push(patch.outputArtifactKey);
  }
  if (patch.expiresAt !== undefined) {
    fields.push(`expires_at = $${idx++}`);
    values.push(patch.expiresAt);
  }
  if (patch.completedAt !== undefined) {
    fields.push(`completed_at = $${idx++}`);
    values.push(patch.completedAt);
  }
  if (patch.discoveryItemId !== undefined) {
    fields.push(`discovery_item_id = $${idx++}`);
    values.push(patch.discoveryItemId);
  }
  if (patch.playlistIndex !== undefined) {
    fields.push(`playlist_index = $${idx++}`);
    values.push(patch.playlistIndex);
  }
  return idx;
}

/**
 * Compare-and-swap job transition. Returns updated row or null if version mismatch / illegal transition.
 */
export async function transitionJob(client, jobId, expectedVersion, fromStatus, toStatus, patch = {}) {
  if (!canTransition(fromStatus, toStatus, 'job')) {
    return { ok: false, code: 'INVALID_TRANSITION' };
  }

  const fields = [];
  const values = [];
  let idx = 1;

  fields.push(`status = $${idx++}`);
  values.push(toStatus);
  if (patch.progressPhase === undefined) {
    fields.push(`progress_phase = $${idx++}`);
    values.push(toStatus);
  }
  idx = buildPatchFields(patch, fields, values, idx);

  fields.push(`state_version = state_version + 1`);
  fields.push(`updated_at = NOW()`);

  values.push(jobId, expectedVersion, fromStatus);

  const sql = `
    UPDATE jobs SET ${fields.join(', ')}
    WHERE job_id = $${idx++} AND state_version = $${idx++} AND status = $${idx}
    RETURNING *
  `;

  const { rows } = await client.query(sql, values);
  if (!rows[0]) {
    return { ok: false, code: 'CAS_CONFLICT' };
  }
  return { ok: true, job: rows[0] };
}

export async function transitionDiscovery(client, discoveryId, fromStatus, toStatus, patch = {}) {
  if (!canTransition(fromStatus, toStatus, 'discovery')) {
    return { ok: false, code: 'INVALID_TRANSITION' };
  }

  const fields = [`status = $1`, `updated_at = NOW()`];
  const values = [toStatus];
  let idx = 2;

  if (patch.itemCount !== undefined) {
    fields.push(`item_count = $${idx++}`);
    values.push(patch.itemCount);
  }
  if (patch.errorCode !== undefined) {
    fields.push(`error_code = $${idx++}`);
    values.push(patch.errorCode);
  }
  if (patch.cancelRequested !== undefined) {
    fields.push(`cancel_requested = $${idx++}`);
    values.push(patch.cancelRequested);
  }

  values.push(discoveryId, fromStatus);

  const { rows } = await client.query(
    `UPDATE discoveries SET ${fields.join(', ')}
     WHERE discovery_id = $${idx++} AND status = $${idx}
     RETURNING *`,
    values,
  );
  if (!rows[0]) return { ok: false, code: 'CAS_CONFLICT' };
  return { ok: true, discovery: rows[0] };
}

export async function transitionPackage(client, packageId, fromStatus, toStatus, patch = {}) {
  if (!canTransition(fromStatus, toStatus, 'package')) {
    return { ok: false, code: 'INVALID_TRANSITION' };
  }

  const fields = [`status = $1`, `updated_at = NOW()`];
  const values = [toStatus];
  let idx = 2;

  if (patch.entryCount !== undefined) {
    fields.push(`entry_count = $${idx++}`);
    values.push(patch.entryCount);
  }
  if (patch.sizeBytes !== undefined) {
    fields.push(`size_bytes = $${idx++}`);
    values.push(patch.sizeBytes);
  }
  if (patch.objectKey !== undefined) {
    fields.push(`object_key = $${idx++}`);
    values.push(patch.objectKey);
  }
  if (patch.expiresAt !== undefined) {
    fields.push(`expires_at = $${idx++}`);
    values.push(patch.expiresAt);
  }
  if (patch.errorCode !== undefined) {
    fields.push(`error_code = $${idx++}`);
    values.push(patch.errorCode);
  }

  values.push(packageId, fromStatus);

  const { rows } = await client.query(
    `UPDATE packages SET ${fields.join(', ')}
     WHERE package_id = $${idx++} AND status = $${idx}
     RETURNING *`,
    values,
  );
  if (!rows[0]) return { ok: false, code: 'CAS_CONFLICT' };
  return { ok: true, pkg: rows[0] };
}

export async function transitionBatch(client, batchId, fromStatus, toStatus, patch = {}) {
  if (!canTransition(fromStatus, toStatus, 'batch')) {
    return { ok: false, code: 'INVALID_TRANSITION' };
  }

  const fields = [`status = $1`, `updated_at = NOW()`];
  const values = [toStatus];
  let idx = 2;

  if (patch.paused !== undefined) {
    fields.push(`paused = $${idx++}`);
    values.push(patch.paused);
  }
  if (patch.selectedCount !== undefined) {
    fields.push(`selected_count = $${idx++}`);
    values.push(patch.selectedCount);
  }
  if (patch.acceptedCount !== undefined) {
    fields.push(`accepted_count = $${idx++}`);
    values.push(patch.acceptedCount);
  }

  values.push(batchId, fromStatus);

  const { rows } = await client.query(
    `UPDATE batches SET ${fields.join(', ')}
     WHERE batch_id = $${idx++} AND status = $${idx}
     RETURNING *`,
    values,
  );
  if (!rows[0]) return { ok: false, code: 'CAS_CONFLICT' };
  return { ok: true, batch: rows[0] };
}

export function isTerminal(status) {
  return status === Status.READY || status === Status.FAILED || status === Status.CANCELLED
    || status === Status.DISCOVERED;
}

export function isActive(status) {
  return !isTerminal(status) && status !== Status.PAUSED;
}

export function isDiscoveryTerminal(status) {
  return status === Status.DISCOVERED || status === Status.FAILED || status === Status.CANCELLED;
}

export function isPackageTerminal(status) {
  return status === Status.READY || status === Status.FAILED || status === Status.CANCELLED;
}
