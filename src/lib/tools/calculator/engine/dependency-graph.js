import { collectIdentifiers } from '@/lib/tools/calculator/parser/ast';
import { extractDefinitions } from '@/lib/tools/calculator/engine/evaluator';

/**
 * @typedef {object} CompiledExpression
 * @property {string} id
 * @property {string} raw
 * @property {object|null} ast
 * @property {string|null} error
 * @property {string} kind
 * @property {string[]} deps
 * @property {string} [defines]
 * @property {object} [graphable]
 */

export function extractDefines(ast) {
  const def = extractDefinitions(ast);
  if (!def) return null;
  if (def.kind === 'variable' || def.kind === 'function' || def.kind === 'point') return def.name;
  return null;
}

export function extractDependencies(ast, defines = null) {
  if (!ast) return [];
  const exclude = new Set(['x', 'y', 'e', 'pi', 'π']);
  if (defines) exclude.add(defines);
  const def = extractDefinitions(ast);
  if (def?.kind === 'function') {
    def.params.forEach((p) => exclude.add(p));
  }
  return collectIdentifiers(ast, exclude);
}

export function buildDependencyGraph(compiled) {
  const byDefine = new Map();
  compiled.forEach((item) => {
    if (item.defines) byDefine.set(item.defines, item.id);
  });

  const edges = new Map();
  compiled.forEach((item) => {
    const depIds = item.deps
      .map((sym) => byDefine.get(sym))
      .filter(Boolean)
      .filter((id) => id !== item.id);
    edges.set(item.id, [...new Set(depIds)]);
  });

  return { nodes: compiled.map((c) => c.id), edges, byDefine };
}

export function topologicalSort(graph) {
  const { nodes, edges } = graph;
  const remaining = new Set(nodes);
  const order = [];

  while (remaining.size) {
    let found = false;
    for (const node of remaining) {
      const deps = edges.get(node) || [];
      if (deps.every((d) => !remaining.has(d))) {
        order.push(node);
        remaining.delete(node);
        found = true;
        break;
      }
    }
    if (!found) return { order: null, cyclic: true };
  }
  return { order, cyclic: false };
}

export function detectCycles(graph) {
  const result = topologicalSort(graph);
  return result.cyclic;
}
