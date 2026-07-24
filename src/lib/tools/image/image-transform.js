/**
 * Snap / align helpers for image layer transforms.
 */

export const SNAP_THRESHOLD = 8;

/**
 * @typedef {{ x: number, y: number, width: number, height: number, rotation?: number }} LayerBox
 */

/**
 * @param {LayerBox} box
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {LayerBox[]} [siblings]
 * @returns {LayerBox}
 */
export function snapBox(box, canvasW, canvasH, siblings = []) {
  let { x, y, width, height } = box;
  const cx = x + width / 2;
  const cy = y + height / 2;

  const xTargets = [0, canvasW / 2, canvasW];
  const yTargets = [0, canvasH / 2, canvasH];
  for (const s of siblings) {
    xTargets.push(s.x, s.x + s.width / 2, s.x + s.width);
    yTargets.push(s.y, s.y + s.height / 2, s.y + s.height);
  }

  for (const t of xTargets) {
    if (Math.abs(x - t) <= SNAP_THRESHOLD) x = t;
    if (Math.abs(x + width - t) <= SNAP_THRESHOLD) x = t - width;
    if (Math.abs(cx - t) <= SNAP_THRESHOLD) x = t - width / 2;
  }
  for (const t of yTargets) {
    if (Math.abs(y - t) <= SNAP_THRESHOLD) y = t;
    if (Math.abs(y + height - t) <= SNAP_THRESHOLD) y = t - height;
    if (Math.abs(cy - t) <= SNAP_THRESHOLD) y = t - height / 2;
  }

  return { ...box, x, y, width, height };
}

/**
 * @param {LayerBox} box
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {'left'|'center'|'right'|'top'|'middle'|'bottom'} align
 * @returns {LayerBox}
 */
export function alignBoxToCanvas(box, canvasW, canvasH, align) {
  let { x, y, width, height } = box;
  switch (align) {
    case 'left':
      x = 0;
      break;
    case 'center':
      x = (canvasW - width) / 2;
      break;
    case 'right':
      x = canvasW - width;
      break;
    case 'top':
      y = 0;
      break;
    case 'middle':
      y = (canvasH - height) / 2;
      break;
    case 'bottom':
      y = canvasH - height;
      break;
    default:
      break;
  }
  return { ...box, x, y };
}

/**
 * Flip a layer transform horizontally or vertically around its center.
 * @param {LayerBox & { flipH?: boolean, flipV?: boolean }} layer
 * @param {'h' | 'v'} axis
 */
export function flipLayerTransform(layer, axis) {
  if (axis === 'h') return { ...layer, flipH: !layer.flipH };
  return { ...layer, flipV: !layer.flipV };
}
