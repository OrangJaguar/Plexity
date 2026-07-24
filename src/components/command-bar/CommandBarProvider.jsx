import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Square, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import PlexityLogo from '@/components/layout/PlexityLogo';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalToolSurface } from '@/hooks/useToolSurface';
import { useToolsTasks } from '@/hooks/queries/useToolsTasks';
import { useToolsCalendarEvents } from '@/hooks/queries/useToolsCalendarEvents';
import { useToolsSchedule } from '@/hooks/queries/useToolsSchedule';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { runCommandAssistant } from '@/lib/tools/command-executor';
import { buildCommandBarAction, buildCommandBarNavigation } from '@/lib/tools/command-bar-draft';
import {
  formatEventPreview,
  formatTaskPreview,
} from '@/lib/tools/command-parser';
import { resolvePageContext, getPlaceholderForPage } from '@/lib/tools/command-page-context';
import { isSlashPickerOpen, validateSlashInput, handleSlashInputChange } from '@/lib/tools/command-registry';
import SlashCommandMenu, { useSlashMenuState } from '@/components/command-bar/SlashCommandMenu';

const CommandBarContext = createContext(null);

const VOICE_ALIASES = [
  [/^(add|create)\s+(a\s+)?task\b/i, '/task '],
  [/^(add|create|schedule)\s+(an?\s+)?event\b/i, '/event '],
  [/^(go to|open)\s+/i, '/goto '],
  [/^(what|when|how|show|tell)\b/i, '/ask '],
];

function normalizeCommandInput(text) {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.startsWith('/')) return trimmed;
  for (const [re, prefix] of VOICE_ALIASES) {
    if (re.test(trimmed)) return `${prefix}${trimmed}`;
  }
  return trimmed;
}

