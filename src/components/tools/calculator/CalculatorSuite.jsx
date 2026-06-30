import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronRight } from 'lucide-react';
import {
  createExpression,
  duplicateExpression,
  normalizeCalculatorWorkspace,
} from '@/lib/tools/calculator/calculator-model';
import { HOME_VIEWPORT } from '@/lib/tools/calculator/calculator-constants';
import { compileWorkspace } from '@/lib/tools/calculator/engine/classifier';
import { computeSmartViewport, stabilizeViewport } from '@/lib/tools/calculator/render/graph-viewport';
import { formatPointLabel } from '@/lib/tools/calculator/format-coord';
import { defaultTableRows } from '@/lib/tools/calculator/table-utils';
import ExpressionPanel from '@/components/tools/calculator/ExpressionPanel';
import GraphCanvas from '@/components/tools/calculator/GraphCanvas';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';

export default function CalculatorSuite({ data, saveDocument }) {
  const [workspace, setWorkspace] = useState(() => normalizeCalculatorWorkspace(data));
  const [editMode, setEditMode] = useState(false);
  const saveTimer = useRef(null);
  const compileCache = useRef(new Map());
  const exprPanelRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [historyTick, setHistoryTick] = useState(0);
  const [viewportEpoch, setViewportEpoch] = useState(0);
  const [focusedExprId, setFocusedExprId] = useState(null);
  const { action, clearAction } = useCommandBarDraft('action');

  const persist = useCallback((next) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDocument(next);
    }, 500);
  }, [saveDocument]);

  const updateWorkspace = useCallback((updater) => {
    setWorkspace((prev) => {
      const next = normalizeCalculatorWorkspace(
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater, updatedAt: Date.now() },
      );
      persist(next);
      return next;
    });
  }, [persist]);

  const snapshotExpressions = (exprs) => JSON.stringify(exprs);

  const recordExpressionHistory = useCallback((expressions) => {
    undoStack.current.push(snapshotExpressions(expressions));
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
    setHistoryTick((n) => n + 1);
  }, []);

  const updateExpressions = useCallback((updater) => {
    setWorkspace((prev) => {
      recordExpressionHistory(prev.expressions);
      const nextExprs = typeof updater === 'function' ? updater(prev.expressions) : updater;
      const next = normalizeCalculatorWorkspace({ ...prev, expressions: nextExprs, updatedAt: Date.now() });
      persist(next);
      return next;
    });
  }, [persist, recordExpressionHistory]);

  const handleUndo = useCallback(() => {
    const snap = undoStack.current.pop();
    if (!snap) return;
    redoStack.current.push(snapshotExpressions(workspace.expressions));
    const restored = JSON.parse(snap);
    setWorkspace((prev) => {
      const next = normalizeCalculatorWorkspace({ ...prev, expressions: restored, updatedAt: Date.now() });
      persist(next);
      return next;
    });
    setHistoryTick((n) => n + 1);
  }, [workspace.expressions, persist]);

  const handleRedo = useCallback(() => {
    const snap = redoStack.current.pop();
    if (!snap) return;
    undoStack.current.push(snapshotExpressions(workspace.expressions));
    const restored = JSON.parse(snap);
    setWorkspace((prev) => {
      const next = normalizeCalculatorWorkspace({ ...prev, expressions: restored, updatedAt: Date.now() });
      persist(next);
      return next;
    });
    setHistoryTick((n) => n + 1);
  }, [workspace.expressions, persist]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;
  void historyTick;

  const { compiled, scope } = useMemo(() => {
    const key = JSON.stringify(workspace.expressions.map((e) => `${e.id}:${e.raw}:${e.visible}:${JSON.stringify(e.meta)}`)) + workspace.settings.angleMode;
    if (compileCache.current.has(key)) return compileCache.current.get(key);
    const result = compileWorkspace(workspace.expressions, workspace.settings.angleMode);
    compileCache.current.set(key, result);
    if (compileCache.current.size > 20) {
      const first = compileCache.current.keys().next().value;
      compileCache.current.delete(first);
    }
    return result;
  }, [workspace.expressions, workspace.settings.angleMode]);

  const compiledMap = useMemo(() => Object.fromEntries(compiled.map((c) => [c.id, c])), [compiled]);

  const definedSymbols = useMemo(() => {
    const syms = new Set();
    compiled.forEach((c) => { if (c.defines) syms.add(c.defines); });
    return [...syms];
  }, [compiled]);

  const graphPoints = useMemo(() => {
    const pts = [];
    for (const expr of workspace.expressions) {
      if (!expr.visible) continue;
      const c = compiledMap[expr.id];
      if (c?.kind === 'point' && !c.error) {
        const key = c.defines || c.id;
        const pt = scope.points?.[key];
        if (pt) pts.push({ x: pt.x, y: pt.y, color: expr.color });
      }
    }
    return pts;
  }, [workspace.expressions, compiledMap, scope.points]);

  const handleAddPointToList = useCallback((x, y) => {
    updateExpressions((prev) => [
      ...prev,
      createExpression({ order: prev.length, raw: formatPointLabel(x, y, 3), kind: 'point' }),
    ]);
  }, [updateExpressions]);

  const handleConvertToTable = useCallback((id) => {
    updateExpressions((prev) => [
      ...prev,
      createExpression({
        order: prev.length,
        raw: '',
        kind: 'table',
        meta: { rowType: 'table', sourceId: id, rows: defaultTableRows() },
      }),
    ]);
  }, [updateExpressions]);

  useEffect(() => {
    if (!action) return;
    if (action.actionId === 'calculatorExpr') {
      updateExpressions((prev) => [
        ...prev,
        createExpression({ order: prev.length, raw: action.payload?.raw || '' }),
      ]);
      clearAction();
    }
    if (action.actionId === 'calculatorTable') {
      updateExpressions((prev) => [
        ...prev,
        createExpression({
          order: prev.length,
          raw: '',
          kind: 'table',
          meta: { rowType: 'table', rows: defaultTableRows() },
        }),
      ]);
      clearAction();
    }
  }, [action, clearAction, updateExpressions]);

  const handleUpdateTableRows = useCallback((id, rows) => {
    updateWorkspace((prev) => ({
      ...prev,
      expressions: prev.expressions.map((e) => (
        e.id === id ? { ...e, meta: { ...e.meta, rows } } : e
      )),
    }));
  }, [updateWorkspace]);

  useEffect(() => {
    const panel = exprPanelRef.current;
    if (!panel) return;
    if (workspace.panel.collapsed) panel.collapse();
    else panel.expand();
  }, [workspace.panel.collapsed]);

  const handleHome = useCallback(() => {
    setViewportEpoch((n) => n + 1);
    updateWorkspace((prev) => ({
      ...prev,
      viewport: { ...HOME_VIEWPORT },
      settings: { ...prev.settings, viewportUserAdjusted: true },
    }));
  }, [updateWorkspace]);

  const handleAutoFit = useCallback(() => {
    const vp = computeSmartViewport(compiled, scope, workspace.expressions);
    setViewportEpoch((n) => n + 1);
    updateWorkspace((prev) => ({
      ...prev,
      viewport: vp,
      settings: { ...prev.settings, viewportUserAdjusted: false },
    }));
  }, [compiled, scope, workspace.expressions, updateWorkspace]);

  const handleUserViewport = useCallback((viewport) => {
    updateWorkspace((prev) => ({
      ...prev,
      viewport: stabilizeViewport(viewport),
      settings: { ...prev.settings, viewportUserAdjusted: true },
    }));
  }, [updateWorkspace]);

  const handleKeyboardInsert = useCallback((snippet) => {
    const sorted = [...workspace.expressions].sort((a, b) => a.order - b.order);
    const targetId = focusedExprId || sorted[sorted.length - 1]?.id;
    if (!targetId || !snippet) return;
    updateWorkspace((prev) => ({
      ...prev,
      expressions: prev.expressions.map((e) => (
        e.id === targetId ? { ...e, raw: `${e.raw}${snippet}` } : e
      )),
    }));
  }, [focusedExprId, updateWorkspace, workspace.expressions]);

  return (
    <div className="calc-suite calc-suite--graph-only">
      <div className="calc-suite-body">
        <PanelGroup direction="horizontal" className="calc-panel-group">
          <Panel
            ref={exprPanelRef}
            defaultSize={28}
            minSize={18}
            maxSize={42}
            collapsible
            collapsedSize={0}
            onCollapse={() => updateWorkspace((prev) => ({ ...prev, panel: { ...prev.panel, collapsed: true } }))}
            onExpand={() => updateWorkspace((prev) => ({ ...prev, panel: { ...prev.panel, collapsed: false } }))}
          >
            <ExpressionPanel
              expressions={workspace.expressions}
              compiledMap={compiledMap}
              compiled={compiled}
              scope={scope}
              definedSymbols={definedSymbols}
              editMode={editMode}
              onEditModeChange={setEditMode}
              onToggleCollapse={() => {
                if (workspace.panel.collapsed) {
                  exprPanelRef.current?.expand();
                  updateWorkspace((prev) => ({ ...prev, panel: { ...prev.panel, collapsed: false } }));
                } else {
                  exprPanelRef.current?.collapse();
                  updateWorkspace((prev) => ({ ...prev, panel: { ...prev.panel, collapsed: true } }));
                }
              }}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onUpdateExpression={(id, patch) => updateWorkspace((prev) => ({
                ...prev,
                expressions: prev.expressions.map((e) => (e.id === id ? { ...e, ...patch } : e)),
              }))}
              onAddExpression={(expr) => updateExpressions((prev) => [...prev, expr])}
              onDeleteExpression={(id) => updateExpressions((prev) => prev.filter((e) => e.id !== id))}
              onDuplicateExpression={(id) => updateExpressions((prev) => {
                const src = prev.find((e) => e.id === id);
                return src ? [...prev, duplicateExpression(src, prev)] : prev;
              })}
              onConvertToTable={handleConvertToTable}
              onUpdateTableRows={handleUpdateTableRows}
              onFocusExpression={setFocusedExprId}
            />
          </Panel>
          <PanelResizeHandle className="calc-panel-resize" />
          <Panel minSize={40}>
            <main className="calc-main-canvas">
              {workspace.panel.collapsed ? (
                <button
                  type="button"
                  className="calc-panel-expand-btn"
                  onClick={() => {
                    exprPanelRef.current?.expand();
                    updateWorkspace((prev) => ({ ...prev, panel: { ...prev.panel, collapsed: false } }));
                  }}
                  aria-label="Show expressions panel"
                  title="Show expressions"
                >
                  <ChevronRight size={18} />
                </button>
              ) : null}
              <GraphCanvas
                viewport={workspace.viewport}
                viewportEpoch={viewportEpoch}
                onViewportCommit={(vp) => updateWorkspace((prev) => ({ ...prev, viewport: stabilizeViewport(vp) }))}
                onUserViewportChange={handleUserViewport}
                compiled={compiled}
                scope={scope}
                expressions={workspace.expressions}
                settings={workspace.settings}
                onHome={handleHome}
                onAutoFit={handleAutoFit}
                onUpdateSettings={(patch) => updateWorkspace((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))}
                onUpdateViewport={(vp) => {
                  setViewportEpoch((n) => n + 1);
                  updateWorkspace((prev) => ({ ...prev, viewport: stabilizeViewport(vp) }));
                }}
                keyboardTab={workspace.keyboard.tab}
                onKeyboardTabChange={(tab) => updateWorkspace((prev) => ({ ...prev, keyboard: { ...prev.keyboard, tab } }))}
                points={graphPoints}
                onAddPointToList={handleAddPointToList}
                onKeyboardInsert={handleKeyboardInsert}
              />
            </main>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
