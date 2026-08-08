import { describe, expect, it } from 'vitest';
import {
  matchBrawlerName,
  matchModeName,
  parseBrawlVoiceIntent,
} from '@/lib/tools/brawl/voice-intents';

const catalog = [
  { id: 16000000, name: 'Shelly' },
  { id: 16000002, name: 'Colt' },
  { id: 16000013, name: 'Piper' },
  { id: 16000045, name: 'Mr. P' },
];

describe('brawl voice intents', () => {
  it('fuzzy matches brawler names', () => {
    expect(matchBrawlerName(catalog, 'shelly')?.id).toBe(16000000);
    expect(matchBrawlerName(catalog, 'piper')?.name).toBe('Piper');
    expect(matchBrawlerName(catalog, 'mr p')?.name).toBe('Mr. P');
  });

  it('matches modes', () => {
    expect(matchModeName('gem grab')).toBe('gemGrab');
    expect(matchModeName('hot zone')).toBe('hotZone');
  });

  it('parses ban / pick / enemy / undo', () => {
    expect(parseBrawlVoiceIntent('ban shelly', { catalog })?.type).toBe('ban');
    expect(parseBrawlVoiceIntent('we pick piper for alex', { catalog, nicknames: ['Alex'] })?.nickname).toBe('Alex');
    expect(parseBrawlVoiceIntent('enemy picked colt', { catalog })?.type).toBe('enemy_pick');
    expect(parseBrawlVoiceIntent('they took piper', { catalog })?.type).toBe('enemy_pick');
    expect(parseBrawlVoiceIntent('undo', { catalog })?.type).toBe('undo');
    expect(parseBrawlVoiceIntent('set mode knockout', { catalog })?.modeId).toBe('knockout');
  });

  it('parses multi-ban dump', () => {
    const many = parseBrawlVoiceIntent('ban shelly piper colt', { catalog });
    expect(many?.type).toBe('ban_many');
    expect(many?.brawlerIds).toEqual([16000000, 16000013, 16000002]);
  });

  it('routes bare brawler name to current seat', () => {
    const bare = parseBrawlVoiceIntent('piper', { catalog });
    expect(bare?.type).toBe('current_seat');
    expect(bare?.brawlerId).toBe(16000013);
    expect(parseBrawlVoiceIntent('uh piper please', { catalog })?.type).toBe('current_seat');
  });
});
