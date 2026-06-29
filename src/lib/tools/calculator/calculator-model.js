import {
  CALCULATOR_MODES,
  DEFAULT_SLIDER,
  DEFAULT_VIEWPORT,
  EXPRESSION_COLORS,
} from '@/lib/tools/calculator/calculator-constants';
import { stabilizeViewport } from '@/lib/tools/calculator/render/graph-viewport';

export { CALCULATOR_MODES, EXPRESSION_COLORS, DEFAULT_VIEWPORT, DEFAULT_SLIDER };

export const CALCULATOR_VERSION = 1;

/** @typedef {'graphing'|'scientific'|'cas'|'geometry'|'stats'|'3d'} CalculatorModeId */
/** @typedef {'scalar'|'variable'|'function'|'equation'|'point'|'list'|'slider'|'table'|'geometry'|'cas'|'stats'|'surface3d'|'point3d'} ExpressionKind */
/** @typedef {'valid'|'error'|'inactive'} ExpressionState */

/**
 * @typedef {object} SliderConfig
 * @property {number} min
 * @property {number} max
 * @property {number} step
 */

/**
 * @typedef {object} CalculatorExpression
 * @property {string} id
 * @property {number} order
 * @property {string} raw
 * @property {ExpressionKind} kind
 * @property {ExpressionState} state
 * @property {string} [error]
 * @property {boolean} visible
 * @property {string} color
 * @property {string[]} deps
 * @property {string[]} modeFlags
 * @property {SliderConfig} [slider]
 * @property {string} [folderId]
 * @property {object} [meta]
 */

/**
 * @typedef {object} CalculatorWorkspace
 * @property {number} version
 * @property {CalculatorModeId} mode
 * @property {CalculatorExpression[]} expressions
 * @property {typeof DEFAULT_VIEWPORT} viewport
 * @property {object} settings
 * @property {object} panel
 * @property {object} keyboard
 * @property {object[]} history
 * @property {object[]} folders
 * @property {object} [geometry]
 * @property {object} [stats]
 * @property {number} updatedAt
 * @property {string} [userEmail]
 */

let idCounter = 0;

export function newExpressionId() {
  idCounter += 1;
  return `expr_${Date.now()}_${idCounter}`;
}

