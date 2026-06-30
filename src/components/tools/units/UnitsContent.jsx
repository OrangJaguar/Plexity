import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, History, Pin, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import UnitsPinModal from '@/components/tools/units/UnitsPinModal';
import {
  UNIT_CATEGORIES,
  convertUnits,
  defaultUnitsForCategory,
  finalizeAmount,
  formatConverted,
  getAlternateUnits,
  getCategoryLabel,
  getConversionFormula,
  getUnitLabel,
  getUnitsForCategory,
  normalizeAmountInput,
} from '@/lib/tools/unit-convert';
import {
  addHistoryEntry,
  addPinnedPair,
  clearHistory,
  readUnitsUiPrefs,
  removeHistoryEntry,
  removePinnedPair,
} from '@/lib/tools/units-ui-prefs';

function CopyableValue({ value, className = '' }) {
  const copy = async () => {
    if (!value || value === '—') return;
    try {
      await navigator.clipboard.writeText(String(value));
      toast.success('Copied to clipboard', { duration: 1800 });
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <button type="button" className={`tools-units-copyable ${className}`} onClick={copy} title="Copy">
      {value}
    </button>
  );
}

function FormulaPeek({ expanded, onToggle, formula, compact = false }) {
  const lines = formula.split('\n').filter(Boolean);

  return (
    <div
      className={[
        'tools-units-formula-peek',
        expanded ? 'is-expanded' : '',
        compact ? 'tools-units-formula-peek--compact' : '',
      ].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className="tools-units-formula-tab"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide conversion formula' : 'Show conversion formula'}
      />
      <div className="tools-units-formula-panel">
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function ConverterBox({
  amount,
  fromUnit,
  toUnit,
  category,
  onAmountChange,
  onAmountBlur,
  onFromChange,
  onToChange,
  onSwap,
  emphasized = false,
  formulaKey,
  expandedFormulas,
  onToggleFormula,
}) {
  const units = getUnitsForCategory(category);
  const result = convertUnits(amount, fromUnit, toUnit, category);
  const formula = getConversionFormula(category, fromUnit, toUnit, amount);
  const expanded = expandedFormulas.has(formulaKey);

  return (
    <div className={`tools-units-box-wrap${emphasized ? ' tools-units-box-wrap--main' : ''}`}>
      <div className={`tools-units-box${emphasized ? ' tools-units-box--main' : ''}`}>
        <div className="tools-units-converter">
          <div className="tools-units-field">
            {emphasized && <label className="tools-settings-label" htmlFor="units-from-amount">Amount</label>}
            <input
              id={emphasized ? 'units-from-amount' : undefined}
              className="tools-settings-input"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              onBlur={onAmountBlur}
            />
            <select
              className="tools-settings-input"
              value={fromUnit}
              onChange={(e) => onFromChange(e.target.value)}
              aria-label="From unit"
            >
              {units.map((u) => (
                <option key={u} value={u}>{getUnitLabel(u)}</option>
              ))}
            </select>
          </div>

          <button type="button" className="btn btn-sm tools-units-swap" onClick={onSwap} aria-label="Swap units">
            <ArrowLeftRight size={16} />
          </button>

          <div className="tools-units-field">
            {emphasized && <label className="tools-settings-label" htmlFor="units-result">Result</label>}
            <CopyableValue
              value={formatConverted(result)}
              className="tools-units-copyable tools-units-result"
            />
            <select
              className="tools-settings-input"
              value={toUnit}
              onChange={(e) => onToChange(e.target.value)}
              aria-label="To unit"
            >
              {units.map((u) => (
                <option key={u} value={u}>{getUnitLabel(u)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <FormulaPeek
        expanded={expanded}
        onToggle={() => onToggleFormula(formulaKey)}
        formula={formula}
        compact={!emphasized}
      />
    </div>
  );
}

function AltUnitCard({
  slotId,
  amount,
  fromUnit,
  category,
  defaultUnit,
  selectedUnit,
  onUnitChange,
  expandedFormulas,
  onToggleFormula,
}) {
  const toUnit = selectedUnit || defaultUnit;
  const result = convertUnits(amount, fromUnit, toUnit, category);
  const formula = getConversionFormula(category, fromUnit, toUnit, amount);
  const formulaKey = `alt:${slotId}:${toUnit}`;
  const units = getUnitsForCategory(category);

  return (
    <div className="tools-units-box-wrap tools-units-box-wrap--alt">
      <div className="tools-units-box tools-units-box--alt">
        <CopyableValue value={formatConverted(result)} className="tools-units-copyable tools-units-result tools-units-result--alt" />
        <select
          className="tools-settings-input"
          value={toUnit}
          onChange={(e) => onUnitChange(slotId, e.target.value)}
          aria-label="Alternate unit"
        >
          {units.map((u) => (
            <option key={u} value={u}>{getUnitLabel(u)}</option>
          ))}
        </select>
      </div>
      <FormulaPeek
        expanded={expandedFormulas.has(formulaKey)}
        onToggle={() => onToggleFormula(formulaKey)}
        formula={formula}
        compact
      />
    </div>
  );
}

export default function UnitsContent() {
  const [category, setCategory] = useState('length');
  const [amount, setAmount] = useState('0');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('km');
  const [pinOpen, setPinOpen] = useState(false);
  const [uiPrefs, setUiPrefs] = useState(() => readUnitsUiPrefs());
  const [expandedFormulas, setExpandedFormulas] = useState(() => new Set());
  const [altSelections, setAltSelections] = useState({});
  const historyTimer = useRef(null);
  const amountDirtyRef = useRef(false);
  const conversionRef = useRef({ category, amount, fromUnit, toUnit });

  conversionRef.current = { category, amount, fromUnit, toUnit };

  const alternateUnits = useMemo(
    () => getAlternateUnits(category, [fromUnit, toUnit]),
    [category, fromUnit, toUnit],
  );

  const applyConversion = useCallback((next) => {
    amountDirtyRef.current = false;
    setCategory(next.category);
    setAmount(finalizeAmount(next.amount ?? '0'));
    setFromUnit(next.from);
    setToUnit(next.to);
    setAltSelections({});
  }, []);

  const handleCategoryChange = (next) => {
    amountDirtyRef.current = false;
    const { from, to } = defaultUnitsForCategory(next);
    setCategory(next);
    setAmount('0');
    setFromUnit(from);
    setToUnit(to);
    setAltSelections({});
  };

  const handleAmountChange = (raw) => {
    amountDirtyRef.current = true;
    setAmount(normalizeAmountInput(raw));
  };

  const handleAmountBlur = () => {
    setAmount((prev) => finalizeAmount(prev));
  };

  const toggleFormula = (key) => {
    setExpandedFormulas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const refreshPrefs = () => setUiPrefs(readUnitsUiPrefs());

  const handlePin = (pair) => {
    addPinnedPair(pair);
    refreshPrefs();
    toast.success('Pair pinned.');
  };

  const handleApplyPinned = (pair) => {
    applyConversion({ ...pair, amount: '0' });
  };

  const handleApplyHistory = (entry) => {
    amountDirtyRef.current = false;
    applyConversion(entry);
    refreshPrefs();
  };

  useEffect(() => {
    if (!amountDirtyRef.current) return undefined;
    if (historyTimer.current) clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => {
      const { category: cat, amount: amt, fromUnit: from, toUnit: to } = conversionRef.current;
      const n = Number(finalizeAmount(amt));
      if (!Number.isFinite(n) || n === 0) return;
      addHistoryEntry({ category: cat, amount: String(n), from, to });
      refreshPrefs();
    }, 1800);
    return () => {
      if (historyTimer.current) clearTimeout(historyTimer.current);
    };
  }, [amount]);

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  return (
    <div className="tools-units-layout">
      <div className="tools-units-main">
        <div className="tools-units-tabs" role="tablist" aria-label="Conversion category">
          {UNIT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              className={category === c.id ? 'active' : ''}
              onClick={() => handleCategoryChange(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <ConverterBox
          amount={amount}
          fromUnit={fromUnit}
          toUnit={toUnit}
          category={category}
          onAmountChange={handleAmountChange}
          onAmountBlur={handleAmountBlur}
          onFromChange={setFromUnit}
          onToChange={setToUnit}
          onSwap={swap}
          emphasized
          formulaKey="main"
          expandedFormulas={expandedFormulas}
          onToggleFormula={toggleFormula}
        />

        {category === 'currency' && (
          <p className="tools-units-note">
            Exchange rates are approximate and for quick reference only.
          </p>
        )}

        {alternateUnits.length > 0 && (
          <div className="tools-units-alt-grid">
            {alternateUnits.map((unit) => (
              <AltUnitCard
                key={unit}
                slotId={unit}
                amount={amount}
                fromUnit={fromUnit}
                category={category}
                defaultUnit={unit}
                selectedUnit={altSelections[unit]}
                onUnitChange={(slotId, nextUnit) => {
                  setAltSelections((prev) => ({ ...prev, [slotId]: nextUnit }));
                }}
                expandedFormulas={expandedFormulas}
                onToggleFormula={toggleFormula}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="tools-units-sidebar">
        <button type="button" className="tools-units-sidebar-btn" onClick={() => setPinOpen(true)}>
          <Pin size={14} />
          Pin pair
        </button>

        {uiPrefs.pinnedPairs.length > 0 && (
          <div className="tools-units-sidebar-section">
            {uiPrefs.pinnedPairs.map((pair) => (
              <div key={pair.id} className="tools-units-sidebar-item">
                <button
                  type="button"
                  className="tools-units-sidebar-item-main"
                  onClick={() => handleApplyPinned(pair)}
                >
                  <span className="tools-units-sidebar-item-label">
                    {getCategoryLabel(pair.category)}
                  </span>
                  <span className="tools-units-sidebar-item-detail">
                    {getUnitLabel(pair.from)}
                    {' → '}
                    {getUnitLabel(pair.to)}
                  </span>
                </button>
                <button
                  type="button"
                  className="tools-units-sidebar-item-remove"
                  onClick={() => { removePinnedPair(pair.id); refreshPrefs(); }}
                  aria-label="Remove pin"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="tools-units-sidebar-section-head">
          <span className="tools-units-sidebar-section-title">
            <History size={14} />
            History
          </span>
          {uiPrefs.history.length > 0 && (
            <button
              type="button"
              className="tools-units-sidebar-clear"
              onClick={() => { clearHistory(); refreshPrefs(); }}
            >
              Delete all
            </button>
          )}
        </div>

        <div className="tools-units-sidebar-section tools-units-sidebar-section--history">
          {!uiPrefs.history.length && (
            <p className="tools-units-sidebar-empty">Type an amount and wait a moment — conversions appear here.</p>
          )}
          {uiPrefs.history.map((entry) => (
            <div key={entry.id} className="tools-units-sidebar-item">
              <button
                type="button"
                className="tools-units-sidebar-item-main"
                onClick={() => handleApplyHistory(entry)}
              >
                <span className="tools-units-sidebar-item-label">
                  {entry.amount}
                  {' '}
                  {getUnitLabel(entry.from)}
                  {' → '}
                  {formatConverted(convertUnits(entry.amount, entry.from, entry.to, entry.category))}
                  {' '}
                  {getUnitLabel(entry.to)}
                </span>
                <span className="tools-units-sidebar-item-detail">{getCategoryLabel(entry.category)}</span>
              </button>
              <button
                type="button"
                className="tools-units-sidebar-item-remove"
                onClick={() => { removeHistoryEntry(entry.id); refreshPrefs(); }}
                aria-label="Remove from history"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <UnitsPinModal open={pinOpen} onOpenChange={setPinOpen} onPin={handlePin} />
    </div>
  );
}
