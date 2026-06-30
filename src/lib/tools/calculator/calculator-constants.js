export const MATH_PI = Math.PI;
export const MATH_E = Math.E;

export const BUILTIN_FUNCTIONS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sqrt', 'abs', 'log', 'logb', 'ln', 'exp',
  'floor', 'ceil', 'round', 'min', 'max',
  'factorial', 'nPr', 'nCr',
];

export const BUILTIN_CONSTANTS = {
  pi: MATH_PI,
  π: MATH_PI,
  e: MATH_E,
};

export const EXPRESSION_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

export const CALCULATOR_MODES = [
  { id: 'graphing', label: 'Graphing', phase: 1 },
  { id: 'scientific', label: 'Scientific', phase: 2 },
  { id: 'cas', label: 'CAS', phase: 3 },
  { id: 'geometry', label: 'Geometry', phase: 3 },
  { id: 'stats', label: 'Statistics', phase: 3 },
  { id: '3d', label: '3D', phase: 4 },
];

export const DEFAULT_VIEWPORT = {
  xMin: -10,
  xMax: 10,
  yMin: -7,
  yMax: 7,
};

export const HOME_VIEWPORT = { ...DEFAULT_VIEWPORT };

export const DEFAULT_SLIDER = { min: -10, max: 10, step: 0.1 };
