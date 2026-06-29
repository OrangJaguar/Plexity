import { useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import MathEditor from '@/components/tools/calculator/MathEditor';
import { ExactBadge } from '@/components/tools/calculator/calculator-shared';
import { runCasOperation } from '@/lib/tools/calculator/engine/symbolic';

const OPERATIONS = [
  'simplify', 'expand', 'factor', 'solve', 'substitute', 'derivative', 'integral', 'limit',
];

export default function CasWorkspace({ onCopyToExpression }) {
  const [input, setInput] = useState('x^2 + 2*x + 1');
  const [operation, setOperation] = useState('simplify');
  const [substVar, setSubstVar] = useState('x');
  const [substVal, setSubstVal] = useState('2');

  const result = useMemo(() => runCasOperation(operation, input, { variable: substVar, value: substVal }), [operation, input, substVar, substVal]);

  let rendered = '';
  if (result.ok) {
    try {
      rendered = katex.renderToString(result.display || '', { throwOnError: false });
    } catch {
      rendered = result.display || '';
    }
  }

  return (
    <div className="calc-cas">
      <div className="calc-cas-sidebar">
        <h3>CAS</h3>
        <select value={operation} onChange={(e) => setOperation(e.target.value)}>
          {OPERATIONS.map((op) => <option key={op} value={op}>{op}</option>)}
        </select>
        {operation === 'substitute' ? (
          <div className="calc-cas-subst">
            <input value={substVar} onChange={(e) => setSubstVar(e.target.value)} placeholder="variable" />
            <input value={substVal} onChange={(e) => setSubstVal(e.target.value)} placeholder="value" />
          </div>
        ) : null}
      </div>
      <div className="calc-cas-main">
        <MathEditor value={input} onChange={setInput} placeholder="Symbolic expression…" />
        <div className="calc-cas-result">
          {result.ok ? (
            <>
              <ExactBadge exact={result.exact} />
              <div dangerouslySetInnerHTML={{ __html: rendered }} />
              <button type="button" onClick={() => onCopyToExpression?.(result.display)}>Copy to expressions</button>
            </>
          ) : (
            <p className="calc-cas-error">{result.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
