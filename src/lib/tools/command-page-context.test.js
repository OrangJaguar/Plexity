import { describe, expect, it } from 'vitest';
import { resolvePageContext, getPlaceholderForPage } from '@/lib/tools/command-page-context';

describe('command-page-context', () => {
  it('maps tool routes to page ids', () => {
    expect(resolvePageContext('/tools/calendar').pageId).toBe('calendar');
    expect(resolvePageContext('/tools/tasks').pageId).toBe('tasks');
    expect(resolvePageContext('/tools/focus').pageId).toBe('focus');
    expect(resolvePageContext('/tools/dashboard').pageId).toBe('dashboard');
  });

  it('maps study routes', () => {
    expect(resolvePageContext('/home').pageId).toBe('study');
    expect(resolvePageContext('/study/foo').pageId).toBe('study');
  });

  it('falls back to global', () => {
    expect(resolvePageContext('/unknown').pageId).toBe('global');
  });

  it('provides dynamic placeholders', () => {
    expect(getPlaceholderForPage('calendar')).toMatch(/Type \//);
    expect(getPlaceholderForPage('global')).toMatch(/Type \//);
  });
});
