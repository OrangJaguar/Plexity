import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import FocusSetup from '@/components/tools/focus/FocusSetup';
import FocusSession from '@/components/tools/focus/FocusSession';
import FocusSummary from '@/components/tools/focus/FocusSummary';
import FocusContextPanel from '@/components/tools/focus/FocusContextPanel';
import { sendFocusNotification } from '@/components/tools/focus/focus-time';
import { createFocusSession, countFocusSessionsToday } from '@/api/entities/toolsFocusSessions';
import { useToolsSettings } from '@/hooks/queries/useToolsSettings';
import { useUpdatePreferences } from '@/hooks/mutations/usePreferencesMutations';
import { useToolsTasks } from '@/hooks/queries/useToolsTasks';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';

function clampMinutes(value, fallback, min = 1, max = 180) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export default function FocusContent({ tasks: tasksProp, events }) {
  const queryClient = useQueryClient();
  const { settings, isLoading: settingsLoading } = useToolsSettings();
  const updatePrefs = useUpdatePreferences();
  const { tasks: tasksFromHook, updateTask } = useToolsTasks();
  const tasks = tasksProp?.length ? tasksProp : tasksFromHook;
  const { action, clearAction } = useCommandBarDraft('action');

  const [screen, setScreen] = useState('setup');
  const [preset, setPreset] = useState('standard');
  const [customWorkMin, setCustomWorkMin] = useState(25);
  const [customBreakMin, setCustomBreakMin] = useState(5);
  const [ambientSound, setAmbientSound] = useState('off');
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [pinnedTaskId, setPinnedTaskId] = useState(null);

  const [sessionId, setSessionId] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [goal, setGoal] = useState('');
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [waitingForResume, setWaitingForResume] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [goalAchieved, setGoalAchieved] = useState(null);
  const [sessionsToday, setSessionsToday] = useState(0);

  const tickRef = useRef(null);
  const prefsHydrated = useRef(false);
  const phaseRef = useRef(phase);
  const workMinRef = useRef(workMin);
  const breakMinRef = useRef(breakMin);

  phaseRef.current = phase;
  workMinRef.current = workMin;
  breakMinRef.current = breakMin;

  useEffect(() => {
    if (settingsLoading || prefsHydrated.current) return;
    prefsHydrated.current = true;
    setPreset(settings.focusLastPreset || 'standard');
    setCustomWorkMin(settings.focusCustomWorkMin ?? 25);
    setCustomBreakMin(settings.focusCustomBreakMin ?? 5);
    setAmbientSound(settings.focusAmbientSound ?? 'off');
    setAmbientVolume(settings.focusAmbientVolume ?? 0.5);
  }, [settings, settingsLoading]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const persistPreset = useCallback((nextPreset, nextCustom = {}) => {
    const patch = { focusLastPreset: nextPreset };
    if (nextPreset === 'custom') {
      if (nextCustom.workMin != null) patch.focusCustomWorkMin = clampMinutes(nextCustom.workMin, 25);
      if (nextCustom.breakMin != null) patch.focusCustomBreakMin = clampMinutes(nextCustom.breakMin, 5, 1, 60);
    }
    updatePrefs.mutate(patch);
  }, [updatePrefs]);

  const handlePresetChange = (nextPreset) => {
    setPreset(nextPreset);
    persistPreset(nextPreset);
  };

  const handleCustomChange = ({ workMin: w, breakMin: b }) => {
    const nextWork = w != null ? clampMinutes(w, customWorkMin) : customWorkMin;
    const nextBreak = b != null ? clampMinutes(b, customBreakMin, 1, 60) : customBreakMin;
    if (w != null) setCustomWorkMin(nextWork);
    if (b != null) setCustomBreakMin(nextBreak);
    persistPreset('custom', { workMin: nextWork, breakMin: nextBreak });
  };

  const handleAmbientSoundChange = (soundId) => {
    setAmbientSound(soundId);
    updatePrefs.mutate({ focusAmbientSound: soundId });
  };

  const handleAmbientVolumeChange = (volume) => {
    setAmbientVolume(volume);
    updatePrefs.mutate({ focusAmbientVolume: volume });
  };

  const resetSessionState = () => {
    setSessionId(null);
    setStartedAt(null);
    setGoal('');
    setPhase('work');
    setTimeLeft(25 * 60);
    setRunning(false);
    setWaitingForResume(false);
    setElapsedSeconds(0);
    setPauseCount(0);
    setCyclesCompleted(0);
    setGoalAchieved(null);
  };

  const handleStart = ({ goal: nextGoal, preset: nextPreset, workMin: w, breakMin: b }) => {
    const workSec = Math.round(w * 60);
    setSessionId(crypto.randomUUID());
    setStartedAt(Date.now());
    setGoal(nextGoal);
    setPreset(nextPreset);
    setWorkMin(w);
    setBreakMin(b);
    setPhase('work');
    setTimeLeft(workSec);
    setRunning(true);
    setWaitingForResume(false);
    setElapsedSeconds(0);
    setPauseCount(0);
    setCyclesCompleted(0);
    setGoalAchieved(null);
    setScreen('session');
    persistPreset(nextPreset, nextPreset === 'custom' ? { workMin: w, breakMin: b } : {});
  };

  useEffect(() => {
    if (!action || action.actionId !== 'startFocus') return;
    const { minutes, mode, taskId, taskTitle } = action.payload || {};
    if (taskId) setPinnedTaskId(taskId);
    if (mode === 'break') {
      const breakMins = minutes || 5;
      setSessionId(crypto.randomUUID());
      setStartedAt(Date.now());
      setGoal('Break');
      setPreset('custom');
      setBreakMin(breakMins);
      setPhase('break');
      setTimeLeft(Math.round(breakMins * 60));
      setRunning(true);
      setScreen('session');
    } else {
      handleStart({
        goal: taskTitle || '',
        preset: 'custom',
        workMin: minutes || customWorkMin,
        breakMin: customBreakMin,
      });
    }
    clearAction();
  }, [action, clearAction, customBreakMin, customWorkMin]);

  useEffect(() => {
    if (screen !== 'session' || !running) {
      if (tickRef.current) clearInterval(tickRef.current);
      return undefined;
    }

    tickRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 1) {
          setElapsedSeconds((e) => e + 1);
          return prev - 1;
        }

        const currentPhase = phaseRef.current;
        setElapsedSeconds((e) => e + 1);

        if (currentPhase === 'work') {
          setCyclesCompleted((c) => c + 1);
          sendFocusNotification(
            'Work session complete',
            `Break timer started for ${breakMinRef.current} min.`,
          );
          setPhase('break');
          phaseRef.current = 'break';
          return Math.round(breakMinRef.current * 60);
        }

        if (currentPhase === 'break') {
          setRunning(false);
          setWaitingForResume(true);
          sendFocusNotification('Break complete', 'Tap Resume Work when you are ready.');
          return 0;
        }

        return 0;
      });
    }, 1000);

    return () => clearInterval(tickRef.current);
  }, [screen, running]);

  const finishSession = () => {
    setRunning(false);
    setScreen('summary');
    void countFocusSessionsToday().then((todayCount) => {
      setSessionsToday(todayCount + 1);
    });
  };

  const handlePause = () => {
    setRunning(false);
    setPauseCount((c) => c + 1);
  };

  const handleResume = () => {
    setRunning(true);
  };

  const handleResumeWork = () => {
    setWaitingForResume(false);
    setPhase('work');
    setTimeLeft(Math.round(workMin * 60));
    setRunning(true);
  };

  const handleSummaryDone = () => {
    const endedAt = Date.now();
    const payload = {
      sessionId: sessionId || crypto.randomUUID(),
      startedAt: startedAt || endedAt,
      endedAt,
      preset,
      workMinutes: workMin,
      breakMinutes: breakMin,
      goal,
      goalAchieved: goalAchieved ?? false,
      pauseCount,
      cyclesCompleted,
      elapsedSeconds,
    };

    resetSessionState();
    setScreen('setup');

    void (async () => {
      try {
        await createFocusSession(payload);
        queryClient.invalidateQueries({ queryKey: ['toolsFocusSessions'] });
      } catch {
        /* UI already returned to setup; session stats were in-memory only */
      }
    })();
  };

  const handleToggleTask = async (task, completed) => {
    await updateTask(task.taskId, { completed });
  };

  return (
    <div className="tools-focus-shell">
      <div className="tools-focus-layout">
        <div className="tools-focus-center-stage">
          {screen === 'setup' && (
            <FocusSetup
              preset={preset}
              customWorkMin={customWorkMin}
              customBreakMin={customBreakMin}
              onPresetChange={handlePresetChange}
              onCustomChange={handleCustomChange}
              onStart={handleStart}
            />
          )}
          {screen === 'session' && (
            <FocusSession
              phase={phase}
              timeLeft={timeLeft}
              running={running}
              workMin={workMin}
              breakMin={breakMin}
              waitingForResume={waitingForResume}
              ambientSound={ambientSound}
              ambientVolume={ambientVolume}
              onAmbientSoundChange={handleAmbientSoundChange}
              onAmbientVolumeChange={handleAmbientVolumeChange}
              onPause={handlePause}
              onResume={handleResume}
              onResumeWork={handleResumeWork}
              onEndSession={finishSession}
              onLeave={finishSession}
            />
          )}
          {screen === 'summary' && (
            <FocusSummary
              elapsedSeconds={elapsedSeconds}
              cyclesCompleted={cyclesCompleted}
              pauseCount={pauseCount}
              goal={goal}
              goalAchieved={goalAchieved}
              sessionsToday={sessionsToday}
              onGoalAchievedChange={setGoalAchieved}
              onDone={handleSummaryDone}
            />
          )}
        </div>

        <FocusContextPanel
          tasks={tasks}
          events={events}
          pinnedTaskId={pinnedTaskId}
          onPinTask={setPinnedTaskId}
          onToggleTask={handleToggleTask}
        />
      </div>
    </div>
  );
}
