import { DEFAULT_SLIDER } from '@/lib/tools/calculator/calculator-constants';
import { buildDependencyGraph, extractDefines, extractDependencies, topologicalSort } from '@/lib/tools/calculator/engine/dependency-graph';
import { getGraphableBody, tryEvaluate, createEvalContext } from '@/lib/tools/calculator/engine/evaluator';
import { tryParse } from '@/lib/tools/calculator/parser/parser';
import { astUsesVariable } from '@/lib/tools/calculator/engine/evaluator';

/**
 * @typedef {import('@/lib/tools/calculator/calculator-model.js').CalculatorExpression} CalculatorExpression
 */

export function classifyExpression(raw, ast) {
  if (!ast) return 'equation';
  if (ast.type === 'Assignment') return 'variable';
  if (ast.type === 'FunctionDef') return 'function';
  if (ast.type === 'Point') return 'point';
  if (ast.type === 'List') return 'list';
  if (ast.type === 'Equation') return 'equation';
  if (getGraphableBody(ast)) return 'equation';
  return 'scalar';
}

export function compileExpression(expr, angleMode = 'RAD') {
  if (!String(expr.raw || '').trim()) {
    return {
      id: expr.id,
      raw: expr.raw || '',
      ast: null,
      error: null,
      kind: expr.kind || 'equation',
      deps: [],
      defines: null,
      graphable: null,
      numericValue: null,
    };
  }

  const parsed = tryParse(expr.raw);
  if (!parsed.ok) {
    return {
      id: expr.id,
      raw: expr.raw,
      ast: null,
      error: parsed.error,
      kind: 'equation',
      deps: [],
      defines: null,
      graphable: null,
      numericValue: null,
    };
  }

  const ast = parsed.ast;
  const defines = extractDefines(ast);
  const deps = extractDependencies(ast, defines);
  const kind = classifyExpression(expr.raw, ast);
  const graphable = getGraphableBody(ast);

  let numericValue = null;
  let error = null;

  if (kind === 'variable' && ast.type === 'Assignment') {
    const ctx = createEvalContext({ angleMode });
    const result = tryEvaluate(ast.value, ctx);
    if (result.ok) numericValue = result.value;
  } else if (kind === 'scalar') {
    const ctx = createEvalContext({ angleMode });
    const result = tryEvaluate(ast, ctx);
    if (!result.ok) error = result.error;
    else numericValue = result.value;
  }

  return {
    id: expr.id,
    raw: expr.raw,
    ast,
    error,
    kind,
    deps,
    defines,
    graphable,
    numericValue,
  };
}

export function compileWorkspace(expressions, angleMode = 'RAD') {
  const compiled = expressions.map((e) => compileExpression(e, angleMode));
  const graph = buildDependencyGraph(compiled);

  const scope = buildScope(compiled, angleMode, expressions);

  return { compiled, graph, scope };
}

export function buildScope(compiled, angleMode, expressions) {
  const vars = {};
  const funcs = {};
  const points = {};
  const sliders = {};

  expressions.forEach((expr) => {
    if (expr.kind === 'variable' && expr.slider) {
      sliders[expr.raw.split('=')[0]?.trim()] = expr;
    }
  });

  const graph = buildDependencyGraph(compiled);
  const { order, cyclic } = topologicalSort(graph);
  const ordered = cyclic ? compiled : order.map((id) => compiled.find((c) => c.id === id)).filter(Boolean);

  for (const item of ordered) {
    if (item.error || !item.ast) continue;

    if (item.kind === 'variable' && item.ast.type === 'Assignment') {
      const ctx = createEvalContext({ vars, funcs, angleMode });
      const result = tryEvaluate(item.ast.value, ctx);
      if (result.ok) vars[item.defines] = result.value;
    }

    if (item.kind === 'function' && item.ast.type === 'FunctionDef') {
      funcs[item.defines] = { params: item.ast.params, body: item.ast.body };
    }

    if (item.kind === 'point' && item.ast.type === 'Point') {
      const ctx = createEvalContext({ vars, funcs, angleMode });
      const xr = tryEvaluate(item.ast.x, ctx);
      const yr = tryEvaluate(item.ast.y, ctx);
      if (xr.ok && yr.ok) {
        points[item.defines || item.id] = { x: xr.value, y: yr.value };
      }
    }
  }

  return { vars, funcs, points, sliders, angleMode };
}

export function isSliderCandidate(compiled) {
  return compiled.kind === 'variable'
    && compiled.ast?.type === 'Assignment'
    && !astUsesVariable(compiled.ast.value, compiled.defines);
}

export function defaultSliderForVariable(name, value) {
  const v = Number(value) || 0;
  return {
    min: Math.min(-10, v - 5),
    max: Math.max(10, v + 5),
    step: DEFAULT_SLIDER.step,
  };
}

export function getGraphableExpressions(compiled, scope) {
  return compiled.filter((c) => c.graphable && !c.error && c.visible !== false);
}
