import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import TypingResults from '@/components/tools/typing/TypingResults';
import {
  TIME_COUNTS,
  WORD_COUNTS,
  compileResults,
  createSample,
  generatePrompt,
  getWordSpans,
  isTestComplete,
} from '@/lib/tools/typing-engine';

const DEFAULTS = {
  mode: 'time',
  count: 30,
  punctuation: false,
  numbers: false,
};

function buildPrompt(settings) {
  return generatePrompt({
    mode: settings.mode,
    count: settings.count,
    punctuation: settings.punctuation,
    numbers: settings.numbers,
  });
}

function SettingsRail({ settings, countChips, onApply, onRestart }) {
  return (
    <>
      <div className="tools-typing-rail-group">
        <button
          type="button"
          className={`tools-typing-rail-btn${settings.punctuation ? ' is-active' : ''}`}
          onClick={() => onApply({ punctuation: !settings.punctuation })}
        >
          @ punctuation
        </button>
        <button
          type="button"
          className={`tools-typing-rail-btn${settings.numbers ? ' is-active' : ''}`}
          onClick={() => onApply({ numbers: !settings.numbers })}
        >
          # numbers
        </button>
      </div>

      <span className="tools-typing-rail-sep" aria-hidden />

      <div className="tools-typing-rail-group">
        <button
          type="button"
          className={`tools-typing-rail-btn${settings.mode === 'time' ? ' is-active' : ''}`}
          onClick={() => onApply({ mode: 'time' })}
        >
          time
        </button>
        <button
          type="button"
          className={`tools-typing-rail-btn${settings.mode === 'words' ? ' is-active' : ''}`}
          onClick={() => onApply({ mode: 'words' })}
        >
          words
        </button>
      </div>

      <span className="tools-typing-rail-sep" aria-hidden />

      <div className="tools-typing-rail-group" role="group" aria-label="Test length">
        {countChips.map((n) => (
          <button
            key={n}
            type="button"
            className={`tools-typing-rail-chip${settings.count === n ? ' is-active' : ''}`}
            onClick={() => onApply({ count: n })}
          >
            {n}
          </button>
        ))}
      </div>

      <span className="tools-typing-rail-sep" aria-hidden />

      <button
        type="button"
        className="tools-typing-rail-icon"
        onClick={onRestart}
        aria-label="Restart test"
      >
        <RotateCcw size={15} />
      </button>
    </>
  );
}

