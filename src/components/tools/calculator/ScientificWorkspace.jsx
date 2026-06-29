import { useMemo, useState } from 'react';
import MathEditor from '@/components/tools/calculator/MathEditor';
import { tryParse } from '@/lib/tools/calculator/parser/parser';
import { createEvalContext, tryEvaluate } from '@/lib/tools/calculator/engine/evaluator';
import { formatResult, formatError } from '@/lib/tools/calculator/engine/format-results';
import { ExactBadge } from '@/components/tools/calculator/calculator-shared';

export default function ScientificWorkspace({ settings, history, onAddHistory, onUpdateSettings }) {
  const [input, setInput] = useState('');
  const [display, setDisplay] = useState('0');
  const [lastAns, setLastAns] = useState(0);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    const parsed = tryParse(input.replace(/\bans\b/gi, String(lastAns)));
    if (!parsed.ok) return { error: parsed.error };
    const ctx = createEvalContext({ angleMode: settings.angleMode, vars: { ans: lastAns } });
    const ev = tryEvaluate(parsed.ast, ctx);
    if (!ev.ok) return { error: ev.error };
    return formatResult(ev.value, settings);
  }, [input, lastAns, settings]);

  const handleEquals = () => {
    if (!result || result.error) return;
    const val = Number(result.text);
    if (Number.isFinite(val)) {
      setLastAns(val);
      setDisplay(result.text);
      onAddHistory?.({ input, output: result.text, exact: result.exact, at: Date.now() });
      setInput('');
    }
  };

  return (
    <div className="calc-scientific">
      <div className="calc-scientific-display">
        <div className="calc-scientific-result">{display}</div>
        {result && !result.error ? <ExactBadge exact={result.exact} /> : null}
      </div>
      <MathEditor value={input} onChange={setInput} onSubmit={handleEquals} placeholder="Enter calculation…" error={result?.error ? formatError(result.error) : ''} />
      <div className="calc-scientific-controls">
        <label>
          Angle
          <select value={settings.angleMode} onChange={(e) => onUpdateSettings({ angleMode: e.target.value })}>
            <option value="RAD">RAD</option>
            <option value="DEG">DEG</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={settings.fractionDisplay} onChange={(e) => onUpdateSettings({ fractionDisplay: e.target.checked })} />
          Fractions
        </label>
        <button type="button" onClick={handleEquals} className="calc-scientific-equals">=</button>
        <button type="button" onClick={() => setInput((v) => `${v}ans`)} className="calc-scientific-ans">ANS</button>
      </div>
      <div className="calc-scientific-history">
        <h3>History</h3>
        <ul>
          {history.slice().reverse().slice(0, 20).map((h) => (
            <li key={h.at}>
              <span>{h.input}</span>
              <span>= {h.output}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
