/**
 * Connector contract for provider-neutral source acquisition metadata.
 * Actual byte retrieval is performed by fetch-worker via SSRF-safe HTTP or yt-dlp.
 */

export function createConnectorResult({ provider, resolvedUrl, metadata = {} }) {
  return { provider, resolvedUrl, metadata };
}

/**
 * @typedef {object} DiscoveryItem
 * @property {string} providerItemId
 * @property {string} title
 * @property {number} [durationSeconds]
 * @property {string} sourceUrl
 */

/**
 * @typedef {object} DiscoverResult
 * @property {DiscoveryItem[]} items
 * @property {boolean} truncated
 */

export function createDiscoverResult({ items = [], truncated = false } = {}) {
  return { items, truncated: Boolean(truncated) };
}

export function assertConnector(contract) {
  if (!contract || typeof contract.resolve !== 'function') {
    throw new Error('Invalid connector: resolve() required');
  }
  return contract;
}

export function assertDiscoverConnector(contract) {
  assertConnector(contract);
  if (typeof contract.discover !== 'function') {
    throw new Error('Invalid connector: discover() required');
  }
  return contract;
}
