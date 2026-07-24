/**
 * Workspace-level ZIP packaging preferences.
 */

import { DEFAULT_PACKAGE_OPTIONS } from '../converter-package-model.js';

/** @typedef {import('../converter-package-model.js').PackageBuildOptions} PackageBuildOptions */

export const DEFAULT_WORKSPACE_PACKAGE_STATE = Object.freeze({
  ...DEFAULT_PACKAGE_OPTIONS,
});

/**
 * @param {Partial<PackageBuildOptions> | null | undefined} state
 * @returns {Readonly<PackageBuildOptions>}
 */
export function normalizeWorkspacePackageState(state) {
  const compressionPolicy = String(state?.compressionPolicy ?? DEFAULT_WORKSPACE_PACKAGE_STATE.compressionPolicy);
  return Object.freeze({
    preserveStructure: Boolean(
      state?.preserveStructure ?? DEFAULT_WORKSPACE_PACKAGE_STATE.preserveStructure,
    ),
    flatten: state?.flatten !== false,
    includeChecksumSidecar: Boolean(
      state?.includeChecksumSidecar ?? DEFAULT_WORKSPACE_PACKAGE_STATE.includeChecksumSidecar,
    ),
    includeReport: Boolean(state?.includeReport ?? DEFAULT_WORKSPACE_PACKAGE_STATE.includeReport),
    compressionPolicy: compressionPolicy === 'store' || compressionPolicy === 'deflate'
      ? compressionPolicy
      : 'auto',
  });
}

/**
 * @param {Partial<PackageBuildOptions>} workspaceState
 * @param {Partial<PackageBuildOptions>} [overrides]
 * @returns {Readonly<PackageBuildOptions>}
 */
export function buildPackageBuildOptions(workspaceState, overrides = {}) {
  const normalized = normalizeWorkspacePackageState({ ...workspaceState, ...overrides });
  return Object.freeze({
    ...normalized,
    flatten: !normalized.preserveStructure && normalized.flatten !== false,
  });
}

/**
 * @param {Partial<typeof DEFAULT_WORKSPACE_PACKAGE_STATE> | null | undefined} state
 * @returns {Readonly<import('../converter-package-model.js').PackageBuildOptions>}
 */
export function mapPackageOptionsFromState(state) {
  const normalized = normalizeWorkspacePackageState(state);
  return Object.freeze({
    preserveStructure: normalized.preserveStructure,
    flatten: !normalized.preserveStructure,
    includeChecksumSidecar: normalized.includeChecksumSidecar,
    includeReport: normalized.includeReport,
    compressionPolicy: normalized.compressionPolicy,
  });
}

/**
 * @param {Partial<PackageBuildOptions>} uiState
 * @returns {{ preserveStructure: boolean, selectedOnly: boolean, label: string }}
 */
export function resolvePackageOptions(uiState = {}) {
  const preserveStructure = uiState.preserveStructure !== false;
  return {
    preserveStructure,
    selectedOnly: false,
    label: preserveStructure ? 'Download ZIP (keep folders)' : 'Download ZIP',
  };
}
