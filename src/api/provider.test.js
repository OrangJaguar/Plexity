import { describe, expect, it } from 'vitest';
import { getDataProvider, isBase44Provider, isSupabaseProvider } from '@/api/provider';

describe('data provider', () => {
  it('is always supabase after Base44 removal', () => {
    expect(getDataProvider()).toBe('supabase');
    expect(isSupabaseProvider()).toBe(true);
    expect(isBase44Provider()).toBe(false);
  });
});
