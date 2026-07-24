import { validateUrlShape } from '../ssrf.js';
import { createConnectorResult } from './interface.js';

export const provider = 'direct-https';

export async function resolve(url) {
  const parsed = validateUrlShape(url);
  return createConnectorResult({
    provider,
    resolvedUrl: parsed.href,
    metadata: { host: parsed.hostname },
  });
}

export default { provider, resolve };
