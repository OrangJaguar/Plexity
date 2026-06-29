import { describe, expect, it } from 'vitest';
import { resolvePageContext, getPlaceholderForPage } from '@/lib/tools/command-page-context';

describe('resolvePageContext', () => {
  it('maps flat tool routes to page ids', () => {
    expect(resolvePageContext('/calendar').pageId).toBe('calendar');
    expect(resolvePageContext('/tasks').pageId).toBe('tasks');
    expect(resolvePageContext('/focus').pageId).toBe('focus');
    expect(resolvePageContext('/dashboard').pageId).toBe('dashboard');
    expect(resolvePageContext('/pdf').pageId).toBe('pdftools');
    expect(resolvePageContext('/stocks/screener').pageId).toBe('stocks');
  });

  it('maps legacy /tools/* paths to page ids', () => {
    expect(resolvePageContext('/tools/calendar').pageId).toBe('calendar');
    expect(resolvePageContext('/tools/tasks').pageId).toBe('tasks');
    expect(resolvePageContext('/tools/pdf').pageId).toBe('pdftools');
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
