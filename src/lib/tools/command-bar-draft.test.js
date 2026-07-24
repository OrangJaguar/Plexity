import { describe, expect, it } from 'vitest';
import { buildCommandBarAction, buildCommandBarNavigation } from '@/lib/tools/command-bar-draft';

describe('command-bar-draft scoping', () => {
  it('builds public navigation by default', () => {
    const out = buildCommandBarNavigation({ intent: 'create_task', task: { title: 'Chem' } }, 'task');
    expect(out.route).toBe('/tasks');
  });

  it('scopes navigation under admin', () => {
    const out = buildCommandBarNavigation(
      { intent: 'create_events', events: [{ title: 'Meet', start: '2026-01-01T15:00' }] },
      'event',
      { basePath: '/admin' },
    );
    expect(out.route).toBe('/admin/calendar');
  });

  it('scopes action routes under admin', () => {
    const out = buildCommandBarAction(
      { actionId: 'openDebrief', route: '/dashboard', payload: {} },
      { basePath: '/admin' },
    );
    expect(out.route).toBe('/admin/dashboard');
  });
});
