/**
 * Immutable conversion plan snapshot for a job.
 */

/** @typedef {'one' | 'two' | 'auto'} PassStrategy */
/** @typedef {'preserve' | 'strip' | 'strip-gps'} MetadataPolicy */
/** @typedef {'none' | 'sha256'} ChecksumPolicy */

export const PLAN_SCHEMA_VERSION = 2;

const PASS_STRATEGIES = Object.freeze(['one', 'two', 'auto']);
const METADATA_POLICIES = Object.freeze(['preserve', 'strip', 'strip-gps']);
const CHECKSUM_POLICIES = Object.freeze(['none', 'sha256']);
const SPLIT_MODES = Object.freeze(['duration', 'size', 'count']);
const UNCERTAINTY_LEVELS = Object.freeze(['low', 'medium', 'high']);

/**
 * @typedef {object} SplitSpec
 * @property {'duration' | 'size' | 'count'} mode
 * @property {number} value
 */

/**
 * @typedef {object} OutputEstimate
 * @property {number | null} bytes
 * @property {'low' | 'medium' | 'high'} uncertainty
 */

/**
 * @typedef {object} ConversionPlan
 * @property {string} goalId
 * @property {string} operationId
 * @property {Readonly<Record<string, unknown>>} options
 * @property {string | null} engineHint
 * @property {ReadonlyArray<string>} warnings
 * @property {Readonly<Record<string, boolean>>} acknowledged
 * @property {number} snapshotAt
 * @property {number} schemaVersion
 * @property {string | null} recipeId
 * @property {string | null} compatibilityProfile
 * @property {number | null} targetBytes
 * @property {PassStrategy} passStrategy
 * @property {MetadataPolicy} metadataPolicy
 * @property {string | null} namingTemplate
 * @property {string | null} relativePath
 * @property {string | null} mergeGroupId
 * @property {Readonly<SplitSpec> | null} splitSpec
 * @property {Readonly<OutputEstimate> | null} estimate
 * @property {ChecksumPolicy} checksumPolicy
 */

/**
 * @param {object} params
 * @param {string} params.goalId
 * @param {string} params.operationId
 * @param {Record<string, unknown>} [params.options]
 * @param {string | null} [params.engineHint]
 * @param {ReadonlyArray<string>} [params.warnings]
 * @param {Record<string, boolean>} [params.acknowledged]
 * @param {number} [params.snapshotAt]
 * @param {string | null} [params.recipeId]
 * @param {string | null} [params.compatibilityProfile]
 * @param {number | null} [params.targetBytes]
 * @param {PassStrategy} [params.passStrategy]
 * @param {MetadataPolicy} [params.metadataPolicy]
 * @param {string | null} [params.namingTemplate]
 * @param {string | null} [params.relativePath]
 * @param {string | null} [params.mergeGroupId]
 * @param {SplitSpec | null} [params.splitSpec]
 * @param {OutputEstimate | null} [params.estimate]
 * @param {ChecksumPolicy} [params.checksumPolicy]
 * @returns {ConversionPlan}
 */
export function createConversionPlan(params) {
  return normalizeConversionPlan({
    goalId: params.goalId,
    operationId: params.operationId,
    options: params.options ?? {},
    engineHint: params.engineHint ?? null,
    warnings: params.warnings ?? [],
    acknowledged: params.acknowledged ?? {},
    snapshotAt: params.snapshotAt ?? Date.now(),
    recipeId: params.recipeId ?? null,
    compatibilityProfile: params.compatibilityProfile ?? null,
    targetBytes: params.targetBytes ?? null,
    passStrategy: params.passStrategy ?? 'auto',
    metadataPolicy: params.metadataPolicy ?? 'preserve',
    namingTemplate: params.namingTemplate ?? null,
    relativePath: params.relativePath ?? null,
    mergeGroupId: params.mergeGroupId ?? null,
    splitSpec: params.splitSpec ?? null,
    estimate: params.estimate ?? null,
    checksumPolicy: params.checksumPolicy ?? 'none',
  });
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function positiveNumberOrNull(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {unknown} spec
 * @returns {Readonly<SplitSpec> | null}
 */
function normalizeSplitSpec(spec) {
  if (!spec || typeof spec !== 'object') return null;
  const mode = SPLIT_MODES.includes(spec.mode) ? spec.mode : null;
  const value = positiveNumberOrNull(spec.value);
  if (!mode || value == null) return null;
  return Object.freeze({ mode, value });
}

/**
 * @param {unknown} estimate
 * @returns {Readonly<OutputEstimate> | null}
 */
function normalizeEstimate(estimate) {
  if (!estimate || typeof estimate !== 'object') return null;
  const bytes = estimate.bytes != null ? positiveNumberOrNull(estimate.bytes) : null;
  const uncertainty = UNCERTAINTY_LEVELS.includes(estimate.uncertainty) ? estimate.uncertainty : 'high';
  return Object.freeze({ bytes, uncertainty });
}

/**
 * @param {object | null | undefined} plan
 * @returns {ConversionPlan | null}
 */
export function normalizeConversionPlan(plan) {
  if (!plan) return null;

  const acknowledged = Object.freeze(
    Object.fromEntries(
      Object.entries(plan.acknowledged ?? {}).map(([k, v]) => [String(k), Boolean(v)]),
    ),
  );

  return Object.freeze({
    goalId: String(plan.goalId ?? ''),
    operationId: String(plan.operationId ?? ''),
    options: Object.freeze({ ...(plan.options ?? {}) }),
    engineHint: plan.engineHint != null ? String(plan.engineHint) : null,
    warnings: Object.freeze([...(plan.warnings ?? []).map(String)]),
    acknowledged,
    snapshotAt: Number(plan.snapshotAt ?? Date.now()),
    schemaVersion: PLAN_SCHEMA_VERSION,
    recipeId: plan.recipeId != null ? String(plan.recipeId) : null,
    compatibilityProfile: plan.compatibilityProfile != null ? String(plan.compatibilityProfile) : null,
    targetBytes: positiveNumberOrNull(plan.targetBytes),
    passStrategy: PASS_STRATEGIES.includes(plan.passStrategy) ? plan.passStrategy : 'auto',
    metadataPolicy: METADATA_POLICIES.includes(plan.metadataPolicy) ? plan.metadataPolicy : 'preserve',
    namingTemplate: plan.namingTemplate != null ? String(plan.namingTemplate) : null,
    relativePath: plan.relativePath != null ? String(plan.relativePath) : null,
    mergeGroupId: plan.mergeGroupId != null ? String(plan.mergeGroupId) : null,
    splitSpec: normalizeSplitSpec(plan.splitSpec),
    estimate: normalizeEstimate(plan.estimate),
    checksumPolicy: CHECKSUM_POLICIES.includes(plan.checksumPolicy) ? plan.checksumPolicy : 'none',
  });
}
