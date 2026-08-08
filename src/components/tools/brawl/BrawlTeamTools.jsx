import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getSettingsRoute } from '@/lib/tools/tool-routes';
import { loadBrawlCatalog } from '@/api/brawl/catalog';
import { getBrawlPlayerLink, listBrawlRoster } from '@/api/brawl/playerLink';
import { listBrawlFitCache } from '@/api/brawl/fit';
import { getMyBrawlTrio } from '@/api/brawl/trio';
import { getWeeklyBrawlMetaPrior } from '@/api/brawl/metaPrior';
import {
  addBrawlUpgradeQueueItem,
  listBrawlUpgradeQueue,
  removeBrawlUpgradeQueueItem,
} from '@/api/brawl/upgradeQueue';

const MYTHIC_P11_TARGET = 12;

function statusFor(power, hasHc) {
  if (power == null) return 'locked';
  if (Number(power) >= 11) return hasHc ? 'p11-hc' : 'p11';
  if (Number(power) >= 9) return 'p9';
  return 'owned';
}

export default function BrawlTeamTools({
  lastGameMode = '',
  lastModeLabel = '',
  lastScope = 'solo',
  onOpenRanked,
}) {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [roster, setRoster] = useState([]);
  const [fit, setFit] = useState([]);
  const [trio, setTrio] = useState(null);
  const [queue, setQueue] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [link, setLink] = useState(null);

  const byId = useMemo(() => {
    const m = new Map();
    for (const c of catalog) m.set(c.id, c);
    return m;
  }, [catalog]);

  const fitById = useMemo(() => {
    const m = new Map();
    for (const f of fit) m.set(Number(f.brawler_id), f);
    return m;
  }, [fit]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, myRoster, myFit, myTrio, myLink, week] = await Promise.all([
        loadBrawlCatalog(),
        listBrawlRoster().catch(() => []),
        listBrawlFitCache().catch(() => []),
        getMyBrawlTrio().catch(() => null),
        getBrawlPlayerLink().catch(() => null),
        getWeeklyBrawlMetaPrior().catch(() => null),
      ]);
      setCatalog(cat);
      setRoster(myRoster);
      setFit(myFit);
      setTrio(myTrio);
      setLink(myLink);
      setWeekly(week);

      if (myTrio) {
        const q = await listBrawlUpgradeQueue().catch(() => []);
        setQueue(q);
      } else {
        setQueue([]);
      }
    } catch (err) {
      toast.error(err?.message || 'Could not load team tools.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const p11Count = roster.filter((r) => Number(r.power) >= 11).length;

  const gaps = useMemo(() => {
    const ownedP11 = new Set(
      roster.filter((r) => Number(r.power) >= 11).map((r) => Number(r.brawler_id)),
    );
    return fit
      .filter((f) => Number(f.fit) >= 70 && !ownedP11.has(Number(f.brawler_id)))
      .slice(0, 12)
      .map((f) => ({
        ...f,
        name: byId.get(Number(f.brawler_id))?.name || `#${f.brawler_id}`,
        imageUrl: byId.get(Number(f.brawler_id))?.imageUrl || null,
      }));
  }, [fit, roster, byId]);

  // High-fit owned but not P11 → upgrade candidates
  const upgradeCandidates = useMemo(() => {
    return roster
      .filter((r) => Number(r.power) < 11)
      .map((r) => {
        const f = fitById.get(Number(r.brawler_id));
        return {
          ...r,
          fit: f?.fit ?? 0,
          name: byId.get(Number(r.brawler_id))?.name || `#${r.brawler_id}`,
          imageUrl: byId.get(Number(r.brawler_id))?.imageUrl || null,
        };
      })
      .sort((a, b) => b.fit - a.fit)
      .slice(0, 16);
  }, [roster, fitById, byId]);

  if (loading) {
    return <div className="tools-brawl-empty"><p>Loading team tools…</p></div>;
  }

  if (!link?.player_tag) {
    return (
      <div className="tools-brawl-empty">
        <p className="tools-brawl-empty-kicker">Stack ops</p>
        <h2>Connect your tag</h2>
        <p>Sync your player in Settings to see readiness, gaps, and upgrade priority.</p>
        <Link to={getSettingsRoute({ search: 'q=brawl' })} className="btn btn-sm btn-primary">
          Open Brawl settings
        </Link>
      </div>
    );
  }

  return (
    <div className="tools-brawl-team">
      <section className="tools-brawl-team-card tools-brawl-team-card--resume">
        <h2>Between games</h2>
        <p className="tools-settings-hint">
          Readiness, upgrade queue, and weekly notes — then jump back into Ranked.
        </p>
        <div className="tools-brawl-settings-actions">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => onOpenRanked?.({
              scope: trio ? 'trio' : lastScope,
              gameMode: lastGameMode || undefined,
            })}
          >
            {lastModeLabel
              ? `Resume Ranked · ${lastModeLabel}`
              : 'Open Ranked'}
          </button>
          <Link to={getSettingsRoute({ search: 'q=brawl' })} className="btn btn-sm">
            Settings
          </Link>
        </div>
      </section>

      <section className="tools-brawl-team-card">
        <h2>Mythic readiness</h2>
        <p className="tools-brawl-team-metric">
          <strong>{p11Count}</strong>
          <span> / {MYTHIC_P11_TARGET} Power 11</span>
        </p>
        <div className="tools-brawl-team-bar">
          <div style={{ width: `${Math.min(100, (p11Count / MYTHIC_P11_TARGET) * 100)}%` }} />
        </div>
        {weekly?.payload?.notes ? (
          <p className="tools-brawl-team-notes">
            <strong>Weekly note</strong>
            <span>{String(weekly.payload.notes).slice(0, 280)}</span>
          </p>
        ) : (
          <p className="tools-settings-hint">No weekly note yet — add one in /admin/brawledit.</p>
        )}
      </section>

      <section className="tools-brawl-team-card">
        <h2>Your roster (by fit)</h2>
        <div className="tools-brawl-team-grid">
          {[...roster]
            .sort((a, b) => (fitById.get(Number(b.brawler_id))?.fit || 0) - (fitById.get(Number(a.brawler_id))?.fit || 0))
            .slice(0, 48)
            .map((r) => {
              const meta = byId.get(Number(r.brawler_id));
              const f = fitById.get(Number(r.brawler_id));
              const st = statusFor(r.power, r.has_hypercharge);
              return (
                <div key={r.id || r.brawler_id} className={`tools-brawl-team-cell is-${st}`}>
                  {meta?.imageUrl ? (
                    <img src={meta.imageUrl} alt="" className="tools-brawl-portrait" />
                  ) : (
                    <div className="tools-brawl-portrait tools-brawl-portrait--empty" />
                  )}
                  <div className="tools-brawl-team-cell-text">
                    <strong>{meta?.name || r.brawler_id}</strong>
                    <span>P{r.power ?? '—'} · {r.trophies ?? 0}t · fit {f?.fit ?? '—'}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <section className="tools-brawl-team-card">
        <h2>Upgrade next</h2>
        <p className="tools-settings-hint">Highest fit among brawlers you own below Power 11.</p>
        <div className="tools-brawl-team-grid">
          {upgradeCandidates.map((r) => (
            <div key={r.brawler_id} className="tools-brawl-team-cell">
              {r.imageUrl ? <img src={r.imageUrl} alt="" className="tools-brawl-portrait" /> : <div className="tools-brawl-portrait tools-brawl-portrait--empty" />}
              <div className="tools-brawl-team-cell-text">
                <strong>{r.name}</strong>
                <span>P{r.power} · fit {r.fit}</span>
              </div>
              {trio?.isAdmin ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={async () => {
                    try {
                      await addBrawlUpgradeQueueItem(r.brawler_id);
                      setQueue(await listBrawlUpgradeQueue());
                      toast.success('Added to shared queue.');
                    } catch (err) {
                      toast.error(err?.message || 'Could not add.');
                    }
                  }}
                >
                  Queue
                </button>
              ) : null}
            </div>
          ))}
          {!upgradeCandidates.length ? <p className="tools-settings-hint">Nothing below P11 — nice.</p> : null}
        </div>
      </section>

      {trio ? (
        <section className="tools-brawl-team-card">
          <h2>Shared upgrade queue</h2>
          <ul className="tools-brawl-settings-members">
            {queue.map((q) => (
              <li key={q.id}>
                <span>
                  {byId.get(Number(q.brawler_id))?.name || q.brawler_id}
                </span>
                {trio.isAdmin ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={async () => {
                      await removeBrawlUpgradeQueueItem(q.id);
                      setQueue(await listBrawlUpgradeQueue());
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
            {!queue.length ? <li><span className="tools-settings-hint">Queue empty</span></li> : null}
          </ul>
          <p className="tools-settings-hint">
            Trio: {trio.members.map((m) => m.nickname).join(' · ')}
          </p>
        </section>
      ) : (
        <section className="tools-brawl-team-card">
          <h2>Trio gaps</h2>
          <p className="tools-settings-hint">
            Create or join a trio in Settings to unlock the shared upgrade queue.
          </p>
          <Link to={getSettingsRoute({ search: 'q=brawl' })} className="btn btn-sm">Settings</Link>
        </section>
      )}

      {gaps.length ? (
        <section className="tools-brawl-team-card">
          <h2>High-fit gaps</h2>
          <p className="tools-settings-hint">Strong fit on your account but not yet Power 11 (or missing from roster sync).</p>
          <div className="tools-brawl-team-grid">
            {gaps.map((g) => (
              <div key={g.brawler_id} className="tools-brawl-team-cell">
                {g.imageUrl ? <img src={g.imageUrl} alt="" className="tools-brawl-portrait" /> : <div className="tools-brawl-portrait tools-brawl-portrait--empty" />}
                <div className="tools-brawl-team-cell-text">
                  <strong>{g.name}</strong>
                  <span>fit {g.fit}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
