import { useEffect, useState } from 'react';
import { LogOut, Maximize2, Pause, Play, Square, Volume2, X } from 'lucide-react';
import { formatFocusTimer, useFocusClock } from '@/components/tools/focus/focus-time';
import { FOCUS_AMBIENT_SOUNDS, useFocusAmbientSound } from '@/components/tools/focus/useFocusAmbientSound';

export default function FocusSession({
  phase,
  timeLeft,
  running,
  workMin,
  breakMin,
  waitingForResume,
  ambientSound,
  ambientVolume,
  onAmbientSoundChange,
  onAmbientVolumeChange,
  onPause,
  onResume,
  onResumeWork,
  onEndSession,
  onLeave,
}) {
  const [soundOpen, setSoundOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const { clock, isPm } = useFocusClock(true);

  useFocusAmbientSound(ambientSound, ambientVolume, true);

  useEffect(() => {
    if (!soundOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSoundOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [soundOpen]);

  const phaseLabel = waitingForResume
    ? 'Break complete'
    : phase === 'work'
      ? 'Focus'
      : 'Break';

  return (
    <div className="tools-focus-card tools-focus-card--session">
      <div className="tools-focus-session">
        <div className="tools-focus-session-topbar">
          <button type="button" className="tools-focus-topbar-btn" onClick={onLeave}>
            <LogOut size={14} />
            Leave
          </button>

          <div className="tools-focus-topbar-center">
            <button
              type="button"
              className={`tools-focus-topbar-btn${soundOpen ? ' active' : ''}`}
              onClick={() => setSoundOpen((v) => !v)}
              aria-expanded={soundOpen}
            >
              <Volume2 size={14} />
              Sound
            </button>
            <button
              type="button"
              className="tools-focus-clock-btn"
              onClick={() => setClockOpen(true)}
              aria-label="Open clock overlay"
            >
              <span className="tools-focus-clock-btn-time">{clock}</span>
              <span className="tools-focus-clock-btn-ampm">{isPm ? 'PM' : 'AM'}</span>
              <Maximize2 size={12} />
            </button>
          </div>
        </div>

        {soundOpen && (
          <div className="tools-focus-ambient-panel">
            <div className="tools-focus-ambient-sounds" role="group" aria-label="Ambient sounds">
              {FOCUS_AMBIENT_SOUNDS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`tools-focus-preset-chip${ambientSound === s.id ? ' active' : ''}`}
                  onClick={() => onAmbientSoundChange(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <label className="tools-focus-ambient-volume" htmlFor="focusAmbientVolume">
              Volume
              <input
                id="focusAmbientVolume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ambientVolume}
                onChange={(e) => onAmbientVolumeChange(Number(e.target.value))}
              />
            </label>
          </div>
        )}

        <div className="tools-focus-session-stage">
          <div className="tools-pomodoro-phase-label">{phaseLabel}</div>
          <div className="tools-segment-clock tools-segment-clock--pomo">{formatFocusTimer(timeLeft)}</div>
          <div className="tools-focus-session-submeta">
            {phase === 'work' || waitingForResume
              ? `${workMin} min work`
              : `${breakMin} min break`}
          </div>
        </div>

        <div className="tools-focus-actions">
          {waitingForResume ? (
            <button type="button" className="tools-focus-btn tools-focus-btn--primary" onClick={onResumeWork}>
              <Play size={14} />
              Resume Work
            </button>
          ) : !running ? (
            <button type="button" className="tools-focus-btn tools-focus-btn--primary" onClick={onResume}>
              <Play size={14} />
              Resume
            </button>
          ) : (
            <button type="button" className="tools-focus-btn" onClick={onPause}>
              <Pause size={14} />
              Pause
            </button>
          )}
          <button type="button" className="tools-focus-btn" onClick={onEndSession}>
            <Square size={14} />
            End Session
          </button>
        </div>
      </div>

      {clockOpen && (
        <div className="tools-focus-clock-overlay" role="dialog" aria-label="Live clock">
          <button
            type="button"
            className="tools-focus-clock-overlay-close"
            onClick={() => setClockOpen(false)}
            aria-label="Close clock"
          >
            <X size={18} />
          </button>
          <div className="tools-focus-clock-row">
            <div className="tools-segment-clock">{clock}</div>
            <div className="tools-ampm-stack">
              <div className={`tools-ampm-pill${!isPm ? ' active' : ''}`}>AM</div>
              <div className={`tools-ampm-pill${isPm ? ' active' : ''}`}>PM</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
