import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { getSettingsRoute } from '@/lib/tools/tool-routes';
import { loadBrawlCatalog, fetchBrawlApiMaps } from '@/api/brawl/catalog';
import { getBrawlPlayerLink, listBrawlRoster, listTrioMemberP11Maps, syncBrawlPlayer } from '@/api/brawl/playerLink';
import { listBrawlFitCache } from '@/api/brawl/fit';
import { listBrawlPocketsAvoids } from '@/api/brawl/pockets';
import { getWeeklyBrawlMetaPrior } from '@/api/brawl/metaPrior';
import {
  getSoloDraftSession,
  upsertSoloDraftSession,
  getTrioDraftSession,
  upsertTrioDraftSession,
  subscribeTrioDraftSession,
} from '@/api/brawl/draftSession';
import { DRAFT_MODES } from '@/lib/tools/brawl/draft-roles';
import {
  buildTagIndex,
  createEmptyDraftState,
  eloToAccountPower,
  legalP11Ids,
  scoreDraftCandidate,
  upgradeCandidateIds,
} from '@/lib/tools/brawl/draft-score';
import { accountIntensityPrior } from '@/lib/tools/brawl/fit-engine';
import { parseBrawlVoiceIntent } from '@/lib/tools/brawl/voice-intents';
import { metaBoostFromTier, parseMetaTierText } from '@/lib/tools/brawl/meta-prior';
import { resolveMapChoices } from '@/lib/tools/brawl/map-pool';
import {
  buildRankedPickTimeline,
  nextPickStep,
  orderSeatsByPartyLeaderAndElo,
  SOLO_SEAT_OPTIONS,
} from '@/lib/tools/brawl/draft-sequence';
import { hintLoadout } from '@/lib/tools/brawl/loadouts';
import {
  applyReadySwap,
  isDraftFullyPicked,
  proposeReadySwaps,
  readySwapFullyConfirmed,
} from '@/lib/tools/brawl/ready-swaps';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import BrawlVoiceOverlay from '@/components/tools/brawl/BrawlVoiceOverlay';

/** Our side lane label from coin (A* if we won, B* if they won). */
function ourLaneLabel(coinFlip, seatIndex) {
  const lane = coinFlip === 'us' ? 'A' : coinFlip === 'enemy' ? 'B' : null;
  if (!lane) return String(seatIndex + 1);
  return `${lane}${seatIndex + 1}`;
}

/**
 * @param {{
 *   scope: 'solo' | 'trio',
 *   preferredMode?: string,
 *   onSessionMeta?: (meta: { gameMode?: string, scope: 'solo' | 'trio' }) => void,
 * }} props
 */
