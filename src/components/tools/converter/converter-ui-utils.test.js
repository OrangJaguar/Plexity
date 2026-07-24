import { describe, expect, it } from 'vitest';
import {
  allJobsSelected,
  escapePreviewText,
  formatDimensions,
  formatDuration,
  getOperationLabel,
  partitionJobsByCompletion,
  someJobsSelected,
} from '@/components/tools/converter/converter-ui-utils';
import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';

describe('converter ui utils', () => {
  it('humanizes operation labels', () => {
    expect(getOperationLabel('png-to-jpeg')).toBe('PNG to JPEG');
    expect(getOperationLabel('csv-to-json')).toBe('CSV to JSON');
  });

  it('escapes preview text for safe rendering', () => {
    expect(escapePreviewText('<script>&"\'</script>')).toBe(
      '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;',
    );
  });

  it('formats dimensions and duration', () => {
    expect(formatDimensions(1920, 1080)).toBe('1920×1080px');
    expect(formatDuration(125)).toBe('2m 05s');
  });

  it('partitions completed jobs from queue jobs', () => {
    const jobs = [
      { id: 'a', status: JOB_STATUS.COMPLETED, output: { fileName: 'a.png' } },
      { id: 'b', status: JOB_STATUS.WAITING, output: null },
    ];
    const { queue, completed } = partitionJobsByCompletion(/** @type {any} */ (jobs));
    expect(queue).toHaveLength(1);
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe('a');
  });

  it('tracks selection helpers', () => {
    const jobs = [{ id: 'a' }, { id: 'b' }];
    const selected = new Set(['a']);
    expect(allJobsSelected(selected, /** @type {any} */ (jobs))).toBe(false);
    expect(someJobsSelected(selected, /** @type {any} */ (jobs))).toBe(true);
    expect(allJobsSelected(new Set(['a', 'b']), /** @type {any} */ (jobs))).toBe(true);
  });
});
