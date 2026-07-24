import { afterEach, describe, expect, it } from 'vitest';
import {
  resetTelemetrySink,
  setTelemetrySink,
  TELEMETRY_EVENTS,
  trackConverterEvent,
} from '@/lib/tools/converter/converter-telemetry.js';

describe('converter-telemetry', () => {
  afterEach(() => {
    resetTelemetrySink();
  });

  it('does not throw with the default no-op sink', () => {
    expect(() => trackConverterEvent(TELEMETRY_EVENTS.IMPORT, { category: 'image' })).not.toThrow();
  });

  it('forwards allowed props for known events', () => {
    const events = [];
    setTelemetrySink((name, props) => events.push({ name, props }));

    trackConverterEvent(TELEMETRY_EVENTS.CONVERT_COMPLETE, {
      category: 'image',
      outcome: 'success',
      engine: 'native',
      presetId: 'make-smaller',
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      name: 'convert_complete',
      props: { category: 'image', outcome: 'success', engine: 'native', presetId: 'make-smaller' },
    });
  });

  it('ignores unknown event names', () => {
    const events = [];
    setTelemetrySink((name, props) => events.push({ name, props }));

    trackConverterEvent('not_a_real_event', { category: 'image' });

    expect(events).toHaveLength(0);
  });

  it('strips forbidden props before reaching the sink', () => {
    const events = [];
    setTelemetrySink((name, props) => events.push({ name, props }));

    trackConverterEvent(TELEMETRY_EVENTS.CONVERT_FAIL, {
      statusCode: 'FILE_TOO_LARGE',
      fileName: 'vacation-photo.png',
      sourcePath: '/Users/me/vacation-photo.png',
      exactBytes: 12345,
    });

    expect(events).toHaveLength(1);
    expect(events[0].props).toEqual({ statusCode: 'FILE_TOO_LARGE' });
  });

  it('never throws even if the sink throws', () => {
    setTelemetrySink(() => {
      throw new Error('sink exploded');
    });

    expect(() => trackConverterEvent(TELEMETRY_EVENTS.RUNTIME_LOAD, { engine: 'ffmpeg' })).not.toThrow();
  });

  it('covers all documented event names', () => {
    expect(Object.values(TELEMETRY_EVENTS)).toEqual([
      'import',
      'convert_start',
      'convert_complete',
      'convert_fail',
      'package_start',
      'package_complete',
      'package_fail',
      'runtime_load',
      'preset_apply',
      'remote_import_validate',
      'remote_import_create',
      'remote_import_complete',
      'remote_import_fail',
      'remote_discovery_start',
      'remote_batch_confirm',
      'remote_package_create',
      'ai_assist_plan',
      'ai_ocr_run',
      'ai_transcribe_run',
      'ai_fail',
    ]);
  });
});