export function newFolderId() {
  return `folder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createExpression(overrides = {}) {
  const order = overrides.order ?? 0;
  return {
    id: overrides.id || newExpressionId(),
    order,
    raw: overrides.raw ?? '',
    kind: overrides.kind ?? 'equation',
    state: overrides.state ?? 'valid',
    error: overrides.error,
    visible: overrides.visible ?? true,
    color: overrides.color ?? EXPRESSION_COLORS[order % EXPRESSION_COLORS.length],
    deps: overrides.deps ?? [],
    modeFlags: overrides.modeFlags ?? ['graphing'],
    slider: overrides.slider,
    folderId: overrides.folderId,
    meta: overrides.meta ?? {},
  };
}

export function emptyCalculatorWorkspace() {
  return normalizeCalculatorWorkspace({
    version: CALCULATOR_VERSION,
    mode: 'graphing',
    expressions: [],
    viewport: { ...DEFAULT_VIEWPORT },
    settings: {
      grid: true,
      xAxis: true,
      yAxis: true,
      angleMode: 'RAD',
      fractionDisplay: false,
      showExact: true,
      viewportUserAdjusted: false,
    },
    panel: { width: 320, collapsed: false, filter: 'all' },
    keyboard: { visible: false, tab: 'numbers' },
    history: [],
    folders: [],
    updatedAt: Date.now(),
  });
}

function normalizeExpression(expr, index) {
  if (!expr || typeof expr !== 'object') {
    return createExpression({ order: index });
  }
  return createExpression({
    ...expr,
    order: typeof expr.order === 'number' ? expr.order : index,
    raw: typeof expr.raw === 'string' ? expr.raw : '',
    kind: expr.kind || 'equation',
    state: expr.state === 'error' ? 'error' : expr.state === 'inactive' ? 'inactive' : 'valid',
    error: typeof expr.error === 'string' ? expr.error : undefined,
    visible: expr.visible !== false,
    color: typeof expr.color === 'string' ? expr.color : EXPRESSION_COLORS[index % EXPRESSION_COLORS.length],
    deps: Array.isArray(expr.deps) ? expr.deps.filter((d) => typeof d === 'string') : [],
    modeFlags: Array.isArray(expr.modeFlags) ? expr.modeFlags : ['graphing'],
    slider: expr.slider && typeof expr.slider === 'object'
      ? {
        min: Number(expr.slider.min) || DEFAULT_SLIDER.min,
        max: Number(expr.slider.max) || DEFAULT_SLIDER.max,
        step: Number(expr.slider.step) || DEFAULT_SLIDER.step,
      }
      : undefined,
    folderId: typeof expr.folderId === 'string' ? expr.folderId : undefined,
    meta: expr.meta && typeof expr.meta === 'object' ? expr.meta : {},
  });
}

export function normalizeCalculatorWorkspace(input) {
  const base = input && typeof input === 'object' ? input : {};
  const expressions = Array.isArray(base.expressions)
    ? base.expressions.map(normalizeExpression).sort((a, b) => a.order - b.order)
    : [];

  const validModes = CALCULATOR_MODES.map((m) => m.id);
  const mode = validModes.includes(base.mode) ? base.mode : 'graphing';

  const vp = base.viewport && typeof base.viewport === 'object' ? base.viewport : DEFAULT_VIEWPORT;

  return {
    version: CALCULATOR_VERSION,
    mode,
    expressions,
    viewport: stabilizeViewport({
      xMin: Number(vp.xMin) || DEFAULT_VIEWPORT.xMin,
      xMax: Number(vp.xMax) || DEFAULT_VIEWPORT.xMax,
      yMin: Number(vp.yMin) || DEFAULT_VIEWPORT.yMin,
      yMax: Number(vp.yMax) || DEFAULT_VIEWPORT.yMax,
    }),
    settings: {
      grid: base.settings?.grid !== false,
      xAxis: base.settings?.xAxis !== false && base.settings?.axes !== false,
      yAxis: base.settings?.yAxis !== false && base.settings?.axes !== false,
      angleMode: base.settings?.angleMode === 'DEG' ? 'DEG' : 'RAD',
      fractionDisplay: Boolean(base.settings?.fractionDisplay),
      showExact: base.settings?.showExact !== false,
      viewportUserAdjusted: Boolean(base.settings?.viewportUserAdjusted),
    },
    panel: {
      width: Number(base.panel?.width) || 320,
      collapsed: Boolean(base.panel?.collapsed),
      filter: ['all', 'errors', 'visible'].includes(base.panel?.filter) ? base.panel.filter : 'all',
    },
    keyboard: {
      visible: Boolean(base.keyboard?.visible),
      tab: base.keyboard?.tab || 'numbers',
    },
    history: Array.isArray(base.history) ? base.history.slice(0, 200) : [],
    folders: Array.isArray(base.folders) ? base.folders : [],
    geometry: base.geometry && typeof base.geometry === 'object'
      ? { objects: Array.isArray(base.geometry.objects) ? base.geometry.objects : [], tool: base.geometry.tool || 'select' }
      : { objects: [], tool: 'select' },
    stats: base.stats && typeof base.stats === 'object' ? base.stats : { dataset: [], distribution: 'normal', params: { mean: 0, stdev: 1 } },
    updatedAt: typeof base.updatedAt === 'number' ? base.updatedAt : Date.now(),
    userEmail: typeof base.userEmail === 'string' ? base.userEmail : undefined,
  };
}

export function reorderExpressions(expressions, fromId, toId) {
  const list = [...expressions].sort((a, b) => a.order - b.order);
  const fromIdx = list.findIndex((e) => e.id === fromId);
  const toIdx = list.findIndex((e) => e.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return list;
  const [moved] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, moved);
  return list.map((e, i) => ({ ...e, order: i }));
}

export function duplicateExpression(expr, expressions) {
  const maxOrder = expressions.reduce((m, e) => Math.max(m, e.order), -1);
  return createExpression({
    ...expr,
    id: newExpressionId(),
    order: maxOrder + 1,
    color: EXPRESSION_COLORS[(maxOrder + 1) % EXPRESSION_COLORS.length],
  });
}

export function modeIsUnlocked(modeId) {
  const mode = CALCULATOR_MODES.find((m) => m.id === modeId);
  return mode ? mode.phase <= 4 : false;
}
