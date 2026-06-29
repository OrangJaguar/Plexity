import { describe, expect, it } from 'vitest';
import { parseSlashCommand, parseCommandLocally } from '@/lib/tools/command-parser';

describe('command-parser slash', () => {
  it('parseSlashCommand attaches commandId', () => {
    const out = parseSlashCommand('/ask how many events today');
    expect(out.commandId).toBe('ask');
    expect(out.intent).toBe('query');
  });

  it('parseCommandLocally still handles free text', () => {
    const out = parseCommandLocally('how many events today');
    expect(out.intent).toBe('query');
    expect(out.confidence).toBe('high');
  });

  it('parseSlashCommand parses task remainder', () => {
    const out = parseSlashCommand('/task chemistry homework Friday');
    expect(out.commandId).toBe('task');
    expect(out.intent).toBe('create_task');
  });
});