export default function TypingContent() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [prompt, setPrompt] = useState(() => buildPrompt(DEFAULTS));
  const [typed, setTyped] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [results, setResults] = useState(null);

  const inputRef = useRef(null);
  const stageRef = useRef(null);
  const startRef = useRef(null);
  const samplesRef = useRef([]);
  const typedRef = useRef('');
  const promptRef = useRef(prompt);
  const settingsRef = useRef(settings);
  const finishingRef = useRef(false);

  typedRef.current = typed;
  promptRef.current = prompt;
  settingsRef.current = settings;

  const spans = useMemo(() => getWordSpans(prompt), [prompt]);
  const cursorIndex = typed.length;

  const timeLeft = Math.max(0, settings.count - Math.floor(elapsedMs / 1000));
  const activeTimer = settings.mode === 'time'
    ? timeLeft
    : Math.floor(elapsedMs / 1000);

  const finishTest = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    const finalTyped = typedRef.current;
    const finalPrompt = promptRef.current;
    const finalSettings = settingsRef.current;
    const finalElapsed = startRef.current ? Date.now() - startRef.current : 0;

    if (startRef.current) {
      samplesRef.current.push(createSample(finalElapsed, finalTyped, finalPrompt));
    }

    setFinished(true);
    setElapsedMs(finalElapsed);
    setResults(compileResults({
      typed: finalTyped,
      target: finalPrompt,
      elapsedMs: finalElapsed,
      samples: samplesRef.current,
      mode: finalSettings.mode,
      count: finalSettings.count,
    }));
  }, []);

  const restart = useCallback((nextSettings = settingsRef.current) => {
    const newPrompt = buildPrompt(nextSettings);
    setSettings(nextSettings);
    setPrompt(newPrompt);
    setTyped('');
    setStarted(false);
    setFinished(false);
    setElapsedMs(0);
    setResults(null);
    startRef.current = null;
    samplesRef.current = [];
    finishingRef.current = false;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const applySettings = useCallback((patch) => {
    const next = { ...settingsRef.current, ...patch };
    if (patch.mode && patch.mode !== settingsRef.current.mode) {
      next.count = patch.mode === 'time' ? 30 : 25;
    }
    restart(next);
  }, [restart]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!started || finished) return undefined;

    const id = window.setInterval(() => {
      if (!startRef.current) return;
      const nextElapsed = Date.now() - startRef.current;
      setElapsedMs(nextElapsed);
      samplesRef.current.push(createSample(nextElapsed, typedRef.current, promptRef.current));

      if (isTestComplete({
        mode: settingsRef.current.mode,
        count: settingsRef.current.count,
        elapsedMs: nextElapsed,
        typed: typedRef.current,
        target: promptRef.current,
      })) {
        finishTest();
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [started, finished, finishTest]);

  const handleInput = (value) => {
    if (finished) return;

    const isFirstKey = !started && value.length > 0;
    if (isFirstKey) {
      setStarted(true);
      startRef.current = Date.now();
    }

    setTyped(value);
    typedRef.current = value;

    const elapsed = startRef.current ? Date.now() - startRef.current : 0;
    if ((isFirstKey || started) && isTestComplete({
      mode: settingsRef.current.mode,
      count: settingsRef.current.count,
      elapsedMs: elapsed,
      typed: value,
      target: promptRef.current,
    })) {
      finishTest();
    }
  };

  const renderChar = (char, idx) => {
    const inputChar = typed[idx];
    let cls = 'tools-typing-char tools-typing-char--pending';

    if (inputChar != null) {
      cls = inputChar === char
        ? 'tools-typing-char tools-typing-char--correct'
        : 'tools-typing-char tools-typing-char--wrong';
    }

    return (
      <span key={idx} className={cls}>
        {char}
      </span>
    );
  };

  const countChips = settings.mode === 'time' ? TIME_COUNTS : WORD_COUNTS;
  const showSettingsRail = !started || finished;
  const showActiveHeader = started && !finished;

  return (
    <div className={`tools-typing-page${started ? ' tools-typing-page--active' : ''}${finished ? ' tools-typing-page--finished' : ''}`}>
      <header className="tools-typing-header">
        {showSettingsRail && (
          <div className="tools-typing-rail" role="toolbar" aria-label="Typing test controls">
            <SettingsRail
              settings={settings}
              countChips={countChips}
              onApply={applySettings}
              onRestart={() => restart()}
            />
          </div>
        )}

        {showActiveHeader && (
          <div className="tools-typing-active-bar">
            <div className="tools-typing-timer" aria-live="polite">
              {activeTimer}
            </div>
            <button
              type="button"
              className="tools-typing-rail-icon"
              onClick={() => restart()}
              aria-label="Restart test"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        )}
      </header>

      <div className="tools-typing-stage-wrap">
        {finished && results ? (
          <TypingResults results={results} onRestart={() => restart()} />
        ) : (
          <div
            ref={stageRef}
            className="tools-typing-stage"
            onClick={() => inputRef.current?.focus()}
            role="textbox"
            tabIndex={-1}
            aria-label="Typing test"
          >
            <div className="tools-typing-words">
              {spans.map((span) => (
                <span
                  key={`${span.start}-${span.text}`}
                  className={`tools-typing-word${span.isSpace ? ' tools-typing-word--space' : ''}`}
                >
                  {span.isSpace
                    ? renderChar(' ', span.start)
                    : span.text.split('').map((char, offset) => renderChar(char, span.start + offset))}
                </span>
              ))}
              {typed.length > prompt.length && (
                <span className="tools-typing-extra">
                  {typed.slice(prompt.length).split('').map((char, i) => (
                    <span key={`extra-${i}`} className="tools-typing-char tools-typing-char--wrong">
                      {char}
                    </span>
                  ))}
                </span>
              )}
            </div>

            <textarea
              ref={inputRef}
              className="tools-typing-input"
              value={typed}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') e.preventDefault();
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              aria-hidden
              tabIndex={-1}
            />
          </div>
        )}
      </div>
    </div>
  );
}
