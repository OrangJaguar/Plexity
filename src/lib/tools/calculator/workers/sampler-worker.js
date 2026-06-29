import { sampleFunction } from '@/lib/tools/calculator/engine/sampler-2d';

self.onmessage = (e) => {
  const { bodyAst, scope, viewport, pixelWidth, pixelHeight } = e.data;
  try {
    const segments = sampleFunction(
      bodyAst,
      scope,
      viewport.xMin,
      viewport.xMax,
      pixelWidth,
      pixelHeight,
      viewport.yMin,
      viewport.yMax,
    );
    self.postMessage({ ok: true, segments });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
