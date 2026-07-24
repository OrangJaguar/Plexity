/**
 * Helpers for batch job selection in the converter workspace UI.
 */

/** @typedef {import('../converter-job-model.js').ConverterJob} ConverterJob */

/**
 * @param {ReadonlyArray<ConverterJob>} jobs
 * @param {ReadonlySet<string>} selectedJobIds
 * @returns {ConverterJob[]}
 */
export function getSelectedJobs(jobs, selectedJobIds) {
  if (!selectedJobIds.size) return [];
  return jobs.filter((job) => selectedJobIds.has(job.id));
}

/**
 * @param {ReadonlyArray<ConverterJob>} jobs
 * @param {ReadonlySet<string>} selectedJobIds
 * @returns {ConverterJob | null}
 */
export function getFirstAnalyzedSelectedJob(jobs, selectedJobIds) {
  const selected = getSelectedJobs(jobs, selectedJobIds);
  return selected.find((job) => job.analysis?.format) ?? null;
}

/**
 * @param {ReadonlyArray<ConverterJob>} jobs
 * @returns {ConverterJob | null}
 */
export function getFirstAnalyzedJob(jobs) {
  return jobs.find((job) => job.analysis?.format) ?? null;
}

/**
 * @param {ConverterJob} job
 * @returns {import('../source-analysis.js').SourceAnalysis | null}
 */
export function jobToSourceAnalysis(job) {
  if (!job?.analysis?.format && !job.source.detectedFormat) return null;
  const analysis = job.analysis ?? {};
  return {
    category: String(analysis.category ?? 'unknown'),
    format: String(analysis.format ?? job.source.detectedFormat ?? 'unknown').toLowerCase(),
    width: /** @type {number | null} */ (analysis.width ?? null),
    height: /** @type {number | null} */ (analysis.height ?? null),
    durationSec: /** @type {number | null} */ (analysis.durationSec ?? null),
    channels: /** @type {number | null} */ (analysis.channels ?? null),
    sampleRate: /** @type {number | null} */ (analysis.sampleRate ?? null),
    codec: analysis.codec != null ? String(analysis.codec) : null,
    container: analysis.container != null ? String(analysis.container) : null,
    tracks: Array.isArray(analysis.tracks) ? analysis.tracks : [],
    subtitleTracks: Array.isArray(analysis.subtitleTracks) ? analysis.subtitleTracks : [],
    rowCount: /** @type {number | null} */ (analysis.rowCount ?? null),
    columnCount: /** @type {number | null} */ (analysis.columnCount ?? null),
    hasAlpha: analysis.hasAlpha ?? null,
    animated: analysis.animated ?? null,
    hasGpsMetadata: analysis.hasGpsMetadata ?? null,
    hasMetadata: analysis.hasMetadata ?? null,
    colorProfile: analysis.colorProfile != null ? String(analysis.colorProfile) : null,
    corruptionSignals: Array.isArray(analysis.corruptionSignals) ? analysis.corruptionSignals : [],
    warnings: [
      ...(job.source.warnings ?? []),
      ...(Array.isArray(analysis.warnings) ? analysis.warnings : []),
    ],
  };
}

/**
 * @param {ReadonlyArray<ConverterJob>} jobs
 * @param {ReadonlySet<string>} selectedJobIds
 * @returns {ConverterJob[]}
 */
export function getMergeCandidateJobs(jobs, selectedJobIds) {
  return getSelectedJobs(jobs, selectedJobIds).filter(
    (job) => job.analysis?.category && ['audio', 'video', 'image'].includes(String(job.analysis.category)),
  );
}

/**
 * @param {ReadonlyArray<ConverterJob>} jobs
 * @param {ReadonlySet<string>} selectedJobIds
 * @returns {ConverterJob[]}
 */
export function getRecipeTargetJobs(jobs, selectedJobIds) {
  const targets = getSelectedJobs(jobs, selectedJobIds);
  if (targets.length) {
    return targets.filter((job) => job.status !== 'completed' && !job.removed);
  }
  return jobs.filter((job) => job.status !== 'completed' && !job.removed && job.analysis);
}
