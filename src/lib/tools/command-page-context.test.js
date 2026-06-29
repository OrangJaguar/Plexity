import { describe, expect, it } from 'vitest';
import { resolvePageContext, getPlaceholderForPage } from '@/lib/tools/command-page-context';

describe('command-page-context', () => {
  it('maps tool routes to page ids', () => {
    expect(resolvePageContext('/tools/calendar').pageId).toBe('calendar');
    expect(resolvePageContext('/tools/tasks').pageId).toBe('tasks');
    expect(resolvePageContext('/tools/focus').pageId).toBe('focus');
    expect(resolvePageContext('/tools/dashboard').pageId).toBe('dashboard');
    expect(resolvePageContext('/tools/pdf').pageId).toBe('pdftools');
  });

  it('falls back to global', () => {
    expect(resolvePageContext('/unknown').pageId).toBe('global');
  });

  it('provides dynamic placeholders', () => {
    expect(getPlaceholderForPage('calendar')).toMatch(/Type \//);
    expect(getPlaceholderForPage('global')).toMatch(/Type \//);
  });
});
