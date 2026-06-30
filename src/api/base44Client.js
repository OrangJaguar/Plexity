import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Expose SDK internals to the browser console for debugging (dev only)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__plexitySDK = base44;
  console.groupCollapsed('%c[Plexity SDK] Available methods', 'color:#7f8aa5;font-weight:700;font-size:12px');
  try {
    const sections = { auth: base44.auth, entities: base44.entities, functions: base44.functions, integrations: base44.integrations, agents: base44.agents, connectors: base44.connectors };
    for (const [section, obj] of Object.entries(sections)) {
      if (!obj) continue;
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(obj) || obj).filter(k => typeof obj[k] === 'function' && k !== 'constructor');
      const ownMethods = Object.keys(obj).filter(k => typeof obj[k] === 'function');
      const all = [...new Set([...methods, ...ownMethods])];
      console.groupCollapsed(`%c base44.${section}`, 'color:#a1a1aa;font-weight:600');
      all.forEach(m => console.log(`  .${m}()`));
      if (all.length === 0) console.log('  (no enumerable methods found — see object below)');
      console.log(obj);
      console.groupEnd();
    }
    console.log('%cFull SDK object → window.__plexitySDK', 'color:#a1a1aa;font-style:italic');
    console.log('%cTip: try base44.auth methods e.g. window.__plexitySDK.auth', 'color:#a1a1aa;font-style:italic');
  } catch(e) {
    console.warn('Could not enumerate SDK methods:', e);
    console.log('Full SDK:', base44);
  }
  console.groupEnd();
}