export default function BrawlDraftBoard({ scope, preferredMode = '', onSessionMeta }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [apiMaps, setApiMaps] = useState([]);
  const [rankedPoolByMode, setRankedPoolByMode] = useState({});
  const [roster, setRoster] = useState([]);
  const [fit, setFit] = useState([]);
  const [pockets, setPockets] = useState([]);
  const [avoids, setAvoids] = useState([]);
  const [trio, setTrio] = useState(null);
  const [playerLink, setPlayerLink] = useState(null);
  const [suggestSeat, setSuggestSeat] = useState(0);
  const [state, setState] = useState(createEmptyDraftState);
  const [picker, setPicker] = useState(/** @type {null | 'ban' | 'our' | 'enemy'} */ (null));
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastKind, setLastKind] = useState(/** @type {null | 'ban' | 'our' | 'enemy'} */ (null));
  const [voiceText, setVoiceText] = useState('');
  const voiceTextRef = useRef('');
  const [metaById, setMetaById] = useState(() => new Map());
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [p11ByUserId, setP11ByUserId] = useState(() => new Map());
  /** null = viewing own recommendations; else teammate userId */
  const [viewAsUserId, setViewAsUserId] = useState(/** @type {string | null} */ (null));
  const [hoverRecId, setHoverRecId] = useState(/** @type {number | null} */ (null));

  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const fitById = useMemo(() => new Map(fit.map((f) => [Number(f.brawler_id), f])), [fit]);
  const rosterById = useMemo(() => new Map(roster.map((r) => [Number(r.brawler_id), r])), [roster]);
  const pocketIds = useMemo(() => new Set(pockets.map((p) => Number(p.brawler_id))), [pockets]);
  const avoidIds = useMemo(() => new Set(avoids.map((a) => Number(a.brawler_id))), [avoids]);
  const tagIndex = useMemo(() => buildTagIndex(catalog), [catalog]);

  const draftComplete = useMemo(
    () => isDraftFullyPicked(state.ourPicks, state.enemyPicks),
    [state.ourPicks, state.enemyPicks],
  );

  const swapProposals = useMemo(
    () => (draftComplete ? proposeReadySwaps(state.ourPicks || [], p11ByUserId) : []),
    [draftComplete, state.ourPicks, p11ByUserId],
  );

  const enemyIdsForLoadout = useMemo(
    () => (state.enemyPicks || []).map((p) => Number(p.brawlerId)).filter(Number.isFinite),
    [state.enemyPicks],
  );

  const showLoadouts = enemyIdsForLoadout.length > 0 || (state.ourPicks || []).length > 0;

  const mapChoices = useMemo(
    () => (state.gameMode ? resolveMapChoices(apiMaps, state.gameMode, rankedPoolByMode) : []),
    [apiMaps, state.gameMode, rankedPoolByMode],
  );

  const accountPower = useMemo(
    () => accountIntensityPrior(playerLink?.player_snapshot || {}),
    [playerLink],
  );

  const setupReady = Boolean(
    state.gameMode
    && String(state.mapName || '').trim()
    && (state.coinFlip === 'us' || state.coinFlip === 'enemy')
    && (scope === 'solo' || state.partyLeaderUserId),
  );

  const timeline = useMemo(
    () => buildRankedPickTimeline(state.coinFlip || '', state.pickOrder || []),
    [state.coinFlip, state.pickOrder],
  );

  const currentStep = useMemo(
    () => nextPickStep(timeline, (state.ourPicks || []).length, (state.enemyPicks || []).length),
    [timeline, state.ourPicks, state.enemyPicks],
  );

  const taken = useMemo(() => {
    const s = new Set();
    for (const b of state.bans || []) s.add(Number(b.brawlerId));
    for (const b of state.ourPicks || []) s.add(Number(b.brawlerId));
    for (const b of state.enemyPicks || []) s.add(Number(b.brawlerId));
    return s;
  }, [state]);

  const persist = useCallback(async (next) => {
    setState(next);
    if (!canEdit) return;
    setBusy(true);
    try {
      if (scope === 'solo') await upsertSoloDraftSession(next);
      else await upsertTrioDraftSession(next);
    } catch (err) {
      toast.error(err?.message || 'Could not save draft.');
    } finally {
      setBusy(false);
    }
  }, [canEdit, scope]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, mapList, myRoster, myFit, pins, link, weekly] = await Promise.all([
        loadBrawlCatalog(),
        fetchBrawlApiMaps().catch(() => []),
        listBrawlRoster().catch(() => []),
        listBrawlFitCache().catch(() => []),
        listBrawlPocketsAvoids().catch(() => ({ pockets: [], avoids: [] })),
        getBrawlPlayerLink().catch(() => null),
        getWeeklyBrawlMetaPrior().catch(() => null),
      ]);
      setCatalog(cat);
      setRoster(myRoster);
      setFit(myFit);
      setPockets(pins.pockets || []);
      setAvoids(pins.avoids || []);
      setApiMaps(Array.isArray(mapList) ? mapList : []);
      setPlayerLink(link);

      try {
        if (scope === 'trio') {
          const maps = await listTrioMemberP11Maps();
          setP11ByUserId(maps);
        } else {
          const mine = new Map();
          const set = new Set(
            (myRoster || [])
              .filter((r) => Number(r.power) >= 11)
              .map((r) => Number(r.brawler_id))
              .filter(Number.isFinite),
          );
          if (user?.id) mine.set(user.id, set);
          setP11ByUserId(mine);
        }
      } catch {
        const mine = new Map();
        const set = new Set(
          (myRoster || [])
            .filter((r) => Number(r.power) >= 11)
            .map((r) => Number(r.brawler_id))
            .filter(Number.isFinite),
        );
        if (user?.id) mine.set(user.id, set);
        setP11ByUserId(mine);
      }

      const poolByMode = weekly?.payload?.rankedPoolByMode;
      if (poolByMode && typeof poolByMode === 'object') {
        setRankedPoolByMode(poolByMode);
      } else {
        const pool = Array.isArray(weekly?.payload?.mapPool) ? weekly.payload.mapPool : [];
        setRankedPoolByMode(pool.length ? { _legacy: pool } : {});
      }

      const myElo = Number(link?.player_snapshot?.ranked?.rankedElo);
      const eloOrNull = Number.isFinite(myElo) ? myElo : null;

      const tiersPayload = weekly?.payload?.tiers;
      if (tiersPayload && typeof tiersPayload === 'object' && !Array.isArray(tiersPayload)) {
        const parsed = parseMetaTierText(JSON.stringify(tiersPayload), cat);
        setMetaById(parsed.byId);
      } else if (typeof weekly?.payload?.tiersText === 'string') {
        const parsed = parseMetaTierText(weekly.payload.tiersText, cat);
        setMetaById(parsed.byId);
      } else {
        setMetaById(new Map());
      }

      if (scope === 'solo') {
        setCanEdit(true);
        setTrio(null);
        const session = await getSoloDraftSession().catch(() => null);
        const base = createEmptyDraftState();
        const st = session?.state ? { ...base, ...session.state } : base;
        const you = {
          userId: user?.id,
          nickname: link?.display_name || 'You',
          rankedElo: eloOrNull,
          avatarUrl: null,
        };
        st.pickOrder = [
          { ...you, slot: 0, nickname: `${you.nickname} · seat1` },
          { userId: `${user?.id}-s2`, nickname: 'Seat 2', slot: 1, rankedElo: null, avatarUrl: null },
          { userId: `${user?.id}-s3`, nickname: 'Seat 3 (captain)', slot: 2, rankedElo: null, avatarUrl: null },
        ];
        if (st.soloSeatIndex == null) st.soloSeatIndex = 0;
        delete st.firstPick;
        if (preferredMode && !st.gameMode) st.gameMode = preferredMode;
        setState(st);
        setSuggestSeat(Number(st.soloSeatIndex) || 0);
      } else {
        const bundle = await getTrioDraftSession();
        setTrio(bundle?.trio || null);
        setCanEdit(Boolean(bundle?.trio?.isAdmin));
        const base = createEmptyDraftState();
        const st = bundle?.session?.state ? { ...base, ...bundle.session.state } : base;
        const members = bundle?.trio?.members || [];
        let seats = (st.pickOrder?.length ? st.pickOrder : members.map((m) => ({
          userId: m.user_id,
          nickname: m.nickname,
          avatarUrl: null,
          rankedElo: null,
        }))).map((s) => ({ ...s }));

        // Stamp my elo onto my seat whenever I load
        seats = seats.map((s) => (
          s.userId === user?.id ? { ...s, rankedElo: eloOrNull, nickname: s.nickname || link?.display_name } : s
        ));

        while (seats.length < 3) {
          const i = seats.length;
          seats.push({ userId: `seat-${i}`, nickname: `Seat ${i + 1}`, rankedElo: null, avatarUrl: null });
        }
        seats = seats.slice(0, 3);

        if (st.partyLeaderUserId) {
          seats = orderSeatsByPartyLeaderAndElo(seats, st.partyLeaderUserId);
        } else {
          seats = seats.map((s, i) => ({ ...s, slot: i }));
        }
        st.pickOrder = seats;
        delete st.firstPick;
        if (preferredMode && !st.gameMode) st.gameMode = preferredMode;
        setState(st);
        setSuggestSeat(0);
      }
    } catch (err) {
      toast.error(err?.message || 'Could not load draft.');
    } finally {
      setLoading(false);
    }
  }, [scope, user, preferredMode]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    onSessionMeta?.({ gameMode: state.gameMode || '', scope });
  }, [state.gameMode, scope, onSessionMeta]);

  // Quiet roster/Elo refresh while the board is open (every 3 min).
  useEffect(() => {
    if (loading) return undefined;
    const tick = async () => {
      try {
        await syncBrawlPlayer();
        const [myRoster, myFit, link] = await Promise.all([
          listBrawlRoster().catch(() => []),
          listBrawlFitCache().catch(() => []),
          getBrawlPlayerLink().catch(() => null),
        ]);
        setRoster(myRoster);
        setFit(myFit);
        setPlayerLink(link);
        const elo = Number(link?.player_snapshot?.ranked?.rankedElo);
        if (Number.isFinite(elo) && user?.id) {
          setState((prev) => ({
            ...prev,
            pickOrder: (prev.pickOrder || []).map((s) => (
              s.userId === user.id ? { ...s, rankedElo: elo } : s
            )),
          }));
        }
      } catch {
        // ignore background sync failures
      }
    };
    const id = window.setInterval(tick, 3 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [loading, user?.id]);

  useEffect(() => {
    if (scope !== 'trio' || !trio?.trio?.id) return undefined;
    return subscribeTrioDraftSession(trio.trio.id, async () => {
      const bundle = await getTrioDraftSession().catch(() => null);
      if (bundle?.session?.state) {
        setState((prev) => ({ ...createEmptyDraftState(), ...bundle.session.state }));
      }
    });
  }, [scope, trio?.trio?.id]);

  const suggestions = useMemo(() => {
    const ourIds = (state.ourPicks || []).map((p) => Number(p.brawlerId));
    const enemyIds = (state.enemyPicks || []).map((p) => Number(p.brawlerId));
    const focusUserId = viewAsUserId || user?.id || '';
    const seatFromUser = (state.pickOrder || []).findIndex((s) => s.userId === focusUserId);
    const focusSeat = seatFromUser >= 0
      ? seatFromUser
      : (scope === 'solo' ? Number(state.soloSeatIndex) || 0 : suggestSeat);
    const sideLetter = state.coinFlip === 'us' ? 'A' : state.coinFlip === 'enemy' ? 'B' : '';
    const laneForFocus = sideLetter ? `${sideLetter}${focusSeat + 1}` : '';
    const next = nextPickStep(timeline, ourIds.length, enemyIds.length);
    const enemyTurn = Boolean(next && next.side === 'enemy');
    const ourNext = timeline.find((row) => {
      if (row.side !== 'us') return false;
      const prior = timeline.filter((t) => t.side === 'us' && t.step < row.step).length;
      return ourIds.length <= prior;
    });
    const laneSeat = !enemyTurn && next?.side === 'us'
      ? (next.laneSeat || laneForFocus)
      : (laneForFocus || ourNext?.laneSeat || '');
    const focusPlayer = (state.pickOrder || [])[focusSeat];
    const seatPower = focusPlayer?.rankedElo != null
      ? eloToAccountPower(focusPlayer.rankedElo)
      : accountPower;

    const viewingSelf = !viewAsUserId || viewAsUserId === user?.id;
    /** @type {number[]} */
    let legal = [];
    if (viewingSelf) {
      legal = legalP11Ids(roster, taken);
    } else {
      const set = p11ByUserId.get(viewAsUserId) || new Set();
      legal = [...set].filter((id) => Number.isFinite(id) && !taken.has(id));
    }
    const upgrades = viewingSelf ? upgradeCandidateIds(roster, fitById, taken) : [];

    const scoreId = (id, grey) => {
      const f = viewingSelf ? fitById.get(id) : null;
      const scored = scoreDraftCandidate({
        brawlerId: id,
        fit: f?.fit ?? 50,
        isAvoid: viewingSelf ? avoidIds.has(id) : false,
        isPocket: viewingSelf ? pocketIds.has(id) : false,
        modeId: state.gameMode,
        ourPickIds: ourIds,
        enemyPickIds: enemyIds,
        tagIndex,
        metaBoost: metaBoostFromTier(metaById.get(id)),
        laneSeat,
        accountPower: seatPower,
        mapName: state.mapName || '',
      });
      return {
        id,
        name: byId.get(id)?.name || `#${id}`,
        imageUrl: byId.get(id)?.imageUrl || null,
        score: scored.score,
        reasons: scored.reasons,
        who: focusPlayer?.nickname || 'You',
        grey: Boolean(grey),
        laneSeat,
        prep: enemyTurn,
        loadout: showLoadouts
          ? hintLoadout({
            brawlerId: id,
            brawlerName: byId.get(id)?.name,
            modeId: state.gameMode,
            enemyPickIds: enemyIds,
            tagIndex,
            catalogById: byId,
            rosterRow: viewingSelf ? (rosterById.get(id) || null) : null,
          })
          : null,
      };
    };

    const main = legal.map((id) => scoreId(id, false))
      .filter((s) => s.score > -40)
      .sort((a, b) => b.score - a.score);
    const grey = upgrades.map((id) => scoreId(id, true))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return [...main, ...grey];
  }, [
    roster, taken, fitById, avoidIds, pocketIds, state, tagIndex, byId, metaById,
    timeline, accountPower, suggestSeat, scope, showLoadouts, rosterById,
    viewAsUserId, user?.id, p11ByUserId,
  ]);

  const suggestContext = useMemo(() => {
    const ourIds = (state.ourPicks || []).length;
    const enemyIds = (state.enemyPicks || []).length;
    const next = nextPickStep(timeline, ourIds, enemyIds);
    const peekSeat = (state.pickOrder || []).find((s) => s.userId === viewAsUserId);
    const who = peekSeat?.nickname || (viewAsUserId && viewAsUserId !== user?.id ? 'Teammate' : 'You');
    if (!setupReady) {
      return { title: 'Suggestions', hint: 'Set mode, map, coin, and party leader to open the board.' };
    }
    if (!next) {
      return { title: `Ready · ${who}`, hint: 'Draft complete — grey tiles still need P11.' };
    }
    if (next.side === 'enemy') {
      return {
        title: `Prep · ${who}`,
        hint: `Enemy ${next.laneSeat} up — say “Colt” (or “enemy picked Colt”). Viewing ${who}.`,
      };
    }
    return {
      title: `${next.laneSeat} · ${who}`,
      hint: `Say “Belle” or tap a tile. Hold Space to speak.`,
    };
  }, [timeline, state.ourPicks, state.enemyPicks, state.pickOrder, viewAsUserId, user?.id, setupReady]);

  const phaseHint = useMemo(() => {
    if (!setupReady) return 'Set mode, map, coin, and party leader.';
    if (draftComplete) return 'Ready phase — check loadouts or propose a swap.';
    const banCount = (state.bans || []).length;
    if (banCount < 6 && !(state.ourPicks || []).length && !(state.enemyPicks || []).length) {
      return 'Say bans: Shelly, Piper, Edgar';
    }
    if (currentStep?.side === 'enemy') {
      return `Enemy ${currentStep.laneSeat} — say “Colt” (or “enemy picked Colt”)`;
    }
    if (currentStep?.side === 'us') {
      return `Our pick ${currentStep.laneSeat} (${currentStep.nickname}) — say “Belle”`;
    }
    return 'Hold Space to speak.';
  }, [setupReady, draftComplete, state.bans, state.ourPicks, state.enemyPicks, currentStep]);

  const ourBans = (state.bans || []).slice(0, 3);
  const enemyBans = (state.bans || []).slice(3, 6);
  const hoverRec = hoverRecId != null ? suggestions.find((s) => s.id === hoverRecId) : null;

  function togglePeek(seatUserId) {
    if (!seatUserId || seatUserId === user?.id) {
      setViewAsUserId(null);
      return;
    }
    if (String(seatUserId).startsWith('seat-') || String(seatUserId).includes('-s')) return;
    setViewAsUserId((prev) => (prev === seatUserId ? null : seatUserId));
  }

  const pickerList = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = catalog.filter((c) => !taken.has(c.id));
    if (picker === 'our') {
      const legal = new Set(legalP11Ids(roster, taken));
      list = list.filter((c) => legal.has(c.id));
    }
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    return list.slice(0, 80);
  }, [catalog, taken, picker, roster, query]);

  async function patch(partial) {
    if (!canEdit) {
      toast.error('Only the trio admin can edit the board.');
      return;
    }
    await persist({ ...state, ...partial, updatedAt: Date.now() });
  }

  function addBan(brawlerId) {
    patch({ bans: [...(state.bans || []), { brawlerId, by: 'us' }], phase: 'ban' });
    setLastKind('ban');
    setPicker(null);
  }

  function addOurPick(brawlerId, nicknameOverride) {
    const order = state.pickOrder || [];
    const step = nextPickStep(timeline, (state.ourPicks || []).length, (state.enemyPicks || []).length);
    const seatIdx = step?.side === 'us' ? step.seatIndex : (state.ourPicks || []).length;
    let assignee = order[seatIdx] || order[0] || { userId: user?.id, nickname: 'You' };
    if (nicknameOverride) {
      const hit = order.find((p) => String(p.nickname || '').toLowerCase() === nicknameOverride.toLowerCase());
      assignee = hit || { ...assignee, nickname: nicknameOverride };
    }
    const ourPicks = [...(state.ourPicks || []), {
      brawlerId,
      playerUserId: assignee.userId,
      nickname: assignee.nickname,
      slot: seatIdx,
    }];
    const complete = isDraftFullyPicked(ourPicks, state.enemyPicks);
    patch({
      ourPicks,
      phase: complete ? 'ready' : 'pick',
      readySwap: complete ? state.readySwap : null,
    });
    setLastKind('our');
    setPicker(null);
  }

  function addEnemyPick(brawlerId) {
    const enemyPicks = [...(state.enemyPicks || []), { brawlerId }];
    const complete = isDraftFullyPicked(state.ourPicks, enemyPicks);
    patch({
      enemyPicks,
      phase: complete ? 'ready' : 'pick',
      readySwap: complete ? state.readySwap : null,
    });
    setLastKind('enemy');
    setPicker(null);
  }

  function undoLast(kind) {
    const k = kind || lastKind;
    if (k === 'ban') {
      patch({ bans: (state.bans || []).slice(0, -1) });
      setLastKind(null);
    }
    if (k === 'our') {
      patch({ ourPicks: (state.ourPicks || []).slice(0, -1), readySwap: null, phase: 'pick' });
      setLastKind(null);
    }
    if (k === 'enemy') {
      patch({ enemyPicks: (state.enemyPicks || []).slice(0, -1), readySwap: null, phase: 'pick' });
      setLastKind(null);
    }
  }

  function proposeSwap(proposal) {
    if (!canEdit || !proposal) return;
    patch({
      phase: 'ready',
      readySwap: {
        fromIndex: proposal.fromIndex,
        toIndex: proposal.toIndex,
        fromUserId: proposal.from.playerUserId,
        toUserId: proposal.to.playerUserId,
        fromNickname: proposal.from.nickname,
        toNickname: proposal.to.nickname,
        confirms: {},
        proposedAt: Date.now(),
      },
    });
  }

  function toggleSwapConfirm(userId) {
    if (!canEdit || !state.readySwap || !userId) return;
    const confirms = { ...(state.readySwap.confirms || {}) };
    confirms[userId] = !confirms[userId];
    patch({ readySwap: { ...state.readySwap, confirms } });
  }

  function applyProposedSwap() {
    if (!canEdit || !state.readySwap) return;
    if (!readySwapFullyConfirmed(state.readySwap)) {
      toast.error('Both players must confirm before applying the swap.');
      return;
    }
    const nextPicks = applyReadySwap(
      state.ourPicks || [],
      state.readySwap.fromIndex,
      state.readySwap.toIndex,
    );
    patch({ ourPicks: nextPicks, readySwap: null, phase: 'ready' });
    toast.success('Swap applied.');
  }

  function clearProposedSwap() {
    if (!canEdit) return;
    patch({ readySwap: null });
  }

  function applyIntent(intent) {
    if (!intent || !canEdit) return;
    if (intent.type === 'undo') {
      undoLast();
      return;
    }
    if (intent.type === 'set_mode' && intent.modeId) {
      patch({ gameMode: intent.modeId });
      return;
    }
    if (intent.type === 'set_map' && intent.mapName) {
      patch({ mapName: intent.mapName });
      return;
    }
    if (intent.type === 'ban' && intent.brawlerId != null) {
      addBan(intent.brawlerId);
      return;
    }
    if (intent.type === 'ban_many' && Array.isArray(intent.brawlerIds)) {
      let bans = [...(state.bans || [])];
      const takenIds = new Set([
        ...bans.map((b) => Number(b.brawlerId)),
        ...(state.ourPicks || []).map((p) => Number(p.brawlerId)),
        ...(state.enemyPicks || []).map((p) => Number(p.brawlerId)),
      ]);
      for (const id of intent.brawlerIds) {
        const n = Number(id);
        if (!Number.isFinite(n) || takenIds.has(n)) continue;
        bans = [...bans, { brawlerId: n }];
        takenIds.add(n);
      }
      patch({ bans, phase: 'ban' });
      setLastKind('ban');
      return;
    }
    if (intent.type === 'unban' && intent.brawlerId != null) {
      patch({ bans: (state.bans || []).filter((b) => Number(b.brawlerId) !== Number(intent.brawlerId)) });
      return;
    }
    if (intent.type === 'enemy_pick' && intent.brawlerId != null) {
      addEnemyPick(intent.brawlerId);
      return;
    }
    if (intent.type === 'our_pick' && intent.brawlerId != null) {
      addOurPick(intent.brawlerId, intent.nickname);
      return;
    }
    if (intent.type === 'current_seat' && intent.brawlerId != null) {
      const banPhase = (state.bans || []).length < 6
        && !(state.ourPicks || []).length
        && !(state.enemyPicks || []).length;
      if (banPhase) {
        addBan(intent.brawlerId);
        return;
      }
      const step = nextPickStep(
        timeline,
        (state.ourPicks || []).length,
        (state.enemyPicks || []).length,
      );
      if (!step) {
        toast.message('Draft is already complete.');
        return;
      }
      if (step.side === 'enemy') addEnemyPick(intent.brawlerId);
      else addOurPick(intent.brawlerId);
    }
  }

  const nicknames = useMemo(
    () => (state.pickOrder || []).map((p) => p.nickname).filter(Boolean),
    [state.pickOrder],
  );

  const onVoiceTranscript = useCallback((text) => {
    voiceTextRef.current = text;
    setVoiceText(text);
  }, []);

  const {
    listening,
    requesting,
    start: startMic,
    stop: stopMic,
    supported: micSupported,
  } = useSpeechRecognition({ onTranscript: onVoiceTranscript, lang: 'en-US' });

  function applyVoiceText() {
    const text = (voiceTextRef.current || voiceText).trim();
    const intent = parseBrawlVoiceIntent(text, { catalog, nicknames });
    if (!intent) {
      toast.message('Could not parse that — edit the text or try again.');
      return;
    }
    applyIntent(intent);
    voiceTextRef.current = '';
    setVoiceText('');
    setVoiceOpen(false);
    stopMic();
  }

  function closeVoice() {
    stopMic();
    setVoiceOpen(false);
  }

  useEffect(() => {
    if (!canEdit || !micSupported) return undefined;

    function isTypingTarget(el) {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      return el.isContentEditable;
    }

    function onKeyDown(e) {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.repeat) return;
      if (isTypingTarget(/** @type {HTMLElement} */ (e.target))) return;
      if (!setupReady) return;
      e.preventDefault();
      voiceTextRef.current = '';
      setVoiceText('');
      setVoiceOpen(true);
      startMic('');
    }

    function onKeyUp(e) {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (!voiceOpen) return;
      if (isTypingTarget(/** @type {HTMLElement} */ (e.target))) return;
      e.preventDefault();
      stopMic();
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [canEdit, micSupported, setupReady, voiceOpen, startMic, stopMic]);

  if (loading) {
    return (
      <div className="tools-brawl-empty">
        <p className="tools-brawl-empty-kicker">Mythic+</p>
        <h2>Loading draft…</h2>
        <p>Pulling roster, catalog, and session.</p>
      </div>
    );
  }

  if (scope === 'trio' && !trio) {
    return (
      <div className="tools-brawl-empty">
        <p className="tools-brawl-empty-kicker">Shared board</p>
        <h2>Join a trio first</h2>
        <p>Create or join a trio in Settings to use the shared Ranked board.</p>
        <Link to={getSettingsRoute({ search: 'q=brawl' })} className="btn btn-sm btn-primary">Settings</Link>
      </div>
    );
  }

  const needsRosterHint = scope === 'solo' && !roster.length;
  const ourSeats = [...(state.pickOrder || [])].slice(0, 3);
  while (ourSeats.length < 3) {
    ourSeats.push({ userId: `seat-${ourSeats.length}`, nickname: `Seat ${ourSeats.length + 1}` });
  }

  function banPortrait(brawlerId) {
    const b = byId.get(Number(brawlerId));
    if (!b?.imageUrl) return <span className="tools-brawl-arena-ban-empty" />;
    return <img src={b.imageUrl} alt={b.name || ''} className="tools-brawl-arena-ban-img" />;
  }

  function pickPortrait(pick) {
    if (!pick) return null;
    const b = byId.get(Number(pick.brawlerId));
    return b?.imageUrl
      ? <img src={b.imageUrl} alt={b.name || ''} className="tools-brawl-arena-pick-img" />
      : <span className="tools-brawl-arena-pick-fallback">{b?.name || '?'}</span>;
  }

  return (
    <div className="tools-brawl-draft tools-brawl-draft--arena">
      <div className="tools-brawl-draft-top tools-brawl-draft-top--compact">
        <label className="tools-settings-field">
          <span className="tools-settings-label">Mode</span>
          <select
            className="tools-settings-input"
            value={state.gameMode || ''}
            disabled={!canEdit || busy}
            onChange={(e) => patch({ gameMode: e.target.value, mapName: '' })}
          >
            <option value="">Mode…</option>
            {DRAFT_MODES.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="tools-settings-field tools-brawl-settings-grow">
          <span className="tools-settings-label">Map</span>
          <select
            className="tools-settings-input"
            value={state.mapName || ''}
            disabled={!canEdit || busy || !state.gameMode}
            onChange={(e) => patch({ mapName: e.target.value })}
          >
            <option value="">{state.gameMode ? 'Map…' : 'Mode first'}</option>
            {mapChoices.map((m) => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
        </label>
        <label className="tools-settings-field">
          <span className="tools-settings-label">Coin</span>
          <select
            className="tools-settings-input"
            value={state.coinFlip || ''}
            disabled={!canEdit || busy || !state.gameMode || !state.mapName}
            onChange={(e) => patch({ coinFlip: e.target.value })}
          >
            <option value="">Coin…</option>
            <option value="us">We won (A)</option>
            <option value="enemy">They won (B)</option>
          </select>
        </label>
        {scope === 'trio' ? (
          <label className="tools-settings-field">
            <span className="tools-settings-label">Captain</span>
            <select
              className="tools-settings-input"
              value={state.partyLeaderUserId || ''}
              disabled={!canEdit || busy}
              onChange={(e) => {
                const partyLeaderUserId = e.target.value;
                const ordered = orderSeatsByPartyLeaderAndElo(state.pickOrder || [], partyLeaderUserId);
                patch({ partyLeaderUserId, pickOrder: ordered });
              }}
            >
              <option value="">Party leader…</option>
              {(state.pickOrder || []).filter((s) => s.userId && !String(s.userId).startsWith('seat-')).map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.nickname}{s.rankedElo != null ? ` · ${s.rankedElo}` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="tools-settings-field">
            <span className="tools-settings-label">Seat</span>
            <select
              className="tools-settings-input"
              value={state.soloSeatIndex ?? 0}
              disabled={!canEdit || busy}
              onChange={(e) => {
                const soloSeatIndex = Number(e.target.value);
                setSuggestSeat(soloSeatIndex);
                patch({ soloSeatIndex });
              }}
            >
              {SOLO_SEAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {state.coinFlip === 'enemy' ? opt.labelWhenEnemy : opt.labelWhenUs}
                </option>
              ))}
            </select>
          </label>
        )}
        {canEdit && micSupported ? (
          <button
            type="button"
            className={`btn btn-sm tools-brawl-ptt${listening || requesting || voiceOpen ? ' btn-primary' : ''}`}
            disabled={!setupReady}
            onMouseDown={(e) => {
              e.preventDefault();
              if (!setupReady) return;
              voiceTextRef.current = '';
              setVoiceText('');
              setVoiceOpen(true);
              startMic('');
            }}
            onMouseUp={() => stopMic()}
            onMouseLeave={() => { if (listening) stopMic(); }}
            onTouchStart={(e) => {
              e.preventDefault();
              if (!setupReady) return;
              voiceTextRef.current = '';
              setVoiceText('');
              setVoiceOpen(true);
              startMic('');
            }}
            onTouchEnd={() => stopMic()}
            title="Hold Space to speak"
          >
            Hold Space
          </button>
        ) : null}
        {!canEdit ? <span className="tools-brawl-live-pill">Live view</span> : null}
      </div>

      {state.gameMode && mapChoices.length === 0 ? (
        <div className="tools-brawl-empty tools-brawl-empty--preview">
          <p className="tools-brawl-empty-kicker">Map pool</p>
          <h2>No ranked maps for this mode</h2>
          <p>Curate maps in /admin/brawledit, then Save pools.</p>
        </div>
      ) : null}

      {needsRosterHint ? (
        <p className="tools-settings-hint">
          Link your tag in <Link to={getSettingsRoute({ search: 'q=brawl' })}>Settings</Link> for P11 suggestions.
        </p>
      ) : null}

      <p className="tools-brawl-phase-hint">{phaseHint}</p>

      {!setupReady ? (
        <div className="tools-brawl-empty tools-brawl-empty--preview">
          <p className="tools-brawl-empty-kicker">Lobby</p>
          <h2>{scope === 'trio' ? 'Mode → map → coin → captain' : 'Mode → map → coin → seat'}</h2>
          <p>Us stay on the left. Coin only changes pick order (A1→B1→B2→A2→A3→B3).</p>
        </div>
      ) : (
        <>
          <section className="tools-brawl-rec">
            <div className="tools-brawl-rec-head">
              <h3>{suggestContext.title}</h3>
              {viewAsUserId && viewAsUserId !== user?.id ? (
                <button type="button" className="btn btn-sm" onClick={() => setViewAsUserId(null)}>
                  Back to my recs
                </button>
              ) : null}
            </div>
            <div className="tools-brawl-rec-grid" role="list">
              {suggestions.map((s, rank) => (
                <button
                  key={`${s.id}-${s.grey ? 'g' : 'p'}`}
                  type="button"
                  role="listitem"
                  className={`tools-brawl-rec-tile${s.grey ? ' is-upgrade' : ''}${hoverRecId === s.id ? ' is-hover' : ''}`}
                  disabled={s.grey || !canEdit}
                  onMouseEnter={() => setHoverRecId(s.id)}
                  onMouseLeave={() => setHoverRecId((id) => (id === s.id ? null : id))}
                  onFocus={() => setHoverRecId(s.id)}
                  onBlur={() => setHoverRecId((id) => (id === s.id ? null : id))}
                  onClick={() => { if (!s.grey && canEdit) addOurPick(s.id); }}
                >
                  {rank < 2 ? <span className="tools-brawl-rec-rank">#{rank + 1}</span> : null}
                  {s.imageUrl
                    ? <img src={s.imageUrl} alt="" className="tools-brawl-rec-img" />
                    : <span className="tools-brawl-rec-img tools-brawl-rec-img--empty" />}
                </button>
              ))}
              {!suggestions.length ? (
                <p className="tools-settings-hint">
                  {viewAsUserId && viewAsUserId !== user?.id
                    ? 'No P11s synced for this teammate yet (they need Settings sync + 0004 roster read).'
                    : 'Sync a roster with Power 11s to see suggestions.'}
                </p>
              ) : null}
            </div>
            {hoverRec ? (
              <div className="tools-brawl-rec-tip" role="status">
                <strong>{hoverRec.name}</strong>
                <span className="tools-brawl-rec-tip-score">{Math.round(hoverRec.score)}</span>
                {hoverRec.reasons?.length ? (
                  <span className="tools-brawl-draft-reasons">
                    {hoverRec.reasons.map((r) => (
                      <span key={r} className="tools-brawl-draft-reason">{r}</span>
                    ))}
                  </span>
                ) : null}
                {hoverRec.loadout?.lines?.length ? (
                  <em>{hoverRec.loadout.lines.slice(0, 2).join(' · ')}</em>
                ) : null}
                {hoverRec.grey ? <em>needs P11</em> : null}
              </div>
            ) : (
              <p className="tools-brawl-rec-tip tools-brawl-rec-tip--idle">{suggestContext.hint}</p>
            )}
          </section>

          <div className="tools-brawl-arena" aria-label="Draft board">
            <div className="tools-brawl-arena-bans tools-brawl-arena-bans--us" aria-label="Our bans">
              <span className="tools-brawl-arena-bans-label">Bans</span>
              {[0, 1, 2].map((i) => {
                const ban = ourBans[i];
                return (
                  <button
                    key={`ub-${i}`}
                    type="button"
                    className={`tools-brawl-arena-ban${ban ? ' is-filled' : ''}`}
                    disabled={!canEdit}
                    onClick={() => canEdit && setPicker('ban')}
                    title={ban ? (byId.get(Number(ban.brawlerId))?.name || 'Ban') : 'Add ban'}
                  >
                    {ban ? banPortrait(ban.brawlerId) : null}
                  </button>
                );
              })}
            </div>

            <div className="tools-brawl-arena-team tools-brawl-arena-team--us">
              {ourSeats.map((seat, index) => {
                const pick = (state.ourPicks || [])[index];
                const peekable = scope === 'trio'
                  && seat.userId
                  && seat.userId !== user?.id
                  && !String(seat.userId).startsWith('seat-')
                  && !String(seat.userId).includes('-s');
                const peeking = viewAsUserId === seat.userId;
                const isMe = scope === 'solo'
                  ? Number(state.soloSeatIndex) === index
                  : seat.userId === user?.id;
                const lane = ourLaneLabel(state.coinFlip, index);
                const upNow = currentStep?.side === 'us' && currentStep?.seatIndex === index;
                return (
                  <div
                    key={seat.userId || index}
                    className={`tools-brawl-arena-slot is-us${upNow ? ' is-up' : ''}${isMe ? ' is-me' : ''}${peeking ? ' is-peek' : ''}`}
                  >
                    {peekable ? (
                      <button
                        type="button"
                        className={`tools-brawl-arena-peek${peeking ? ' is-active' : ''}`}
                        aria-label={peeking ? 'Back to my recommendations' : `View ${seat.nickname} recommendations`}
                        title={peeking ? 'Exit peek' : `View ${seat.nickname}`}
                        onClick={() => togglePeek(seat.userId)}
                      />
                    ) : null}
                    {isMe ? <span className="tools-brawl-arena-you">YOU</span> : null}
                    <button
                      type="button"
                      className="tools-brawl-arena-pick"
                      disabled={!canEdit}
                      onClick={() => {
                        if (!canEdit) return;
                        if (pick) return;
                        setPicker('our');
                      }}
                    >
                      {pickPortrait(pick)}
                      {!pick ? <em>{lane}</em> : null}
                    </button>
                    <span className="tools-brawl-arena-name">@{String(seat.nickname || `P${index + 1}`).replace(/^@/, '')}</span>
                  </div>
                );
              })}
            </div>

            <div className="tools-brawl-arena-vs" aria-hidden>
              <strong>VS</strong>
            </div>

            <div className="tools-brawl-arena-team tools-brawl-arena-team--enemy">
              {[0, 1, 2].map((index) => {
                const pick = (state.enemyPicks || [])[index];
                const upNow = currentStep?.side === 'enemy' && currentStep?.seatIndex === index;
                return (
                  <div key={`e-${index}`} className={`tools-brawl-arena-slot is-enemy${upNow ? ' is-up' : ''}`}>
                    <button
                      type="button"
                      className="tools-brawl-arena-pick"
                      disabled={!canEdit}
                      onClick={() => {
                        if (!canEdit) return;
                        if (pick) return;
                        setPicker('enemy');
                      }}
                    >
                      {pickPortrait(pick)}
                      {!pick ? <em>E{index + 1}</em> : null}
                    </button>
                    <span className="tools-brawl-arena-name">@E{index + 1}</span>
                  </div>
                );
              })}
            </div>

            <div className="tools-brawl-arena-bans tools-brawl-arena-bans--enemy" aria-label="Enemy bans">
              <span className="tools-brawl-arena-bans-label">Bans</span>
              {[0, 1, 2].map((i) => {
                const ban = enemyBans[i];
                return (
                  <button
                    key={`eb-${i}`}
                    type="button"
                    className={`tools-brawl-arena-ban${ban ? ' is-filled' : ''}`}
                    disabled={!canEdit}
                    onClick={() => canEdit && setPicker('ban')}
                    title={ban ? (byId.get(Number(ban.brawlerId))?.name || 'Ban') : 'Add ban'}
                  >
                    {ban ? banPortrait(ban.brawlerId) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {draftComplete ? (
            <section className="tools-brawl-ready">
              <div className="tools-brawl-ready-head">
                <h3>Ready (~17s)</h3>
                <p>Our-side P11↔P11 swaps. Admin records both confirms.</p>
              </div>
              {state.readySwap ? (
                <div className="tools-brawl-ready-card">
                  <strong>
                    {(state.readySwap.fromNickname || 'A')}
                    {' ↔ '}
                    {(state.readySwap.toNickname || 'B')}
                  </strong>
                  <div className="tools-brawl-settings-actions">
                    <button
                      type="button"
                      className={`btn btn-sm${state.readySwap.confirms?.[state.readySwap.fromUserId] ? ' btn-primary' : ''}`}
                      disabled={!canEdit}
                      onClick={() => toggleSwapConfirm(state.readySwap.fromUserId)}
                    >
                      {state.readySwap.fromNickname || 'A'} confirm
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm${state.readySwap.confirms?.[state.readySwap.toUserId] ? ' btn-primary' : ''}`}
                      disabled={!canEdit}
                      onClick={() => toggleSwapConfirm(state.readySwap.toUserId)}
                    >
                      {state.readySwap.toNickname || 'B'} confirm
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={!canEdit || !readySwapFullyConfirmed(state.readySwap)}
                      onClick={applyProposedSwap}
                    >
                      Apply
                    </button>
                    <button type="button" className="btn btn-sm" disabled={!canEdit} onClick={clearProposedSwap}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : swapProposals.length ? (
                <div className="tools-brawl-ready-list">
                  {swapProposals.slice(0, 3).map((p) => (
                    <button
                      key={`${p.fromIndex}-${p.toIndex}`}
                      type="button"
                      className="btn btn-sm"
                      disabled={!canEdit}
                      onClick={() => proposeSwap(p)}
                    >
                      Propose {p.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="tools-settings-hint">
                  {scope === 'solo' ? 'No teammate swaps in solo.' : 'No legal swaps yet.'}
                </p>
              )}
            </section>
          ) : null}
        </>
      )}

      <BrawlVoiceOverlay
        open={voiceOpen && canEdit}
        listening={listening || requesting}
        transcript={voiceText}
        onTranscriptChange={(text) => {
          voiceTextRef.current = text;
          setVoiceText(text);
        }}
        onSend={applyVoiceText}
        onCancel={closeVoice}
        holdHint="Hold Space"
      />

      {picker && setupReady ? (
        <div className="tools-brawl-draft-modal" role="dialog" aria-label="Pick brawler">
          <div className="tools-brawl-draft-modal-card">
            <header>
              <h3>{picker === 'ban' ? 'Ban' : picker === 'our' ? 'Our pick' : 'Enemy pick'}</h3>
              <button type="button" className="btn btn-sm" onClick={() => setPicker(null)}>Close</button>
            </header>
            <input
              className="tools-settings-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              autoFocus
            />
            <div className="tools-brawl-settings-catalog">
              {pickerList.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="tools-brawl-settings-catalog-row tools-brawl-draft-pick-row"
                  onClick={() => {
                    if (picker === 'ban') addBan(b.id);
                    else if (picker === 'our') addOurPick(b.id);
                    else addEnemyPick(b.id);
                  }}
                >
                  <div className="tools-brawl-settings-catalog-identity">
                    {b.imageUrl ? <img src={b.imageUrl} alt="" className="tools-brawl-portrait tools-brawl-portrait--sm" /> : null}
                    <span>{b.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
