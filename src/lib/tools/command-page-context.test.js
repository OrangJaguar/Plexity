import { describe, expect, it } from 'vitest';
import { resolvePageContext, getPlaceholderForPage } from '@/lib/tools/command-page-context';

describe('resolvePageContext', () => {
  it('maps flat tool routes to page ids', () => {
    expect(resolvePageContext('/calendar').pageId).toBe('calendar');
    expect(resolvePageContext('/tasks').pageId).toBe('tasks');
    expect(resolvePageContext('/focus').pageId).toBe('focus');
    expect(resolvePageContext('/dashboard').pageId).toBe('dashboard');
    expect(resolvePageContext('/pdf').pageId).toBe('pdftools');
    expect(resolvePageContext('/convert').pageId).toBe('converter');
    expect(resolvePageContext('/stocks/screener').pageId).toBe('stocks');
  });

  it('maps legacy /tools/* paths to page ids', () => {
    expect(resolvePageContext('/tools/calendar').pageId).toBe('calendar');
    expect(resolvePageContext('/tools/tasks').pageId).toBe('tasks');
    expect(resolvePageContext('/tools/pdf').pageId).toBe('pdftools');
  });

  it('maps admin mirrored paths to the same page ids', () => {
    expect(resolvePageContext('/admin/calendar').pageId).toBe('calendar');
    expect(resolvePageContext('/admin/tasks').pageId).toBe('tasks');
    expect(resolvePageContext('/admin/stocks/screener').pageId).toBe('stocks');
    expect(resolvePageContext('/admin/pdf').pageId).toBe('pdftools');
    expect(resolvePageContext('/admin/convert').pageId).toBe('converter');
    expect(resolvePageContext('/admin/catalog').pageId).toBe('catalog');
    expect(resolvePageContext('/admin/settings').pageId).toBe('settings');
  });

  it('does not treat admin feedback as a tool page', () => {
    expect(resolvePageContext('/admin/feedback').pageId).toBe('global');
  });

  it('returns global for unknown paths', () => {
    expect(resolvePageContext('/signin').pageId).toBe('global');
  });
});

describe('getPlaceholderForPage', () => {
  it('returns page-specific placeholders', () => {
    expect(getPlaceholderForPage('calendar')).toContain('week');
    expect(getPlaceholderForPage('unknown')).toContain('schedule');
  });
});
