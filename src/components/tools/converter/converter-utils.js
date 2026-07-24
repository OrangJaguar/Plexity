/**
 * @param {number} bytes
 */
export function formatByteSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

/**
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} job
 */
export function jobProgressPercent(job) {
  if (job.status === 'completed') return 100;
  const fraction = job.progress?.fraction ?? 0;
  const phase = job.progress?.phase;
  if (job.status === 'analyzing' && job.analysis) return 100;
  if (phase === 'analyzing') return Math.round(fraction * 15);
  if (phase === 'processing') return Math.round(15 + fraction * 85);
  if (job.status === 'processing') return Math.round(fraction * 100);
  return 0;
}
