import { describe, expect, it } from 'vitest';
import { applyAspectToCrop, clampCropRect, fullCropRect } from '@/lib/tools/image/image-crop.js';
import { applyAdjustToImageData, defaultAdjustParams, isIdentityAdjust, normalizeAdjustParams } from '@/lib/tools/image/image-adjust.js';
import { getFilterPreset, listFilterCategories } from '@/lib/tools/image/image-filters.js';
import { exportFileName, mimeForExportFormat } from '@/lib/tools/image/image-export.js';
import { validateImageFile, IMAGE_MAX_FILE_BYTES, megapixelInfo } from '@/lib/tools/image/image-limits.js';
import { alignBoxToCanvas, snapBox, flipLayerTransform } from '@/lib/tools/image/image-transform.js';
import { createEmptyDocument, reorderLayers } from '@/lib/tools/image/image-document.js';
import { fitWithinEdge } from '@/lib/tools/image/image-decode.js';

describe('image-limits', () => {
  it('accepts image mime types', () => {
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' });
    expect(validateImageFile(file).ok).toBe(true);
  });

  it('rejects non-images', () => {
    const file = new File([new Uint8Array([1])], 'a.txt', { type: 'text/plain' });
    expect(validateImageFile(file).ok).toBe(false);
  });

  it('rejects oversized files', () => {
    const file = new File([new Uint8Array(10)], 'big.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: IMAGE_MAX_FILE_BYTES + 1 });
    expect(validateImageFile(file).ok).toBe(false);
  });

  it('flags large megapixel counts', () => {
    expect(megapixelInfo(8000, 8000).warn).toBe(true);
    expect(megapixelInfo(800, 600).warn).toBe(false);
  });
});

describe('image-decode fit', () => {
  it('downscales long edge', () => {
    const fit = fitWithinEdge(8000, 4000, 4096);
    expect(fit.width).toBe(4096);
    expect(fit.scale).toBeLessThan(1);
  });
});

describe('image-crop', () => {
  it('clamps crop inside bounds', () => {
    const rect = clampCropRect({ x: -10, y: 5, width: 500, height: 20 }, 100, 80);
    expect(rect.x).toBe(0);
    expect(rect.width).toBeLessThanOrEqual(100);
    expect(rect.y + rect.height).toBeLessThanOrEqual(80);
  });

  it('applies aspect ratio', () => {
    const base = fullCropRect(200, 100);
    const squared = applyAspectToCrop(base, 200, 100, 1);
    expect(Math.abs(squared.width - squared.height)).toBeLessThan(2);
  });
});

describe('image-adjust + filters', () => {
  it('treats default adjust as identity', () => {
    expect(isIdentityAdjust(defaultAdjustParams())).toBe(true);
    expect(isIdentityAdjust(normalizeAdjustParams({ brightness: 0.2 }))).toBe(false);
  });

  it('mutates image data for non-identity adjust', () => {
    const data = { data: new Uint8ClampedArray([100, 100, 100, 255]), width: 1, height: 1 };
    applyAdjustToImageData(data, { ...defaultAdjustParams(), brightness: 0.5 });
    expect(data.data[0]).toBeGreaterThan(100);
  });

  it('lists filter categories and presets', () => {
    expect(listFilterCategories().length).toBeGreaterThan(1);
    expect(getFilterPreset('noir').label).toBe('Noir');
  });
});

describe('image-export', () => {
  it('maps mime types and filenames', () => {
    expect(mimeForExportFormat('png')).toBe('image/png');
    expect(mimeForExportFormat('jpeg')).toBe('image/jpeg');
    expect(exportFileName('My Photo!', 'jpeg')).toBe('My-Photo.jpg');
  });
});

describe('image-transform', () => {
  it('snaps near canvas center', () => {
    const box = snapBox({ x: 48, y: 10, width: 20, height: 20 }, 100, 100);
    expect(Math.abs(box.x + box.width / 2 - 50)).toBeLessThanOrEqual(1);
  });

  it('aligns to canvas edges and flips', () => {
    const box = { x: 10, y: 10, width: 20, height: 20 };
    expect(alignBoxToCanvas(box, 100, 100, 'right').x).toBe(80);
    expect(alignBoxToCanvas(box, 100, 100, 'bottom').y).toBe(80);
    expect(flipLayerTransform({ flipH: false }, 'h').flipH).toBe(true);
  });
});

describe('image-document', () => {
  it('creates empty docs and reorders layers', () => {
    expect(createEmptyDocument().layers).toEqual([]);
    const doc = {
      ...createEmptyDocument(),
      canvasWidth: 10,
      canvasHeight: 10,
      layers: [{ id: 'a' }, { id: 'b' }],
      selectedLayerId: 'a',
    };
    const reordered = reorderLayers(doc, 0, 1);
    expect(reordered.layers.map((l) => l.id)).toEqual(['b', 'a']);
  });
});

describe('image-rembg module shape', () => {
  it('exports removeBackgroundLocal', async () => {
    const mod = await import('@/lib/tools/image/image-rembg.js');
    expect(typeof mod.removeBackgroundLocal).toBe('function');
    expect(typeof mod.prefetchRembg).toBe('function');
  });
});
