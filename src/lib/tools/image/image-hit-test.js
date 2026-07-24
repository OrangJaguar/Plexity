/**
 * AABB hit-test for document layers (top → bottom).
 * @param {import('./image-document.js').ImageDocument} doc
 * @param {number} x
 * @param {number} y
 * @returns {import('./image-document.js').ImageLayer | null}
 */
export function hitTestLayer(doc, x, y) {
  for (let i = doc.layers.length - 1; i >= 0; i -= 1) {
    const layer = doc.layers[i];
    if (!layer.visible) continue;
    if (
      x >= layer.x
      && x <= layer.x + layer.width
      && y >= layer.y
      && y <= layer.y + layer.height
    ) {
      return layer;
    }
  }
  return null;
}

/**
 * @param {import('./image-document.js').ImageLayer} layer
 * @param {number} x
 * @param {number} y
 */
export function pointInLayer(layer, x, y) {
  return (
    x >= layer.x
    && x <= layer.x + layer.width
    && y >= layer.y
    && y <= layer.y + layer.height
  );
}
