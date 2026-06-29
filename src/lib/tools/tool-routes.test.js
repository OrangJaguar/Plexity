import { describe, expect, it } from 'vitest';
import {
  TOOLS_HOME,
  isToolsRoute,
  legacyToolsPathToCanonical,
  normalizeToolPathname,
  stocksRoute,
  stocksSymbolRoute,
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

describe('isToolsRoute', () => {
  it('recognizes flat tool routes', () => {
    expect(isToolsRoute('/calendar')).toBe(true);
    expect(isToolsRoute('/stocks/screener')).toBe(true);
    expect(isToolsRoute('/pdf')).toBe(true);
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

describe('stocksRoute helpers', () => {
  it('builds stocks paths', () => {
    expect(stocksRoute()).toBe('/stocks');
    expect(stocksRoute('watchlist')).toBe('/stocks/watchlist');
  });

  it('builds symbol routes with optional tab', () => {
    expect(stocksSymbolRoute('AAPL')).toBe('/stocks/symbol/AAPL');
    expect(stocksSymbolRoute('AAPL', { tab: 'analysis' })).toBe('/stocks/symbol/AAPL?tab=analysis');
  });
});
