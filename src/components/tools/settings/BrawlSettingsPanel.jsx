import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { getToolRoute } from '@/lib/tools/tool-routes';
import {
  loadBrawlCatalog,
} from '@/api/brawl/catalog';
import {
  formatBrawlTagDisplay,
} from '@/api/brawl/tags';
import {
  getBrawlPlayerLink,
  syncBrawlPlayer,
  saveBrawlPlayerTag,
} from '@/api/brawl/playerLink';
import {
  BRAWL_POCKET_AVOID_CAP,
  addBrawlPocketOrAvoid,
  listBrawlPocketsAvoids,
  removeBrawlPocketOrAvoid,
} from '@/api/brawl/pockets';
import {
  createBrawlTrio,
  createBrawlTrioInvite,
  getMyBrawlTrio,
  joinBrawlTrioWithCode,
  kickBrawlTrioMember,
  leaveBrawlTrio,
  refreshMyTrioPlayerTag,
  transferBrawlTrioAdmin,
  updateMyBrawlNickname,
} from '@/api/brawl/trio';

function formatSyncedAt(ms) {
  if (!ms) return 'Never';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '—';
  }
}

function errMessage(err, fallback) {
  return err?.message || fallback;
}

export default function BrawlSettingsPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [link, setLink] = useState(null);
  const [pockets, setPockets] = useState([]);
  const [avoids, setAvoids] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [trioBundle, setTrioBundle] = useState(null);
  const [trioName, setTrioName] = useState('Trio');
  const [joinCode, setJoinCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');

  const nameById = useMemo(() => {
    const map = new Map();
    for (const row of catalog) {
      if (Number.isFinite(row.id)) map.set(row.id, row);
    }
    return map;
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    const list = [...catalog].sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }));
    if (!q) return list;
    return list.filter((b) => b.name.toLowerCase().includes(q));
  }, [catalog, catalogQuery]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [linkRow, pocketPack, trio, brawlers] = await Promise.all([
        getBrawlPlayerLink().catch(() => null),
        listBrawlPocketsAvoids().catch(() => ({ pockets: [], avoids: [] })),
        getMyBrawlTrio().catch(() => null),
        loadBrawlCatalog().catch(() => []),
      ]);
      setLink(linkRow);
      setTagInput(linkRow?.player_tag ? formatBrawlTagDisplay(linkRow.player_tag) : '');
      setPockets(pocketPack.pockets || []);
      setAvoids(pocketPack.avoids || []);
      setTrioBundle(trio);
      if (trio) {
        const me = trio.members.find((m) => m.user_id === user?.id);
        setNicknameDraft(me?.nickname || '');
      } else {
        setNicknameDraft('');
      }
      setCatalog(Array.isArray(brawlers) ? brawlers : []);
    } catch (err) {
      toast.error(errMessage(err, 'Could not load Brawl settings.'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const snapshot = link?.player_snapshot || {};

  async function handleSaveTag() {
    setBusy(true);
    try {
      const saved = await saveBrawlPlayerTag(tagInput);
      setLink(saved);
      setTagInput(formatBrawlTagDisplay(saved.player_tag));
      toast.success('Player tag saved.');
    } catch (err) {
      toast.error(errMessage(err, 'Could not save tag.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    try {
      const result = await syncBrawlPlayer(tagInput || link?.player_tag);
      setLink(result.link);
      setTagInput(formatBrawlTagDisplay(result.link.player_tag));
      await refreshMyTrioPlayerTag().catch(() => null);
      const trio = await getMyBrawlTrio().catch(() => null);
      setTrioBundle(trio);
      toast.success(`Synced ${result.rosterCount} brawlers (${result.p11Count} P11, ${result.fitCount || 0} fits).`);
    } catch (err) {
      toast.error(errMessage(err, 'Sync failed. Is the local proxy running?'));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddPin(kind, brawlerId) {
    setBusy(true);
    try {
      await addBrawlPocketOrAvoid(kind, brawlerId);
      const pack = await listBrawlPocketsAvoids();
      setPockets(pack.pockets);
      setAvoids(pack.avoids);
      toast.success(kind === 'pocket' ? 'Added pocket.' : 'Added avoid.');
    } catch (err) {
      toast.error(errMessage(err, 'Could not add.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemovePin(rowId) {
    setBusy(true);
    try {
      await removeBrawlPocketOrAvoid(rowId);
      const pack = await listBrawlPocketsAvoids();
      setPockets(pack.pockets);
      setAvoids(pack.avoids);
    } catch (err) {
      toast.error(errMessage(err, 'Could not remove.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTrio() {
    setBusy(true);
    try {
      const trio = await createBrawlTrio(trioName);
      setTrioBundle(trio);
      toast.success('Trio created — you are admin.');
    } catch (err) {
      toast.error(errMessage(err, 'Could not create trio.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite() {
    setBusy(true);
    try {
      const invite = await createBrawlTrioInvite();
      setInviteCode(invite.code);
      toast.success('Invite code ready (expires in ~15 min).');
    } catch (err) {
      toast.error(errMessage(err, 'Could not create invite.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    setBusy(true);
    try {
      const trio = await joinBrawlTrioWithCode(joinCode);
      setTrioBundle(trio);
      setJoinCode('');
      toast.success('Joined trio.');
    } catch (err) {
      toast.error(errMessage(err, 'Could not join.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveNickname() {
    setBusy(true);
    try {
      const trio = await updateMyBrawlNickname(nicknameDraft);
      setTrioBundle(trio);
      toast.success('Nickname updated.');
    } catch (err) {
      toast.error(errMessage(err, 'Could not update nickname.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="tools-settings-hint">Loading Brawl settings…</p>;
  }

  return (
    <div className="tools-brawl-settings">
      <div className="tools-settings-subsection">
        <h3>Player tag</h3>
        <p className="tools-settings-hint">
          Sync pulls your live roster through the Brawl Stars API proxy. Keep{' '}
          <code>npm run brawl:proxy</code> running locally (or deploy the Edge Function).
        </p>
        <div className="tools-brawl-settings-row">
          <label className="tools-settings-field tools-brawl-settings-grow">
            <span className="tools-settings-label">Tag</span>
            <input
              className="tools-settings-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="#2PPPPPPP"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="tools-brawl-settings-actions">
            <button type="button" className="btn btn-sm" disabled={busy} onClick={handleSaveTag}>
              Save
            </button>
            <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={handleSync}>
              Sync now
            </button>
          </div>
        </div>
        <div className="tools-brawl-settings-summary">
          <p>
            <strong>{snapshot.name || link?.display_name || '—'}</strong>
            {snapshot.trophies != null ? ` · ${snapshot.trophies} trophies` : ''}
          </p>
          <p className="tools-settings-hint">Last synced: {formatSyncedAt(link?.last_synced_at)}</p>
        </div>
      </div>

      <div className="tools-settings-subsection">
        <h3>Pockets &amp; avoids</h3>
        <p className="tools-settings-hint">
          Up to {BRAWL_POCKET_AVOID_CAP} each. Pockets boost draft fit; avoids demote auto-assign (Plan 05+).
        </p>
        <label className="tools-settings-field">
          <span className="tools-settings-label">Find brawler</span>
          <input
            className="tools-settings-input"
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            placeholder="Search catalog…"
          />
        </label>
        <div className="tools-brawl-settings-catalog">
          {filteredCatalog.map((b) => (
            <div key={b.id} className="tools-brawl-settings-catalog-row">
              <div className="tools-brawl-settings-catalog-identity">
                {b.imageUrl ? (
                  <img src={b.imageUrl} alt="" className="tools-brawl-portrait tools-brawl-portrait--sm" />
                ) : (
                  <div className="tools-brawl-portrait tools-brawl-portrait--sm tools-brawl-portrait--empty" />
                )}
                <span>{b.name}</span>
              </div>
              <div className="tools-brawl-settings-actions">
                <button type="button" className="btn btn-sm" disabled={busy} onClick={() => handleAddPin('pocket', b.id)}>
                  Pocket
                </button>
                <button type="button" className="btn btn-sm" disabled={busy} onClick={() => handleAddPin('avoid', b.id)}>
                  Avoid
                </button>
              </div>
            </div>
          ))}
          {!filteredCatalog.length ? (
            <p className="tools-settings-hint">No brawlers match. Catalog loads from BrawlAPI.</p>
          ) : null}
        </div>
        <div className="tools-brawl-settings-pins">
          <div>
            <h4>Pockets</h4>
            <div className="tools-category-chips">
              {pockets.map((row) => (
                <span key={row.id} className="tools-category-chip">
                  {nameById.get(Number(row.brawler_id))?.name || row.brawler_id}
                  <button type="button" aria-label="Remove" onClick={() => handleRemovePin(row.id)}>×</button>
                </span>
              ))}
              {!pockets.length ? <span className="tools-settings-hint">None yet</span> : null}
            </div>
          </div>
          <div>
            <h4>Avoids</h4>
            <div className="tools-category-chips">
              {avoids.map((row) => (
                <span key={row.id} className="tools-category-chip">
                  {nameById.get(Number(row.brawler_id))?.name || row.brawler_id}
                  <button type="button" aria-label="Remove" onClick={() => handleRemovePin(row.id)}>×</button>
                </span>
              ))}
              {!avoids.length ? <span className="tools-settings-hint">None yet</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="tools-settings-subsection">
        <h3>Trio</h3>
        {!trioBundle ? (
          <>
            <p className="tools-settings-hint">Create a trio or join with a short-lived invite code.</p>
            <div className="tools-brawl-settings-row">
              <label className="tools-settings-field tools-brawl-settings-grow">
                <span className="tools-settings-label">Trio name</span>
                <input
                  className="tools-settings-input"
                  value={trioName}
                  onChange={(e) => setTrioName(e.target.value)}
                />
              </label>
              <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={handleCreateTrio}>
                Create
              </button>
            </div>
            <div className="tools-brawl-settings-row">
              <label className="tools-settings-field tools-brawl-settings-grow">
                <span className="tools-settings-label">Join code</span>
                <input
                  className="tools-settings-input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  spellCheck={false}
                />
              </label>
              <button type="button" className="btn btn-sm" disabled={busy} onClick={handleJoin}>
                Join
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="tools-settings-status-line">
              <strong>{trioBundle.trio.name}</strong>
              {trioBundle.isAdmin ? ' · you are admin' : ''}
            </p>
            <ul className="tools-brawl-settings-members">
              {trioBundle.members.map((m) => (
                <li key={m.id}>
                  <span>
                    <strong>{m.nickname}</strong>
                    {m.user_id === trioBundle.trio.admin_user_id ? ' · admin' : ''}
                    {m.player_tag ? ` · ${formatBrawlTagDisplay(m.player_tag)}` : ' · no tag'}
                  </span>
                  <div className="tools-brawl-settings-actions">
                    {trioBundle.isAdmin && m.user_id !== trioBundle.trio.admin_user_id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              setTrioBundle(await transferBrawlTrioAdmin(m.user_id));
                              toast.success('Admin transferred.');
                            } catch (err) {
                              toast.error(errMessage(err, 'Transfer failed.'));
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Make admin
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              setTrioBundle(await kickBrawlTrioMember(m.user_id));
                              toast.success('Member removed.');
                            } catch (err) {
                              toast.error(errMessage(err, 'Kick failed.'));
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Kick
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <div className="tools-brawl-settings-row">
              <label className="tools-settings-field tools-brawl-settings-grow">
                <span className="tools-settings-label">Your nickname</span>
                <input
                  className="tools-settings-input"
                  value={nicknameDraft}
                  onChange={(e) => setNicknameDraft(e.target.value)}
                />
              </label>
              <button type="button" className="btn btn-sm" disabled={busy} onClick={handleSaveNickname}>
                Save
              </button>
            </div>
            {trioBundle.isAdmin ? (
              <div className="tools-brawl-settings-row">
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={handleInvite}>
                  New invite code
                </button>
                {inviteCode ? (
                  <p className="tools-settings-status-line">
                    Code: <strong>{inviteCode}</strong>
                  </p>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await leaveBrawlTrio();
                  setTrioBundle(null);
                  setInviteCode('');
                  toast.success('Left trio.');
                } catch (err) {
                  toast.error(errMessage(err, 'Could not leave.'));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Leave trio
            </button>
          </>
        )}
      </div>

      <Link to={getToolRoute('brawl')} className="btn btn-sm">
        Open Brawl tool
      </Link>
    </div>
  );
}
