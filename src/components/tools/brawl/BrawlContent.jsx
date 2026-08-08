import { useCallback, useEffect, useMemo, useState } from 'react';
import BrawlDraftBoard from '@/components/tools/brawl/BrawlDraftBoard';
import BrawlTeamTools from '@/components/tools/brawl/BrawlTeamTools';
import { DRAFT_MODES } from '@/lib/tools/brawl/draft-roles';
import { useUiStore } from '@/store/uiStore';

/** @typedef {'ranked' | 'team'} BrawlWorkspaceMode */
/** @typedef {'solo' | 'trio'} BrawlDraftScope */

const LAST_META_KEY = 'plexity:brawl:last-session';

/**
 * @param {{ mode: BrawlWorkspaceMode, scope: BrawlDraftScope }} state
 */
export function resolveBrawlPanel({ mode, scope }) {
  if (mode === 'team') return 'team';
  return scope === 'trio' ? 'ranked-trio' : 'ranked-solo';
}

function readLastMeta() {
  try {
    const raw = localStorage.getItem(LAST_META_KEY);
    if (!raw) return { gameMode: '', scope: /** @type {BrawlDraftScope} */ ('trio') };
    const parsed = JSON.parse(raw);
    return {
      gameMode: typeof parsed?.gameMode === 'string' ? parsed.gameMode : '',
      scope: parsed?.scope === 'solo' ? 'solo' : 'trio',
    };
  } catch {
    return { gameMode: '', scope: /** @type {BrawlDraftScope} */ ('trio') };
  }
}

/**
 * @param {{
 *   label: string,
 *   value: string,
 *   options: { value: string, label: string }[],
 *   onChange: (value: string) => void,
 *   variant?: 'accent' | 'chrome',
 * }} props
 */
function BrawlSlider({ label, value, options, onChange, variant = 'chrome' }) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const count = Math.max(options.length, 1);

  return (
    <div
      className={`tools-brawl-slider tools-brawl-slider--${variant}`}
      role="group"
      aria-label={label}
      data-active-index={activeIndex}
      style={{ '--brawl-slider-count': String(count) }}
    >
      <div className="tools-brawl-slider-track">
        <div
          className="tools-brawl-slider-thumb"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          aria-hidden
        />
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={value === opt.value ? 'is-active' : undefined}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BrawlContent() {
  const initial = readLastMeta();
  const [workspaceMode, setWorkspaceMode] = useState(/** @type {BrawlWorkspaceMode} */ ('ranked'));
  const [draftScope, setDraftScope] = useState(/** @type {BrawlDraftScope} */ (initial.scope || 'trio'));
  const [preferredMode, setPreferredMode] = useState(initial.gameMode || '');
  const chromeCollapsed = useUiStore((s) => s.toolsChromeCollapsed);
  const setChromeCollapsed = useUiStore((s) => s.setToolsChromeCollapsed);

  const panel = useMemo(
    () => resolveBrawlPanel({ mode: workspaceMode, scope: draftScope }),
    [workspaceMode, draftScope],
  );

  const rankedOpen = panel === 'ranked-solo' || panel === 'ranked-trio';

  useEffect(() => {
    if (rankedOpen) setChromeCollapsed(true);
  }, [rankedOpen, setChromeCollapsed]);

  const onSessionMeta = useCallback((meta) => {
    const gameMode = meta?.gameMode || '';
    const scope = meta?.scope === 'solo' ? 'solo' : 'trio';
    try {
      localStorage.setItem(LAST_META_KEY, JSON.stringify({ gameMode, scope }));
    } catch { /* ignore */ }
    if (gameMode) setPreferredMode(gameMode);
  }, []);

  const openRanked = useCallback((opts = {}) => {
    if (opts.scope === 'solo' || opts.scope === 'trio') setDraftScope(opts.scope);
    if (opts.gameMode) setPreferredMode(opts.gameMode);
    setWorkspaceMode('ranked');
  }, []);

  const lastModeLabel = DRAFT_MODES.find((m) => m.id === preferredMode)?.label || preferredMode;

  return (
    <div className={`tools-brawl-shell${rankedOpen ? ' tools-brawl-shell--arena' : ''}${chromeCollapsed && rankedOpen ? ' is-chrome-hidden' : ''}`}>
      {!(chromeCollapsed && rankedOpen) ? (
        <header className="tools-brawl-header">
          <div className="tools-brawl-header-left">
            {workspaceMode === 'ranked' ? (
              <BrawlSlider
                label="Draft scope"
                value={draftScope}
                onChange={setDraftScope}
                variant="accent"
                options={[
                  { value: 'solo', label: 'Solo' },
                  { value: 'trio', label: 'Trio' },
                ]}
              />
            ) : null}
          </div>
          <div className="tools-brawl-header-right">
            <BrawlSlider
              label="Workspace"
              value={workspaceMode}
              onChange={setWorkspaceMode}
              variant="chrome"
              options={[
                { value: 'ranked', label: 'Ranked' },
                { value: 'team', label: 'Team' },
              ]}
            />
          </div>
        </header>
      ) : null}

      <main className="tools-brawl-main" data-panel={panel}>
        {panel === 'ranked-solo' && (
          <BrawlDraftBoard
            scope="solo"
            preferredMode={preferredMode}
            onSessionMeta={onSessionMeta}
          />
        )}
        {panel === 'ranked-trio' && (
          <BrawlDraftBoard
            scope="trio"
            preferredMode={preferredMode}
            onSessionMeta={onSessionMeta}
          />
        )}
        {panel === 'team' && (
          <BrawlTeamTools
            lastGameMode={preferredMode}
            lastModeLabel={lastModeLabel}
            lastScope={draftScope}
            onOpenRanked={openRanked}
          />
        )}
      </main>
    </div>
  );
}
