import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { completeJson, transcribe, visionOcr, hasRealProvider } from './ai-providers.js';

describe('ai-providers mock mode', () => {
  it('returns deterministic fixtures without API keys', async () => {
    assert.equal(hasRealProvider(), false);

    const jsonA = await completeJson({ prompt: 'summarize this clip' });
    const jsonB = await completeJson({ prompt: 'summarize this clip' });
    assert.equal(jsonA.json.mock, true);
    assert.deepEqual(jsonA.json, jsonB.json);

    const ocr = await visionOcr({ buffer: Buffer.from('fake-image'), inputLabel: 'test-ocr' });
    assert.match(ocr.text, /Mock OCR/);

    const stt = await transcribe({ buffer: Buffer.alloc(128), inputLabel: 'test-audio' });
    assert.match(stt.text, /Mock transcript/);
  });
});
