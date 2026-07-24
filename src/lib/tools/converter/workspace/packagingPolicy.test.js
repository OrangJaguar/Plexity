import { describe, expect, it } from 'vitest';
import {
  buildPackageBuildOptions,
  DEFAULT_WORKSPACE_PACKAGE_STATE,
  mapPackageOptionsFromState,
} from '@/lib/tools/converter/workspace/packagingPolicy.js';

describe('packagingPolicy', () => {
  it('maps workspace state to package build options', () => {
    const options = mapPackageOptionsFromState({
      preserveStructure: true,
      includeChecksumSidecar: true,
      includeReport: true,
    });
    expect(options.preserveStructure).toBe(true);
    expect(options.flatten).toBe(false);
    expect(options.includeChecksumSidecar).toBe(true);
    expect(options.includeReport).toBe(true);
  });

  it('defaults to flattened packaging', () => {
    expect(DEFAULT_WORKSPACE_PACKAGE_STATE.preserveStructure).toBe(false);
    const built = buildPackageBuildOptions({});
    expect(built.flatten).toBe(true);
  });
});
