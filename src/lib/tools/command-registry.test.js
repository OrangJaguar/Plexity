import { describe, expect, it } from 'vitest';
import {
  COMMAND_DEFINITIONS,
  filterCommands,
  getCommandById,
  getSuggestedCommands,
  parseSlashPrefix,
  executeSlashCommand,
  isSlashPickerOpen,
  validateSlashInput,
  handleSlashInputChange,
} from '@/lib/tools/command-registry';

describe('command-registry', () => {
  it('returns command by id', () => {
    expect(getCommandById('event')?.label).toBe('/event');
    expect(getCommandById('missing')).toBeNull();
  });

  it('filters suggestions by page', () => {
    const calendar = getSuggestedCommands('calendar').map((c) => c.id);
    expect(calendar).toContain('event');
    expect(calendar).toContain('today');
    expect(calendar).not.toContain('debrief');

    const dashboard = getSuggestedCommands('dashboard').map((c) => c.id);
    expect(dashboard).toContain('debrief');
    expect(dashboard).toContain('task');
  });

  it('filterCommands narrows by typed prefix on command id only', () => {
    const all = filterCommands('/', 'calendar');
    const narrowed = filterCommands('/to', 'calendar');
    expect(narrowed.length).toBeLessThan(all.length);
    expect(narrowed.every((c) => c.id.startsWith('to'))).toBe(true);
    expect(filterCommands('/event foo', 'calendar')).toEqual([]);
  });

  it('isSlashPickerOpen is true until command token is complete', () => {
    expect(isSlashPickerOpen('/')).toBe(true);
    expect(isSlashPickerOpen('/ev')).toBe(true);
    expect(isSlashPickerOpen('/event ')).toBe(false);
    expect(isSlashPickerOpen('hello')).toBe(false);
  });

  it('validateSlashInput rejects unknown commands', () => {
    expect(validateSlashInput('/nope').valid).toBe(false);
    expect(validateSlashInput('/event team sync').valid).toBe(true);
  });

  it('handleSlashInputChange confirms exact command on space', () => {
    const out = handleSlashInputChange('/event', '/event ');
    expect(out.input).toBe('/event ');
    expect(out.slashError).toBeNull();
    expect(out.slashHint).toBe('Title · day/time');
  });

  it('handleSlashInputChange rejects unknown token on space', () => {
    const out = handleSlashInputChange('/evnt', '/evnt ');
    expect(out.input).toBe('/evnt');
    expect(out.slashError).toContain('Unknown command');
  });

  it('handleSlashInputChange normalizes pasted full command', () => {
    const out = handleSlashInputChange('', '/event team sync');
    expect(out.input).toBe('/event team sync');
    expect(out.slashHint).toBe('Title · day/time');
  });

  it('parseSlashPrefix strips command and remainder', () => {
    const parsed = parseSlashPrefix('/event team sync Tue 3pm');
    expect(parsed.commandId).toBe('event');
    expect(parsed.remainder).toBe('team sync Tue 3pm');
  });

  it('parseSlashPrefix rejects unknown commands', () => {
    const parsed = parseSlashPrefix('/unknown foo');
    expect(parsed.commandId).toBeNull();
  });

  it('executeSlashCommand goto resolves tool route', () => {
    const out = executeSlashCommand('goto', 'calendar', { tasks: [], events: [] });
    expect(out?.type).toBe('navigate');
    expect(out?.route).toBe('/calendar');
  });

  it('every definition has required fields', () => {
    for (const cmd of COMMAND_DEFINITIONS) {
      expect(cmd.id).toBeTruthy();
      expect(cmd.alwaysAvailable).toBe(true);
      expect(Array.isArray(cmd.suggestOn)).toBe(true);
    }
  });
});
