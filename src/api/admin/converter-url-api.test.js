import { describe, expect, it } from 'vitest';
import { converterJobCreate, converterUrlSession } from '@/api/admin/converter-url-api.js';

describe('converter-url-api', () => {
  it('rejects when server features are disabled', async () => {
    await expect(converterUrlSession()).rejects.toMatchObject({
      code: 'CONVERTER_SERVER_DISABLED',
    });
    await expect(converterJobCreate({})).rejects.toMatchObject({
      code: 'CONVERTER_SERVER_DISABLED',
    });
  });
});
