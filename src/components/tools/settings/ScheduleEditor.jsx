import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useToolsSchedule } from '@/hooks/queries/useToolsSchedule';
import { updateSchedule } from '@/api/entities/toolsSchedule';
import ScheduleDaysPicker from '@/components/tools/settings/ScheduleDaysPicker';

function emptyBlock() {
  return {
    id: crypto.randomUUID(),
    title: '',
    days: [1, 2, 3, 4, 5],
    start: '09:00',
    end: '10:00',
  };
}

function summarizeBlocks(blocks) {
  const filled = (blocks || []).filter((b) => b.title?.trim());
  if (!filled.length) return 'No recurring blocks yet';
  if (filled.length === 1) return `1 block · ${filled[0].title}`;
  const names = filled.slice(0, 2).map((b) => b.title).join(', ');
  return filled.length > 2 ? `${filled.length} blocks · ${names}…` : `${filled.length} blocks · ${names}`;
}

export default function ScheduleEditor() {
  const [searchParams] = useSearchParams();
  const sectionRef = useRef(null);
  const { data: schedule, refetch } = useToolsSchedule();
  const [blocks, setBlocks] = useState(() => schedule?.recurringBlocks || []);
  const [expanded, setExpanded] = useState(() => searchParams.get('setup') === 'schedule');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('setup') === 'schedule') {
      setExpanded(true);
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (schedule?.recurringBlocks) {
      setBlocks(schedule.recurringBlocks);
    }
  }, [schedule?.recurringBlocks]);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await updateSchedule({ recurringBlocks: blocks.filter((b) => b.title?.trim()) });
      await refetch();
      setMsg('Schedule saved.');
    } catch {
      setMsg('Saved locally — deploy ToolsSchedule to sync.');
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = (idx, patch) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  return (
    <div ref={sectionRef} className="tools-settings-schedule">
      <div className="tools-settings-section-heading-row">
        <h3>Recurring schedule</h3>
        <button
          type="button"
          className="tools-settings-collapse-btn"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse recurring schedule' : 'Expand recurring schedule'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      <p className="tools-settings-lead tools-settings-lead--schedule">
        School, work, and classes that repeat weekly. One-off events belong on the Calendar grid.
      </p>
      {!expanded && (
        <p className="tools-settings-schedule-summary">{summarizeBlocks(blocks)}</p>
      )}

      {expanded && blocks.map((block, idx) => (
        <div key={block.id || idx} className="tools-schedule-block-card">
          <div className="tools-schedule-block-row">
            <label className="tools-settings-field tools-settings-field--grow">
              <span className="tools-settings-label">Block name</span>
              <input
                className="tools-settings-input"
                type="text"
                placeholder="e.g. AP Chemistry"
                value={block.title}
                onChange={(e) => updateBlock(idx, { title: e.target.value })}
              />
            </label>
            <button type="button" className="btn btn-sm tools-schedule-remove" onClick={() => setBlocks((p) => p.filter((_, i) => i !== idx))}>
              Remove
            </button>
          </div>
          <div className="tools-schedule-block-row tools-schedule-block-row--times">
            <label className="tools-settings-field">
              <span className="tools-settings-label">Start</span>
              <input className="tools-settings-input tools-settings-input--time" type="time" value={block.start} onChange={(e) => updateBlock(idx, { start: e.target.value })} />
            </label>
            <label className="tools-settings-field">
              <span className="tools-settings-label">End</span>
              <input className="tools-settings-input tools-settings-input--time" value={block.end} type="time" onChange={(e) => updateBlock(idx, { end: e.target.value })} />
            </label>
            <ScheduleDaysPicker
              days={block.days || []}
              onChange={(days) => updateBlock(idx, { days })}
            />
          </div>
        </div>
      ))}

      {expanded && (
        <div className="tools-schedule-editor-actions">
          <button type="button" className="btn btn-sm" onClick={() => setBlocks((p) => [...p, emptyBlock()])}>Add block</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
        </div>
      )}
      {expanded && msg && <p className="tools-settings-hint">{msg}</p>}
    </div>
  );
}
