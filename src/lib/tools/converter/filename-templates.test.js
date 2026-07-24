import { describe, expect, it } from 'vitest';
import {
  FILENAME_TEMPLATE_TOKENS,
  previewTemplate,
  renderFilenameTemplate,
} from '@/lib/tools/converter/filename-templates.js';

describe('filename-templates', () => {
  it('substitutes all supported tokens', () => {
    const rendered = renderFilenameTemplate('{name}-{index}-{preset}-{format}.{ext}', {
      name: 'photo',
      index: 3,
      preset: 'web',
      format: 'png',
      ext: 'webp',
    });
    expect(rendered).toBe('photo-3-web-png.webp');
  });

  it('renders a date token as YYYY-MM-DD', () => {
    const rendered = renderFilenameTemplate('{name}-{date}', {
      name: 'shot',
      date: new Date(2026, 0, 5),
      ext: 'png',
    });
    expect(rendered).toBe('shot-2026-01-05');
  });

  it('sanitizes unsafe characters from the rendered name', () => {
    const rendered = renderFilenameTemplate('{name}', { name: 'bad:name?.png' });
    expect(rendered).not.toMatch(/[:?]/);
  });

  it('falls back to {name} for an empty template', () => {
    const rendered = renderFilenameTemplate('', { name: 'fallback' });
    expect(rendered).toBe('fallback');
  });

  it('leaves unknown tokens untouched', () => {
    const rendered = renderFilenameTemplate('{name}-{unknown}', { name: 'x' });
    expect(rendered).toBe('x-{unknown}');
  });

  it('resolves collisions against a used-name set', () => {
    const used = new Set(['out.png', 'out (2).png']);
    const rendered = renderFilenameTemplate('out.png', {}, used);
    expect(rendered).toBe('out (3).png');
  });

  it('previews a template with representative sample values', () => {
    const preview = previewTemplate('{name}-{index}.{ext}');
    expect(preview).toMatch(/^photo-1\.webp$/);
  });

  it('exposes the supported token list', () => {
    expect(FILENAME_TEMPLATE_TOKENS).toEqual(['name', 'index', 'date', 'preset', 'format', 'ext']);
  });
});
