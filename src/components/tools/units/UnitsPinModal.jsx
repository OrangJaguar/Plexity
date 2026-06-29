import { useEffect, useState } from 'react';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import {
  UNIT_CATEGORIES,
  defaultUnitsForCategory,
  getUnitLabel,
  getUnitsForCategory,
} from '@/lib/tools/unit-convert';

export default function UnitsPinModal({ open, onOpenChange, onPin }) {
  const [category, setCategory] = useState('length');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('km');

  useEffect(() => {
    if (!open) return;
    const { from, to } = defaultUnitsForCategory(category);
    setFromUnit(from);
    setToUnit(to);
  }, [open, category]);

  const units = getUnitsForCategory(category);

  const handlePin = () => {
    onPin({ category, from: fromUnit, to: toUnit });
    onOpenChange(false);
  };

  return (
    <ToolsModal
      open={open}
      onOpenChange={onOpenChange}
      title="Pin conversion pair"
      maxWidth="400px"
      className="tools-units-pin-modal"
    >
      <div className="tools-units-pin-modal-body">
        <p className="tools-units-pin-modal-lead">Save a favorite conversion to the sidebar.</p>
        <div className="tools-modal-rows">
          <div className="tools-modal-field">
            <label htmlFor="units-pin-category">Category</label>
            <select
              id="units-pin-category"
              className="tools-settings-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {UNIT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="tools-modal-field">
            <label htmlFor="units-pin-from">From</label>
            <select
              id="units-pin-from"
              className="tools-settings-input"
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
            >
              {units.map((u) => (
                <option key={u} value={u}>{getUnitLabel(u)}</option>
              ))}
            </select>
          </div>
          <div className="tools-modal-field">
            <label htmlFor="units-pin-to">To</label>
            <select
              id="units-pin-to"
              className="tools-settings-input"
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
            >
              {units.map((u) => (
                <option key={u} value={u}>{getUnitLabel(u)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="tools-modal-actions">
          <button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handlePin}>Pin</button>
        </div>
      </div>
    </ToolsModal>
  );
}
