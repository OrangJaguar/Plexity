import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { loadBrawlCatalog, fetchBrawlApiMaps } from '@/api/brawl/catalog';
import { getWeeklyBrawlMetaPrior, saveWeeklyBrawlMetaPrior } from '@/api/brawl/metaPrior';
import { getToolRoute, getSettingsRoute } from '@/lib/tools/tool-routes';
import { parseMetaTierText, tiersMapToPayload } from '@/lib/tools/brawl/meta-prior';
import { DRAFT_MODES } from '@/lib/tools/brawl/draft-roles';
import { mapsForGameMode, normalizeRankedPoolByMode } from '@/lib/tools/brawl/map-pool';

/**
 * App-admin Brawl ops: weekly notes / per-mode ranked map pool / soft tier prior.
 * Route: /admin/brawledit
 */
export default function AdminBrawlPage() {
  const [notes, setNotes] = useState('');
  const [tiersText, setTiersText] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [apiMaps, setApiMaps] = useState([]);
  const [rankedPoolByMode, setRankedPoolByMode] = useState(() => normalizeRankedPoolByMode({}));
  const [activeMode, setActiveMode] = useState(DRAFT_MODES[0].id);
  const [customMap, setCustomMap] = useState('');
  const [showAllApiMaps, setShowAllApiMaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [prior, cat, mapList] = await Promise.all([
          getWeeklyBrawlMetaPrior().catch(() => null),
          loadBrawlCatalog().catch(() => []),
          fetchBrawlApiMaps().catch(() => []),
        ]);
        setCatalog(cat);
        setApiMaps(Array.isArray(mapList) ? mapList : []);
        if (prior?.payload) {
          setNotes(String(prior.payload.notes || ''));
          setRankedPoolByMode(normalizeRankedPoolByMode(
            prior.payload.rankedPoolByMode,
            Array.isArray(prior.payload.mapPool) ? prior.payload.mapPool : [],
          ));
          if (typeof prior.payload.tiersText === 'string' && prior.payload.tiersText.trim()) {
            setTiersText(prior.payload.tiersText);
          } else if (prior.payload.tiers && typeof prior.payload.tiers === 'object') {
            setTiersText(JSON.stringify(prior.payload.tiers, null, 2));
          }
          setUpdatedAt(prior.updated_at || null);
        }
        setDirty(false);
      } catch (err) {
        toast.error(err?.message || 'Failed to load admin Brawl data.');
      }
    })();
  }, []);

  const modeMaps = useMemo(
    () => mapsForGameMode(apiMaps, activeMode, { includeDisabled: true }),
    [apiMaps, activeMode],
  );

  const selectedList = rankedPoolByMode[activeMode] || [];
  const selectedSet = useMemo(
    () => new Set(selectedList.map((n) => n.toLowerCase())),
    [selectedList],
  );

  const visibleMaps = useMemo(() => {
    if (showAllApiMaps) return modeMaps;
    // Selected-only view + any selected custom names not in API
    const byLower = new Map(modeMaps.map((m) => [m.name.toLowerCase(), m]));
    return selectedList.map((name) => {
      const hit = byLower.get(name.toLowerCase());
      return hit || { name, id: undefined, disabled: false, imageUrl: null };
    });
  }, [showAllApiMaps, modeMaps, selectedList]);

  function markDirty() {
    setDirty(true);
  }

  function toggleMap(name, on) {
    markDirty();
    setRankedPoolByMode((prev) => {
      const cur = [...(prev[activeMode] || [])];
      const idx = cur.findIndex((n) => n.toLowerCase() === name.toLowerCase());
      if (on && idx < 0) cur.push(name);
      if (!on && idx >= 0) cur.splice(idx, 1);
      return { ...prev, [activeMode]: cur };
    });
  }

  function addCustom() {
    const name = customMap.trim();
    if (!name) return;
    toggleMap(name, true);
    setCustomMap('');
  }

  async function handleSave() {
    setBusy(true);
    try {
      const parsed = parseMetaTierText(tiersText, catalog);
      if (parsed.skipped.length) {
        toast.message(`Skipped ${parsed.skipped.length} tier row(s): ${parsed.skipped.slice(0, 5).join(', ')}${parsed.skipped.length > 5 ? '…' : ''}`);
      }
      const tiers = tiersMapToPayload(parsed.byId, catalog);
      const flatPool = Object.values(rankedPoolByMode).flat();
      const cleaned = normalizeRankedPoolByMode(rankedPoolByMode);

      const saved = await saveWeeklyBrawlMetaPrior({
        notes,
        rankedPoolByMode: cleaned,
        mapPool: flatPool,
        tiers,
        tiersText,
      });
      setRankedPoolByMode(cleaned);
      setUpdatedAt(saved.updated_at);
      setDirty(false);
      const total = Object.values(cleaned).reduce((n, arr) => n + (arr?.length || 0), 0);
      toast.success(`Saved ranked pools (${total} maps across modes).`);
    } catch (err) {
      toast.error(err?.message || 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  const totalSelected = Object.values(rankedPoolByMode).reduce((n, arr) => n + (arr?.length || 0), 0);

  return (
    <div className="tools-brawl-admin">
      <header className="tools-brawl-admin-header">
        <div>
          <p className="tools-brawl-empty-kicker">Admin</p>
          <h1>Brawl edit</h1>
          <p className="tools-settings-hint">
            Curate the Ranked map pool per mode. You must Save — then draft dropdowns use only these maps.
          </p>
        </div>
        <div className="tools-brawl-settings-actions">
          <Link to={getToolRoute('brawl')} className="btn btn-sm">Open tool</Link>
          <Link to={getSettingsRoute({ search: 'q=brawl' })} className="btn btn-sm">Settings</Link>
          <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={handleSave}>
            {busy ? 'Saving…' : dirty ? 'Save changes' : 'Save'}
          </button>
        </div>
      </header>

      {dirty ? (
        <p className="tools-brawl-admin-dirty">Unsaved map/notes changes — click Save or they won’t appear in Ranked.</p>
      ) : null}

      <section className="tools-brawl-team-card">
        <h2>Live catalog</h2>
        <p>
          {!catalog.length ? 'Loading…' : (
            <>
              <strong>{catalog.length}</strong>
              {' '}
              brawlers ·
              {' '}
              <strong>{apiMaps.length || '—'}</strong>
              {' '}
              API maps ·
              {' '}
              <strong>{totalSelected}</strong>
              {' '}
              in ranked pools
            </>
          )}
        </p>
      </section>

      <section className="tools-brawl-team-card">
        <h2>Weekly notes</h2>
        <textarea
          className="tools-settings-input tools-brawl-admin-textarea"
          rows={4}
          value={notes}
          onChange={(e) => { markDirty(); setNotes(e.target.value); }}
          placeholder="e.g. This week Knockout — prioritize anti-dive…"
        />
      </section>

      <section className="tools-brawl-team-card">
        <h2>Ranked map pool by mode</h2>
        <p className="tools-settings-hint">
          Default view = maps in the ranked pool only. Turn on “Browse API maps” to add/remove from the full list.
        </p>
        <div className="tools-brawl-admin-mode-tabs">
          {DRAFT_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`btn btn-sm${activeMode === m.id ? ' btn-primary' : ''}`}
              onClick={() => setActiveMode(m.id)}
            >
              {m.label}
              {' '}
              ({(rankedPoolByMode[m.id] || []).length})
            </button>
          ))}
        </div>
        <div className="tools-brawl-settings-actions" style={{ marginBottom: '0.65rem' }}>
          <button
            type="button"
            className={`btn btn-sm${showAllApiMaps ? ' btn-primary' : ''}`}
            onClick={() => setShowAllApiMaps((v) => !v)}
          >
            {showAllApiMaps ? 'Browsing API maps' : 'Browse API maps to add'}
          </button>
          <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={handleSave}>
            Save pool
          </button>
        </div>
        <div className="tools-brawl-admin-map-list">
          {visibleMaps.map((m) => {
            const on = selectedSet.has(m.name.toLowerCase());
            return (
              <label key={m.id || m.name} className={`tools-brawl-admin-map-row${m.disabled ? ' is-disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => toggleMap(m.name, e.target.checked)}
                />
                <span>{m.name}</span>
                {m.disabled ? <em>API disabled</em> : null}
                {on ? (
                  <button type="button" className="btn btn-sm" onClick={(e) => { e.preventDefault(); toggleMap(m.name, false); }}>
                    Remove
                  </button>
                ) : null}
              </label>
            );
          })}
          {!visibleMaps.length ? (
            <p className="tools-settings-hint">
              {showAllApiMaps
                ? 'No API maps for this mode.'
                : 'Pool empty — click “Browse API maps to add”, check ranked maps, then Save.'}
            </p>
          ) : null}
        </div>
        <div className="tools-brawl-settings-row">
          <input
            className="tools-settings-input tools-brawl-settings-grow"
            value={customMap}
            onChange={(e) => setCustomMap(e.target.value)}
            placeholder="Add custom ranked map name…"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          />
          <button type="button" className="btn btn-sm" onClick={addCustom}>Add</button>
        </div>
      </section>

      <section className="tools-brawl-team-card">
        <h2>Soft tier prior</h2>
        <textarea
          className="tools-settings-input tools-brawl-admin-textarea"
          rows={8}
          value={tiersText}
          onChange={(e) => { markDirty(); setTiersText(e.target.value); }}
          placeholder={'{\n  "Shelly": 70,\n  "Piper": "S"\n}'}
        />
        {updatedAt ? (
          <p className="tools-settings-hint">Last saved: {new Date(updatedAt).toLocaleString()}</p>
        ) : null}
        <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={handleSave}>
          {busy ? 'Saving…' : 'Save all'}
        </button>
      </section>
    </div>
  );
}
