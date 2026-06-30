import { X } from 'lucide-react';

const TABS = {
  numbers: ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '(', ')'],
  functions: ['sin(', 'cos(', 'tan(', 'sqrt(', 'log(', 'logb(2,', 'ln(', 'abs(', 'exp('],
  symbols: ['+', '-', '*', '/', '^', 'π', 'e', '=', '<', '>', ','],
  advanced: ['∫_{0}^{1} x^2 dx', '∫ x^2 dx', 'd/dx( )', 'lim_{x→0}( )', 'log(2, x)', 'nPr(, )', 'nCr(, )'],
};

export default function MathKeyboard({ visible, tab, onTabChange, onInsert, onClose, floating = false }) {
  if (!visible) return null;
  const keys = TABS[tab] || TABS.numbers;
  const isAdvanced = tab === 'advanced';

  return (
    <div className={`calc-keyboard ${floating ? 'is-floating' : ''}`}>
      <div className="calc-keyboard-header">
        <div className="calc-keyboard-tabs">
          {Object.keys(TABS).map((t) => (
            <button key={t} type="button" className={tab === t ? 'is-active' : ''} onClick={() => onTabChange(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button type="button" className="calc-icon-btn" onClick={onClose} aria-label="Close keyboard"><X size={14} /></button>
      </div>
      <div className={`calc-keyboard-grid ${isAdvanced ? 'is-advanced' : ''}`}>
        {keys.map((k) => (
          <button key={k} type="button" className="calc-key" onClick={() => onInsert(k)}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
