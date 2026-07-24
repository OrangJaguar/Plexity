import {
  createMockAiProvider,
  createProviderRouter,
} from './provider-interface.js';
import { createOpenAiCompatibleProvider } from './openai-compatible-provider.js';
import { createAnthropicProvider } from './anthropic-provider.js';
import { AI_PROVIDERS } from './ai-quotas.js';

/**
 * Build primary + single fallback router. ENABLE_AI_PROVIDER kill switch
 * must be true for real calls (mirrored server-side).
 * @param {{
 *   enabled?: boolean,
 *   openaiApiKey?: string,
 *   anthropicApiKey?: string,
 *   preferMock?: boolean,
 * }} [opts]
 */
export function createDefaultAiProviderRouter(opts = {}) {
  const enabled = opts.enabled !== false;
  if (opts.preferMock || (!opts.openaiApiKey && !opts.anthropicApiKey)) {
    const mock = createMockAiProvider();
    return createProviderRouter({
      enabled,
      primary: mock,
      fallback: null,
    });
  }
  const primary = createOpenAiCompatibleProvider({ apiKey: opts.openaiApiKey });
  const fallback = opts.anthropicApiKey
    ? createAnthropicProvider({ apiKey: opts.anthropicApiKey })
    : null;
  return createProviderRouter({ enabled, primary, fallback });
}

export { createMockAiProvider, createProviderRouter, AI_PROVIDERS };
