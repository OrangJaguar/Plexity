import { describe, expect, it } from 'vitest';
import { runCommandAssistant } from '@/lib/tools/command-executor';

describe('command-executor', () => {
  const ctx = {
    tasks: [{ taskId: 't1', title: 'Chem lab', completed: false }],
    events: [],
    schedule: {},
    pageContext: { pageId: 'tasks', route: '/tasks' },
  };

  it('routes slash /goto to navigate', async () => {
    const out = await runCommandAssistant('/goto calendar', ctx);
    expect(out.type).toBe('navigate');
    expect(out.route).toBe('/calendar');
  });

  it('routes slash /ask to local answer', async () => {
    const out = await runCommandAssistant('/ask what is due today', ctx);
    expect(out.type).toBe('answer');
    expect(out.answer).toBeTruthy();
  });

  it('routes slash /complete to action', async () => {
    const out = await runCommandAssistant('/complete chem', ctx);
    expect(out.type).toBe('action');
    expect(out.actionId).toBe('completeTask');
    expect(out.payload.taskId).toBe('t1');
  });

  it('handles free-text queries locally', async () => {
    const out = await runCommandAssistant('how many tasks due today', ctx);
    expect(out.type).toBe('answer');
    expect(out.source).toBe('local');
  });
});
