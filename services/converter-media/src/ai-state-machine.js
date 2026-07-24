/** Plan 7 AI job CAS transitions (mirrors client-side AI status projections). */

import { Status } from './state-machine.js';

export const AiKind = {
  OCR: 'ocr',
  TRANSCRIBE: 'transcribe',
  TRANSLATE: 'translate',
  ASSIST: 'assist',
};

const AI_TRANSITIONS = {
  [Status.QUEUED]: new Set([Status.PROCESSING, Status.CANCELLED, Status.FAILED]),
  [Status.PROCESSING]: new Set([Status.READY, Status.FAILED, Status.CANCELLED]),
  [Status.READY]: new Set([]),
  [Status.FAILED]: new Set([Status.QUEUED]),
  [Status.CANCELLED]: new Set([]),
};

export function canTransitionAi(from, to) {
  return Boolean(AI_TRANSITIONS[from]?.has(to));
}

export function isAiTerminal(status) {
  return status === Status.READY || status === Status.FAILED || status === Status.CANCELLED;
}

export function isAiActive(status) {
  return status === Status.QUEUED || status === Status.PROCESSING;
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
  if (patch.objectKeyOut !== undefined) {
    fields.push(`object_key_out = $${idx++}`);
    values.push(patch.objectKeyOut);
  }
  if (patch.objectKeyIn !== undefined) {
    fields.push(`object_key_in = $${idx++}`);
    values.push(patch.objectKeyIn);
  }
  if (patch.provider !== undefined) {
    fields.push(`provider = $${idx++}`);
    values.push(patch.provider);
  }
  if (patch.model !== undefined) {
    fields.push(`model = $${idx++}`);
    values.push(patch.model);
  }
  if (patch.cancelRequested !== undefined) {
    fields.push(`cancel_requested = $${idx++}`);
    values.push(patch.cancelRequested);
  }
  if (patch.expiresAt !== undefined) {
    fields.push(`expires_at = $${idx++}`);
    values.push(patch.expiresAt);
  }
  return idx;
}

export async function transitionAiJob(client, aiJobId, fromStatus, toStatus, patch = {}) {
  if (!canTransitionAi(fromStatus, toStatus)) {
    return { ok: false, code: 'INVALID_TRANSITION' };
  }

  const fields = [`status = $1`];
  const values = [toStatus];
  let idx = 2;

  if (patch.progressPhase === undefined) {
    fields.push(`progress_phase = $${idx++}`);
    values.push(toStatus);
  }
  idx = buildPatchFields(patch, fields, values, idx);

  fields.push('updated_at = NOW()');
  values.push(aiJobId, fromStatus);

  const { rows } = await client.query(
    `UPDATE ai_jobs SET ${fields.join(', ')}
     WHERE id = $${idx++} AND status = $${idx}
     RETURNING *`,
    values,
  );
  if (!rows[0]) return { ok: false, code: 'CAS_CONFLICT' };
  return { ok: true, job: rows[0] };
}
