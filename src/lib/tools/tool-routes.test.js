import { describe, expect, it } from 'vitest';
import {
  assertToolPageManifestParity,
  EXPECTED_TOOL_COUNT,
  TOOL_PAGE_META,
  WILDCARD_TOOL_IDS,
} from '@/lib/tools/tool-page-meta';
import { TOOL_REGISTRY } from '@/lib/tools/registry';
import {
  TOOLS_HOME,
  isToolsRoute,
  legacyToolsPathToCanonical,
  normalizeToolPathname,
  stocksRoute,
  stocksSymbolRoute,
  getToolRoute,
  getCatalogRoute,
  getSettingsRoute,
  getPdfRoute,
  getToolsHome,
  surfaceFromPathname,
  stripAdminPrefix,
  withSurfacePath,
} from '@/lib/tools/tool-routes';

describe('legacyToolsPathToCanonical', () => {
  it('maps top-level legacy paths', () => {
    expect(legacyToolsPathToCanonical('/tools/dashboard')).toBe('/dashboard');
    expect(legacyToolsPathToCanonical('/tools')).toBe(TOOLS_HOME);
    expect(legacyToolsPathToCanonical('/tools/')).toBe(TOOLS_HOME);
  });

  it('maps nested stocks legacy paths', () => {
    expect(legacyToolsPathToCanonical('/tools/stocks/symbol/MSFT')).toBe('/stocks/symbol/MSFT');
    expect(legacyToolsPathToCanonical('/tools/stocks/watchlist')).toBe('/stocks/watchlist');
  });

  it('maps pdftools alias to /pdf', () => {
    expect(legacyToolsPathToCanonical('/tools/pdftools')).toBe('/pdf');
    expect(legacyToolsPathToCanonical('/tools/pdftools/merge')).toBe('/pdf/merge');
    expect(legacyToolsPathToCanonical('/tools/pdf')).toBe('/pdf');
  });

  it('passes through canonical paths unchanged', () => {
    expect(legacyToolsPathToCanonical('/calendar')).toBe('/calendar');
    expect(normalizeToolPathname('/tasks')).toBe('/tasks');
  });
});

describe('admin path normalization', () => {
  it('strips admin prefix for mirrored tools', () => {
    expect(stripAdminPrefix('/admin/tasks')).toBe('/tasks');
    expect(stripAdminPrefix('/admin/stocks/watchlist')).toBe('/stocks/watchlist');
    expect(normalizeToolPathname('/admin/calendar')).toBe('/calendar');
    expect(normalizeToolPathname('/admin/pdf/merge')).toBe('/pdf/merge');
  });

  it('does not treat feedback as a mirrored tool path', () => {
    expect(stripAdminPrefix('/admin/feedback')).toBe('/admin/feedback');
    expect(isToolsRoute('/admin/feedback')).toBe(false);
    expect(surfaceFromPathname('/admin/feedback')).toBe('public');
  });

  it('detects admin tool surface', () => {
    expect(surfaceFromPathname('/admin/dashboard')).toBe('admin');
    expect(surfaceFromPathname('/dashboard')).toBe('public');
  });
});

describe('isToolsRoute', () => {
  it('recognizes flat tool routes', () => {
    expect(isToolsRoute('/calendar')).toBe(true);
    expect(isToolsRoute('/stocks/screener')).toBe(true);
    expect(isToolsRoute('/pdf')).toBe(true);
    expect(isToolsRoute('/convert')).toBe(true);
  });

  it('recognizes admin mirrored tool routes', () => {
    expect(isToolsRoute('/admin/calendar')).toBe(true);
    expect(isToolsRoute('/admin/stocks/screener')).toBe(true);
    expect(isToolsRoute('/admin/catalog')).toBe(true);
    expect(isToolsRoute('/admin/settings')).toBe(true);
  });

  it('excludes marketing routes', () => {
    expect(isToolsRoute('/')).toBe(false);
    expect(isToolsRoute('/signin')).toBe(false);
  });

  it('recognizes legacy paths before redirect', () => {
    expect(isToolsRoute('/tools/dashboard')).toBe(true);
    expect(isToolsRoute('/tools/stocks/watchlist')).toBe(true);
  });
});

describe('scoped route helpers', () => {
  it('preserves public outputs when no scope is supplied', () => {
    expect(stocksRoute()).toBe('/stocks');
    expect(stocksRoute('watchlist')).toBe('/stocks/watchlist');
    expect(stocksSymbolRoute('AAPL')).toBe('/stocks/symbol/AAPL');
    expect(stocksSymbolRoute('AAPL', { tab: 'analysis' })).toBe('/stocks/symbol/AAPL?tab=analysis');
    expect(getToolRoute('tasks')).toBe('/tasks');
    expect(getCatalogRoute()).toBe('/catalog');
    expect(getSettingsRoute()).toBe('/settings');
    expect(getPdfRoute()).toBe('/pdf');
    expect(getToolsHome()).toBe('/dashboard');
  });

  it('prefixes admin base path', () => {
    const opts = { surface: 'admin' };
    expect(getToolRoute('tasks', opts)).toBe('/admin/tasks');
    expect(getCatalogRoute(opts)).toBe('/admin/catalog');
    expect(getSettingsRoute({ ...opts, search: 'setup=schedule' })).toBe('/admin/settings?setup=schedule');
    expect(getPdfRoute(opts)).toBe('/admin/pdf');
    expect(stocksRoute('watchlist', opts)).toBe('/admin/stocks/watchlist');
    expect(stocksSymbolRoute('AAPL', { ...opts, tab: 'news' })).toBe('/admin/stocks/symbol/AAPL?tab=news');
    expect(withSurfacePath('/goals', { basePath: '/admin' })).toBe('/admin/goals');
  });

  it('builds paired routes for every registry tool', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(getToolRoute(tool.id)).toBe(tool.route);
      expect(getToolRoute(tool.id, { surface: 'admin' })).toBe(`/admin${tool.route}`);
    }
    expect(getToolRoute('converter')).toBe('/convert');
  });
});

describe('tool page manifest', () => {
  it('matches expected inventory', () => {
    expect(TOOL_PAGE_META).toHaveLength(EXPECTED_TOOL_COUNT);
    expect(TOOL_REGISTRY).toHaveLength(EXPECTED_TOOL_COUNT);
    expect(WILDCARD_TOOL_IDS).toEqual(['pdftools', 'stocks']);
  });

  it('stays in parity with TOOL_REGISTRY', () => {
    const parity = assertToolPageManifestParity();
    expect(parity).toEqual({
      ok: true,
      missingInPages: [],
      missingInRegistry: [],
      routeMismatches: [],
    });
  });

  it('marks pdf and stocks as wildcard routes', () => {
    for (const id of WILDCARD_TOOL_IDS) {
      expect(TOOL_PAGE_META.find((t) => t.id === id)?.wildcard).toBe(true);
    }
  });
});
