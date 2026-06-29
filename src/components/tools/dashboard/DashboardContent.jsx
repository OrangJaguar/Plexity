import { useEffect, useRef, useState } from 'react';
import ToolsBox from '@/components/tools/shared/ToolsBox';
import DailyIntelligencePanel from '@/components/tools/dashboard/DailyIntelligencePanel';
import ScheduleSetupPrompt from '@/components/tools/dashboard/ScheduleSetupPrompt';
import { getDashboardStateFromEngine } from '@/lib/tools/schedule-engine';
import { normalizeSchedule } from '@/lib/tools/schedule-data';
import { updateSchedule } from '@/api/entities/toolsSchedule';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';

function useDashboardTicker(schedule, events) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return getDashboardStateFromEngine(now, normalizeSchedule(schedule), events);
}

export default function DashboardContent({ schedule, tasks = [], events = [], onCompleteTask }) {
  const state = useDashboardTicker(schedule, events);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [intelExpanded, setIntelExpanded] = useState(true);
  const expandRef = useRef(null);
  const norm = normalizeSchedule(schedule);
  const { action, clearAction } = useCommandBarDraft('action');

  useEffect(() => {
    if (action?.actionId !== 'openDebrief') return;
    setIntelExpanded(true);
    clearAction();
    requestAnimationFrame(() => {
      document.querySelector('.tools-intel-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [action, clearAction]);

  useEffect(() => {
    if (!scheduleExpanded) return undefined;
    const onClick = (e) => {
      if (expandRef.current && !expandRef.current.contains(e.target)) {
        const statCard = e.target.closest('.tools-box--clickable');
        if (!statCard) setScheduleExpanded(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [scheduleExpanded]);

  const toggleSchedule = () => setScheduleExpanded((v) => !v);

  const toggleDayType = async () => {
    const next = norm.dayTypeOverride === 'A' ? 'B' : 'A';
    try {
      await updateSchedule({ dayTypeOverride: next });
    } catch { /* local only */ }
  };

  const shellClass = [
    'tools-shell',
    'tools-shell-dashboard',
    intelExpanded ? 'intel-expanded' : 'intel-collapsed',
    !state.hasSchedule ? 'tools-shell-dashboard--no-schedule' : '',
  ].filter(Boolean).join(' ');

  const countdownClass = `tools-value tools-countdown-value${intelExpanded ? ' tools-countdown-value--compact' : ' tools-countdown-value--large'}`;

  const mainCluster = (
    <div className="tools-dashboard-cluster">
      {norm.useAbTemplates && (
        <div className="tools-day-type-bar">
          <span>Day type:</span>
          <button type="button" className="tools-day-type-chip" onClick={toggleDayType}>
            {norm.dayTypeOverride || norm.activeTemplate || 'A'}
          </button>
        </div>
      )}

      {!state.hasSchedule && (
        <ScheduleSetupPrompt />
      )}

      {state.hasSchedule && (
        <>
          <div className="tools-grid-top">
            <ToolsBox title="NOW" className="tools-box--clickable" onClick={toggleSchedule}>
              <div className="tools-value-sm">{state.now}</div>
            </ToolsBox>
            <ToolsBox title="UNTIL" className="tools-box--clickable" onClick={toggleSchedule}>
              <div className="tools-value-sm">{state.until}</div>
            </ToolsBox>
            <ToolsBox title="NEXT" className="tools-box--clickable" onClick={toggleSchedule}>
              <div className="tools-value-sm">{state.next}</div>
            </ToolsBox>
          </div>

          {scheduleExpanded && (
            <div ref={expandRef} className="tools-schedule-inline-expand">
              {state.timeline.map((block, i) => (
                <div
                  key={block.id || i}
                  className={`tools-schedule-inline-row${i === state.currentIndex ? ' current' : ''}`}
                >
                  <span>{block.title}</span>
                  <span className="meta">
                    {block.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {' – '}
                    {block.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {(!intelExpanded || !state.hasSchedule) && (
        <ToolsBox className={`tools-countdown-area${intelExpanded ? ' tools-countdown-area--compact' : ' tools-countdown-area--large'}`}>
          <div className={countdownClass}>{state.countdown}</div>
        </ToolsBox>
      )}

      {intelExpanded && state.hasSchedule && (
        <ToolsBox className="tools-countdown-area tools-countdown-area--compact">
          <div className={countdownClass}>{state.countdown}</div>
        </ToolsBox>
      )}
    </div>
  );

  return (
    <div className={shellClass}>
      <div className="tools-dashboard-main">
        {mainCluster}
        {!intelExpanded && (
          <DailyIntelligencePanel
            schedule={norm}
            tasks={tasks}
            events={events}
            expanded={false}
            onExpandedChange={setIntelExpanded}
            onCompleteTask={onCompleteTask}
          />
        )}
      </div>
      {intelExpanded && (
        <DailyIntelligencePanel
          schedule={norm}
          tasks={tasks}
          events={events}
          expanded
          onExpandedChange={setIntelExpanded}
          onCompleteTask={onCompleteTask}
        />
      )}
    </div>
  );
}