function CommandBarPreviewCard({ result, kind, onKindChange, onOpen, onCancel }) {
  const isEvent = kind === 'event';
  const summary = isEvent
    ? (result.events || []).map(formatEventPreview).join(' · ') || result.preview
    : formatTaskPreview(result.task || {});

  return (
    <div className="command-bar-response">
      <p className="command-bar-response-label">Ready to review</p>
      <p className="command-bar-response-body">{summary}</p>
      <p className="command-bar-response-hint">
        {isEvent
          ? 'Calendar events need a specific time (e.g. “meeting Tuesday 3pm”).'
          : 'Tasks work for homework and due dates without a set time.'}
      </p>
      <div className="command-bar-kind-toggle" role="group" aria-label="Open as">
        <button
          type="button"
          className={!isEvent ? 'active' : ''}
          onClick={() => onKindChange('task')}
        >
          Task
        </button>
        <button
          type="button"
          className={isEvent ? 'active' : ''}
          onClick={() => onKindChange('event')}
        >
          Event
        </button>
      </div>
      <div className="command-bar-response-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onOpen}>
          {isEvent ? 'Open calendar editor' : 'Open task editor'}
        </button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function CommandBarProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { surface, basePath } = useOptionalToolSurface();
  const routeOpts = useMemo(() => ({ surface, basePath }), [surface, basePath]);
  const { tasks } = useToolsTasks();
  const { events } = useToolsCalendarEvents();
  const { data: schedule } = useToolsSchedule();

  const pageContext = useMemo(
    () => resolvePageContext(location.pathname),
    [location.pathname],
  );
  const placeholder = useMemo(
    () => getPlaceholderForPage(pageContext.pageId),
    [pageContext.pageId],
  );

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [slashHint, setSlashHint] = useState('');
  const [slashError, setSlashError] = useState('');
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [kind, setKind] = useState('task');
  const [error, setError] = useState('');

  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const { visible: slashVisible, items: slashItems, activeIndex: slashIndex, setActiveIndex: setSlashIndex } = useSlashMenuState(input, pageContext.pageId);

  const { listening, requesting, toggle: toggleMic, stop: stopMic, supported: micSupported } = useSpeechRecognition({
    onTranscript: setInput,
  });

  const close = useCallback(() => {
    abortRef.current?.abort();
    stopMic();
    setOpen(false);
    setPhase('idle');
    setResult(null);
    setKind('task');
    setError('');
    setInput('');
    setSlashHint('');
    setSlashError('');
  }, [stopMic]);

  const openBar = useCallback(() => {
    setOpen(true);
    setPhase('idle');
    setResult(null);
    setKind('task');
    setError('');
    setSlashHint('');
    setSlashError('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const openDraftEditor = useCallback((confirmResult, draftKind) => {
    const { route, state } = buildCommandBarNavigation(confirmResult, draftKind, routeOpts);
    const label = draftKind === 'event' ? 'calendar event' : 'task';
    toast.message(`Opening ${label} editor…`, { duration: 2200 });
    navigate(route, { state });
    close();
  }, [close, navigate, routeOpts]);

  const applySlashSelection = useCallback((cmd) => {
    const next = `${cmd.label} `;
    setInput(next);
    setSlashHint(cmd.hint || '');
    setSlashError('');
    setSlashIndex(0);
    setPhase('idle');
    setResult(null);
    setError('');
    setTimeout(() => {
      inputRef.current?.focus();
      const len = next.length;
      inputRef.current?.setSelectionRange(len, len);
    }, 0);
  }, [setSlashIndex]);

  const handleNavigateResult = useCallback((out) => {
    toast.message('Opening…', { duration: 1800 });
    navigate(out.route);
    close();
  }, [close, navigate]);

  const handleActionResult = useCallback((out) => {
    const { route, state } = buildCommandBarAction(out, routeOpts);
    toast.message('Running command…', { duration: 1800 });
    navigate(route, { state });
    close();
  }, [close, navigate, routeOpts]);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const isCmdK = mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k';
      const isCmdShiftSpace = mod && e.shiftKey && e.code === 'Space';
      if (isCmdK || isCmdShiftSpace) {
        e.preventDefault();
        if (open) close();
        else openBar();
        return;
      }
      if (e.key === 'Escape' && open) {
        if (slashVisible && input.startsWith('/')) {
          e.preventDefault();
          setInput('');
          setSlashHint('');
          setSlashError('');
          return;
        }
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, openBar, slashVisible, input]);

  useEffect(() => {
    if (!open) stopMic();
  }, [open, stopMic]);

  const handleInputChange = (e) => {
    const next = e.target.value;
    const resolved = handleSlashInputChange(input, next);
    setInput(resolved.input);
    if (resolved.slashError !== undefined) setSlashError(resolved.slashError || '');
    if (resolved.slashHint === null) setSlashHint('');
    else if (resolved.slashHint !== undefined) setSlashHint(resolved.slashHint);
    if (resolved.slashError || resolved.slashHint !== undefined) {
      setPhase('idle');
      setResult(null);
      setError('');
    }
  };

  const stopThinking = () => {
    abortRef.current?.abort();
    setPhase('idle');
    setError('Stopped.');
  };

  const submit = async () => {
    const raw = input.trim();
    if (!raw || phase === 'thinking') return;

    if (slashError) return;

    if (isSlashPickerOpen(input)) {
      if (slashItems.length) {
        applySlashSelection(slashItems[slashIndex] || slashItems[0]);
        return;
      }
      const msg = 'No matching command. Type / to see what\'s available on this page.';
      setError(msg);
      setResult({ type: 'answer', answer: msg });
      setPhase('result');
      return;
    }

    const slashCheck = validateSlashInput(raw);
    if (!slashCheck.valid) {
      setError(slashCheck.error);
      setResult({ type: 'answer', answer: slashCheck.error });
      setPhase('result');
      return;
    }

    const text = normalizeCommandInput(raw);

    setPhase('thinking');
    setError('');
    setResult(null);
    abortRef.current = new AbortController();

    try {
      const out = await runCommandAssistant(text, {
        tasks,
        events,
        schedule,
        pageContext,
        routeOpts,
        signal: abortRef.current.signal,
      });
      setResult(out);
      if (out.type === 'navigate') {
        handleNavigateResult(out);
        return;
      }
      if (out.type === 'action') {
        handleActionResult(out);
        return;
      }
      if (out.type === 'confirm') {
        const detected = out.intent === 'create_events' ? 'event' : 'task';
        setKind(detected);
        setPhase('preview');
      } else {
        setPhase('result');
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Something went wrong.');
      setPhase('result');
    }
  };

  const handleMic = () => {
    if (!micSupported) return;
    toggleMic(input);
  };

  const handleInputKeyDown = (e) => {
    const pickerOpen = isSlashPickerOpen(input);

    if (pickerOpen && slashItems.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashItems.length) % slashItems.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        applySlashSelection(slashItems[slashIndex] || slashItems[0]);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'preview' && result?.type === 'confirm') {
        openDraftEditor(result, kind);
      } else {
        submit();
      }
    }
  };

  const value = { open, openBar, close };

  const showSlashEmpty = isSlashPickerOpen(input) && slashItems.length === 0 && input.length > 1;

  const bar = open && isAuthenticated ? (
    <>
      <div
        className="command-bar-backdrop"
        aria-hidden
        onMouseDown={close}
      />
      <div className="command-bar-root" role="dialog" aria-label="Plexity command bar">
      {phase === 'preview' && result?.type === 'confirm' && (
        <CommandBarPreviewCard
          result={result}
          kind={kind}
          onKindChange={setKind}
          onOpen={() => openDraftEditor(result, kind)}
          onCancel={() => { setPhase('idle'); setResult(null); setError(''); }}
        />
      )}

      {phase === 'result' && result && (
        <div className="command-bar-response">
          <p className="command-bar-response-body">{result.answer}</p>
          {error ? <p className="command-bar-error">{error}</p> : null}
        </div>
      )}

      <SlashCommandMenu
        input={input}
        pageId={pageContext.pageId}
        visible={slashVisible && phase !== 'thinking'}
        activeIndex={slashIndex}
        onSelect={applySlashSelection}
        onActiveIndexChange={setSlashIndex}
      />

      {showSlashEmpty && (
        <p className="command-bar-slash-empty">No matching commands — keep typing or press Backspace</p>
      )}

      {slashError ? (
        <p className="command-bar-slash-error">{slashError}</p>
      ) : slashHint ? (
        <p className="command-bar-slash-hint">{slashHint}</p>
      ) : null}

      <div className={`command-bar-pill${phase === 'thinking' ? ' thinking' : ''}`}>
        {phase === 'thinking' ? (
          <>
            <div className="command-bar-thinking-mark">
              <span className="command-bar-thinking-ring" aria-hidden />
              <PlexityLogo size={20} />
            </div>
            <span className="command-bar-thinking-text">Thinking…</span>
            <button type="button" className="command-bar-stop" onClick={stopThinking} aria-label="Stop">
              <Square size={14} fill="currentColor" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`command-bar-mic${listening || requesting ? ' active' : ''}`}
              onClick={handleMic}
              disabled={!micSupported}
              aria-label={listening ? 'Stop listening' : 'Voice input'}
              title={micSupported ? 'Voice input' : 'Voice not supported'}
            >
              {listening || requesting ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <input
              ref={inputRef}
              className="command-bar-input"
              type="text"
              placeholder={placeholder}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
            />
            <button
              type="button"
              className="command-bar-send"
              onClick={() => {
                if (phase === 'preview' && result?.type === 'confirm') {
                  openDraftEditor(result, kind);
                } else {
                  submit();
                }
              }}
              disabled={!input.trim() || phase === 'thinking' || Boolean(slashError)}
              aria-label="Send"
              title="Send"
            >
              <ArrowUp size={18} />
            </button>
          </>
        )}
      </div>
    </div>
    </>
  ) : null;

  return (
    <CommandBarContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' ? createPortal(bar, document.body) : null}
    </CommandBarContext.Provider>
  );
}

export function useCommandBar() {
  const ctx = useContext(CommandBarContext);
  if (!ctx) throw new Error('useCommandBar must be used within CommandBarProvider');
  return ctx;
}
