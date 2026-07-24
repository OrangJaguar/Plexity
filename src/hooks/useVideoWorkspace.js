import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createVideoHistory } from '@/lib/tools/video/video-history.js';
import {
  VIDEO_ACCEPT_ATTR,
  softWarningsForProject,
  validateVideoImportFile,
} from '@/lib/tools/video/video-limits.js';
import { probeAndCreateMediaAsset, revokeAllMediaUrls } from '@/lib/tools/video/video-media.js';
import {
  cloneProject,
  createEmptyProject,
  findClip,
  formatTimecode,
  getMedia,
  getSelectedClip,
  getVideoClipAtPlayhead,
  setProjectAspect,
  setProjectDuck,
} from '@/lib/tools/video/video-project.js';
import {
  addCaptionClip,
  addClipFromMedia,
  addMarker,
  addMediaToProject,
  addOverlayImageClip,
  addStickerClip,
  addTextClip,
  addTrack,
  deleteClip,
  detachAudioFromVideo,
  duplicateClip,
  importSrtToProject,
  moveClip,
  pasteStyle,
  patchTrack,
  removeMarker,
  replaceClipMedia,
  rippleDeleteClip,
  setClipAudioRole,
  setClipFades,
  setClipFilter,
  setClipFreeze,
  setClipOpacity,
  setClipReverse,
  setClipSpeed,
  setClipText,
  setClipTransform,
  setClipTransition,
  setClipVolume,
  setTrackSolo,
  splitClipAtPlayhead,
  trimClipEdge,
  unlinkClip,
} from '@/lib/tools/video/video-timeline.js';
import { exportProjectSrt } from '@/lib/tools/video/video-captions.js';
import {
  clearVideoSession,
  loadVideoSession,
  saveVideoSession,
} from '@/lib/tools/video/video-persist.js';
import { filterFromPreset } from '@/lib/tools/video/video-filters.js';
import { rasterizeSticker } from '@/lib/tools/video/video-stickers.js';
import { createVoMeter, requestVoStream, startVoRecording } from '@/lib/tools/video/video-vo.js';
import { sanitizeDisplayName, sanitizeDisplayNameInput } from '@/lib/tools/shared/display-filename.js';
import { STORAGE_KEYS } from '@/lib/storage/storage-keys.js';

/** @typedef {'media'|'audio'|'text'|'captions'|'stickers'|'transitions'|'filters'} VideoRailTab */

/**
 * CapCut-style video editor workspace (session-only) — Plan 3 captions & power.
 */
export function useVideoWorkspace() {
  const [project, setProject] = useState(() => createEmptyProject());
  const [rejections, setRejections] = useState(/** @type {{ id: string, name: string, code: string, message: string }[]} */ ([]));
  const [warnings, setWarnings] = useState(/** @type {string[]} */ ([]));
  const [playing, setPlaying] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [pxPerSecond, setPxPerSecond] = useState(64);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [railTab, setRailTab] = useState(/** @type {VideoRailTab} */ ('media'));
  const [voStatus, setVoStatus] = useState(/** @type {'idle'|'recording'|'error'} */ ('idle'));
  const [voError, setVoError] = useState('');
  const [voLevel, setVoLevel] = useState(0);
  const [styleClipboard, setStyleClipboard] = useState(/** @type {string | null} */ (null));
  const [showSafeMargins, setShowSafeMargins] = useState(false);
  const [resumeOffer, setResumeOffer] = useState(/** @type {{ savedAt: number } | null} */ (null));
  const [persistWarning, setPersistWarning] = useState('');
  const [dictating, setDictating] = useState(false);

  const historyRef = useRef(createVideoHistory());
  const projectRef = useRef(project);
  const playingRef = useRef(false);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const gestureBeforeRef = useRef(/** @type {import('@/lib/tools/video/video-project.js').VideoProject | null} */ (null));
  const voSessionRef = useRef(/** @type {ReturnType<typeof startVoRecording> | null} */ (null));
  const voMeterRef = useRef(/** @type {ReturnType<typeof createVoMeter> | null} */ (null));
  const voMeterRafRef = useRef(0);
  const persistTimerRef = useRef(0);
  const resumeLoadedRef = useRef(/** @type {import('@/lib/tools/video/video-project.js').VideoProject | null} */ (null));
  const skipPersistRef = useRef(true);
  const dictateRef = useRef(/** @type {any} */ (null));
  projectRef.current = project;
  playingRef.current = playing;

  const dictateSupported = typeof window !== 'undefined'
    && Boolean(/** @type {any} */ (window).SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition);

  const isEmpty = project.media.length === 0
    && project.tracks.every((t) => t.clips.length === 0)
    && !(project.markers || []).length;
  const selectedClip = getSelectedClip(project);
  const selectedMedia = selectedClip?.mediaId ? getMedia(project, selectedClip.mediaId) : null;
  const selectedFound = selectedClip ? findClip(project, selectedClip.id) : null;

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const refreshWarnings = useCallback((proj) => {
    setWarnings(softWarningsForProject(proj));
  }, []);

  const commit = useCallback((next, { pushHistory = true } = {}) => {
    if (pushHistory) historyRef.current.push(projectRef.current);
    setProject(next);
    projectRef.current = next;
    refreshWarnings(next);
    syncHistoryFlags();
  }, [refreshWarnings, syncHistoryFlags]);

  const undo = useCallback(() => {
    const prev = historyRef.current.undo(projectRef.current);
    if (!prev) return;
    setPlaying(false);
    setProject(prev);
    projectRef.current = prev;
    refreshWarnings(prev);
    syncHistoryFlags();
  }, [refreshWarnings, syncHistoryFlags]);

  const redo = useCallback(() => {
    const next = historyRef.current.redo(projectRef.current);
    if (!next) return;
    setPlaying(false);
    setProject(next);
    projectRef.current = next;
    refreshWarnings(next);
    syncHistoryFlags();
  }, [refreshWarnings, syncHistoryFlags]);

  const reset = useCallback(() => {
    revokeAllMediaUrls(projectRef.current.media);
    historyRef.current.clear();
    void clearVideoSession();
    try {
      localStorage.removeItem(STORAGE_KEYS.videoSessionHint);
    } catch {
      // ignore
    }
    const empty = createEmptyProject();
    setProject(empty);
    projectRef.current = empty;
    setPlaying(false);
    setRejections([]);
    setWarnings([]);
    setStyleClipboard(null);
    setResumeOffer(null);
    resumeLoadedRef.current = null;
    setPersistWarning('');
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  // IndexedDB resume probe on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadVideoSession();
      if (cancelled || !saved?.project) {
        skipPersistRef.current = false;
        return;
      }
      resumeLoadedRef.current = saved.project;
      let autoOnce = false;
      try {
        autoOnce = sessionStorage.getItem(STORAGE_KEYS.videoSessionHint) === 'auto-resumed';
      } catch {
        // ignore
      }
      if (!autoOnce && (saved.project.media.length || saved.project.tracks.some((t) => t.clips.length))) {
        setResumeOffer({ savedAt: saved.savedAt });
      } else {
        skipPersistRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resumeProject = useCallback(() => {
    const loaded = resumeLoadedRef.current;
    if (!loaded) {
      setResumeOffer(null);
      skipPersistRef.current = false;
      return;
    }
    historyRef.current.clear();
    setProject(loaded);
    projectRef.current = loaded;
    refreshWarnings(loaded);
    syncHistoryFlags();
    setResumeOffer(null);
    resumeLoadedRef.current = null;
    skipPersistRef.current = false;
    try {
      sessionStorage.setItem(STORAGE_KEYS.videoSessionHint, 'auto-resumed');
      localStorage.setItem(STORAGE_KEYS.videoSessionHint, '1');
    } catch {
      // ignore
    }
  }, [refreshWarnings, syncHistoryFlags]);

  const discardResume = useCallback(() => {
    const loaded = resumeLoadedRef.current;
    if (loaded) revokeAllMediaUrls(loaded.media);
    resumeLoadedRef.current = null;
    setResumeOffer(null);
    void clearVideoSession();
    try {
      localStorage.removeItem(STORAGE_KEYS.videoSessionHint);
    } catch {
      // ignore
    }
    skipPersistRef.current = false;
  }, []);

  // Debounced session save
  useEffect(() => {
    if (skipPersistRef.current || resumeOffer) return undefined;
    const empty = project.media.length === 0 && project.tracks.every((t) => t.clips.length === 0);
    if (empty) return undefined;
    window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      void (async () => {
        const result = await saveVideoSession(projectRef.current);
        if (!result.ok) {
          setPersistWarning(result.message || 'Could not save session.');
          setWarnings((w) => [...new Set([...w, result.message || 'Storage full — session not saved.'])]);
        } else {
          setPersistWarning('');
          try {
            localStorage.setItem(STORAGE_KEYS.videoSessionHint, '1');
          } catch {
            // ignore
          }
        }
      })();
    }, 500);
    return () => window.clearTimeout(persistTimerRef.current);
  }, [project, resumeOffer]);

  const setTitle = useCallback((raw) => {
    const title = sanitizeDisplayNameInput(raw);
    setProject((p) => {
      const next = { ...p, title };
      projectRef.current = next;
      return next;
    });
  }, []);

  const setAspect = useCallback((aspectId) => {
    commit(setProjectAspect(projectRef.current, aspectId));
  }, [commit]);

  const setPlayhead = useCallback((ms, { stop = false } = {}) => {
    const clamped = Math.max(0, ms);
    if (stop) setPlaying(false);
    setProject((p) => {
      const next = { ...p, playheadMs: clamped };
      projectRef.current = next;
      return next;
    });
  }, []);

  const selectClip = useCallback((clipId) => {
    setProject((p) => {
      const next = { ...p, selectedClipId: clipId || null };
      projectRef.current = next;
      return next;
    });
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((v) => {
      const next = !v;
      if (next) {
        const p = projectRef.current;
        if (p.playheadMs >= p.durationMs && p.durationMs > 0) {
          const restarted = { ...p, playheadMs: 0 };
          projectRef.current = restarted;
          setProject(restarted);
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTsRef.current = 0;
      return undefined;
    }
    const tick = (ts) => {
      if (!playingRef.current) return;
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      const p = projectRef.current;
      const nextMs = p.playheadMs + dt;
      if (p.durationMs > 0 && nextMs >= p.durationMs) {
        const ended = { ...p, playheadMs: p.durationMs };
        projectRef.current = ended;
        setProject(ended);
        setPlaying(false);
        return;
      }
      const advanced = { ...p, playheadMs: nextMs };
      projectRef.current = advanced;
      setProject(advanced);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTsRef.current = 0;
    };
  }, [playing]);

  useEffect(() => () => {
    revokeAllMediaUrls(projectRef.current.media);
    voSessionRef.current?.cancel();
    voMeterRef.current?.dispose();
  }, []);

  const addFiles = useCallback(async (files, { placeOnTimeline = true, asOverlay = false } = {}) => {
    if (!files?.length) return;
    setImporting(true);
    /** @type {{ id: string, name: string, code: string, message: string }[]} */
    const rejects = [];
    /** @type {string[]} */
    const soft = [];
    let next = projectRef.current;
    try {
      for (const file of files) {
        const v = validateVideoImportFile(file);
        if (!v.ok) {
          rejects.push({ id: crypto.randomUUID(), name: file.name, code: v.code, message: v.message });
          continue;
        }
        if (v.warn) soft.push(v.warn);
        try {
          const asset = await probeAndCreateMediaAsset(file, v.kind);
          next = addMediaToProject(next, asset);
          if (placeOnTimeline) {
            next = asOverlay && v.kind === 'image'
              ? addOverlayImageClip(next, asset.id)
              : addClipFromMedia(next, asset.id);
          }
          if (!next.title || next.title === 'Untitled') {
            next = { ...next, title: sanitizeDisplayName(file.name.replace(/\.[^.]+$/, '') || 'Untitled') };
          }
        } catch (err) {
          rejects.push({
            id: crypto.randomUUID(),
            name: file.name,
            code: 'probe',
            message: err instanceof Error ? err.message : 'Could not read media.',
          });
        }
      }
      if (next !== projectRef.current) commit(next);
      setRejections(rejects);
      if (soft.length) setWarnings((w) => [...new Set([...w, ...soft])]);
    } finally {
      setImporting(false);
    }
  }, [commit]);

  const placeMedia = useCallback((mediaId, timelineStartMs) => {
    commit(addClipFromMedia(projectRef.current, mediaId, {
      timelineStartMs: timelineStartMs ?? projectRef.current.playheadMs,
    }));
  }, [commit]);

  const placeOverlayImage = useCallback((mediaId, timelineStartMs) => {
    commit(addOverlayImageClip(projectRef.current, mediaId, {
      timelineStartMs: timelineStartMs ?? projectRef.current.playheadMs,
    }));
  }, [commit]);

  const addText = useCallback((text, style) => {
    commit(addTextClip(projectRef.current, text, {
      timelineStartMs: projectRef.current.playheadMs,
      style,
    }));
  }, [commit]);

  const addSticker = useCallback(async (graphicId) => {
    try {
      const raster = await rasterizeSticker(graphicId);
      const asset = {
        id: crypto.randomUUID(),
        name: raster.name,
        kind: /** @type {const} */ ('image'),
        mime: 'image/png',
        blob: raster.blob,
        objectUrl: raster.objectUrl,
        durationMs: 0,
        width: raster.width,
        height: raster.height,
        fileBytes: raster.blob.size,
      };
      let next = addMediaToProject(projectRef.current, asset);
      next = addStickerClip(next, asset.id, {
        timelineStartMs: next.playheadMs,
        graphicId,
      });
      commit(next);
    } catch (err) {
      setWarnings((w) => [...w, err instanceof Error ? err.message : 'Could not add sticker.']);
    }
  }, [commit]);

  const splitAtPlayhead = useCallback(() => {
    const p = projectRef.current;
    if (!p.selectedClipId) return;
    commit(splitClipAtPlayhead(p, p.selectedClipId, p.playheadMs));
  }, [commit]);

  const removeSelected = useCallback(() => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(deleteClip(projectRef.current, id));
  }, [commit]);

  const rippleRemoveSelected = useCallback(() => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(rippleDeleteClip(projectRef.current, id));
  }, [commit]);

  const duplicateSelected = useCallback(() => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(duplicateClip(projectRef.current, id));
  }, [commit]);

  const applyClipMoveLive = useCallback((clipId, timelineStartMs) => {
    const next = moveClip(projectRef.current, clipId, timelineStartMs, snapEnabled);
    setProject(next);
    projectRef.current = next;
  }, [snapEnabled]);

  const applyClipTrimLive = useCallback((clipId, edge, timelineMs) => {
    const next = trimClipEdge(projectRef.current, clipId, edge, timelineMs, snapEnabled);
    setProject(next);
    projectRef.current = next;
  }, [snapEnabled]);

  const applyTransformLive = useCallback((clipId, transform) => {
    const next = setClipTransform(projectRef.current, clipId, transform);
    setProject(next);
    projectRef.current = next;
  }, []);

  const beginGesture = useCallback(() => {
    gestureBeforeRef.current = cloneProject(projectRef.current);
  }, []);

  const endGesture = useCallback(() => {
    if (gestureBeforeRef.current) {
      historyRef.current.push(gestureBeforeRef.current);
      gestureBeforeRef.current = null;
      refreshWarnings(projectRef.current);
      syncHistoryFlags();
    }
  }, [refreshWarnings, syncHistoryFlags]);

  const setVolume = useCallback((volume) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipVolume(projectRef.current, id, volume));
  }, [commit]);

  const updateTransform = useCallback((transform) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipTransform(projectRef.current, id, transform));
  }, [commit]);

  const updateOpacity = useCallback((opacity) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipOpacity(projectRef.current, id, opacity));
  }, [commit]);

  const updateText = useCallback((patch) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipText(projectRef.current, id, patch));
  }, [commit]);

  const updateFilter = useCallback((filter) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipFilter(projectRef.current, id, filter));
  }, [commit]);

  const applyFilterPreset = useCallback((presetId) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipFilter(projectRef.current, id, filterFromPreset(presetId)));
  }, [commit]);

  const updateTransition = useCallback((transition) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipTransition(projectRef.current, id, transition));
  }, [commit]);

  const unlinkSelected = useCallback(() => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(unlinkClip(projectRef.current, id));
  }, [commit]);

  const detachSelected = useCallback(() => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(detachAudioFromVideo(projectRef.current, id));
  }, [commit]);

  const replaceSelectedMedia = useCallback(async (file) => {
    const id = projectRef.current.selectedClipId;
    if (!id || !file) return;
    const v = validateVideoImportFile(file);
    if (!v.ok) {
      setRejections([{ id: crypto.randomUUID(), name: file.name, code: v.code, message: v.message }]);
      return;
    }
    const asset = await probeAndCreateMediaAsset(file, v.kind);
    let next = addMediaToProject(projectRef.current, asset);
    next = replaceClipMedia(next, id, asset.id);
    commit(next);
  }, [commit]);

  const copyStyleFromSelected = useCallback(() => {
    const id = projectRef.current.selectedClipId;
    if (id) setStyleClipboard(id);
  }, []);

  const pasteStyleToSelected = useCallback(() => {
    const target = projectRef.current.selectedClipId;
    if (!target || !styleClipboard) return;
    commit(pasteStyle(projectRef.current, styleClipboard, target));
  }, [commit, styleClipboard]);

  const placeMarker = useCallback(() => {
    commit(addMarker(projectRef.current, projectRef.current.playheadMs));
  }, [commit]);

  const deleteMarker = useCallback((markerId) => {
    commit(removeMarker(projectRef.current, markerId));
  }, [commit]);

  const updateTrack = useCallback((trackId, patch) => {
    commit(patchTrack(projectRef.current, trackId, patch));
  }, [commit]);

  const createTrack = useCallback((type) => {
    commit(addTrack(projectRef.current, type));
  }, [commit]);

  const nudgeSelected = useCallback((dx, dy) => {
    const id = projectRef.current.selectedClipId;
    const found = id ? findClip(projectRef.current, id) : null;
    if (!found) return;
    const track = found.track;
    if (track.type !== 'overlay' && track.type !== 'text' && track.type !== 'sticker') return;
    const t = found.clip.transform;
    commit(setClipTransform(projectRef.current, id, { x: t.x + dx, y: t.y + dy }));
  }, [commit]);

  const startVo = useCallback(async () => {
    setVoError('');
    try {
      const stream = await requestVoStream();
      const session = startVoRecording(stream);
      const meter = createVoMeter(stream);
      voSessionRef.current = session;
      voMeterRef.current = meter;
      setVoStatus('recording');
      const tick = () => {
        setVoLevel(meter.getLevel());
        voMeterRafRef.current = requestAnimationFrame(tick);
      };
      voMeterRafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setVoStatus('error');
      setVoError(err instanceof Error ? err.message : 'Could not record.');
      setWarnings((w) => [...new Set([...w, err instanceof Error ? err.message : 'VO failed'])]);
    }
  }, []);

  const stopVo = useCallback(async () => {
    const session = voSessionRef.current;
    if (!session) return;
    cancelAnimationFrame(voMeterRafRef.current);
    voMeterRef.current?.dispose();
    voMeterRef.current = null;
    voSessionRef.current = null;
    try {
      const blob = await session.stop();
      setVoStatus('idle');
      setVoLevel(0);
      if (!blob.size) return;
      const file = new File([blob], `voiceover-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
      const asset = await probeAndCreateMediaAsset(file, 'audio');
      asset.fromVo = true;
      let next = addMediaToProject(projectRef.current, asset);
      next = addClipFromMedia(next, asset.id, { timelineStartMs: projectRef.current.playheadMs });
      commit(next);
    } catch (err) {
      setVoStatus('error');
      setVoError(err instanceof Error ? err.message : 'Recording failed.');
    }
  }, [commit]);

  const cancelVo = useCallback(() => {
    cancelAnimationFrame(voMeterRafRef.current);
    voSessionRef.current?.cancel();
    voSessionRef.current = null;
    voMeterRef.current?.dispose();
    voMeterRef.current = null;
    setVoStatus('idle');
    setVoLevel(0);
  }, []);

  const addCaption = useCallback((text = 'Caption') => {
    commit(addCaptionClip(projectRef.current, text, {
      timelineStartMs: projectRef.current.playheadMs,
    }));
    setRailTab('captions');
  }, [commit]);

  const importSrt = useCallback((srtText) => {
    const next = importSrtToProject(projectRef.current, srtText);
    if (next === projectRef.current) {
      setWarnings((w) => [...new Set([...w, 'No captions found in SRT.'])]);
      return;
    }
    commit(next);
    setRailTab('captions');
  }, [commit]);

  const exportSrt = useCallback(() => {
    const text = exportProjectSrt(projectRef.current);
    const blob = new Blob([text || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeDisplayName(projectRef.current.title || 'captions')}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const dictateCaption = useCallback(async () => {
    if (!dictateSupported || dictating) return;
    const SR = /** @type {any} */ (window).SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition;
    if (!SR) {
      setWarnings((w) => [...new Set([...w, 'Dictate unavailable in this browser.'])]);
      return;
    }
    setDictating(true);
    try {
      await new Promise((resolve, reject) => {
        const rec = new SR();
        dictateRef.current = rec;
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onresult = (ev) => {
          const transcript = ev.results?.[0]?.[0]?.transcript;
          if (transcript) {
            commit(addCaptionClip(projectRef.current, String(transcript).trim(), {
              timelineStartMs: projectRef.current.playheadMs,
            }));
          }
          resolve(undefined);
        };
        rec.onerror = () => reject(new Error('Dictate failed.'));
        rec.onend = () => resolve(undefined);
        rec.start();
      });
    } catch (err) {
      setWarnings((w) => [...new Set([...w, err instanceof Error ? err.message : 'Dictate failed.'])]);
    } finally {
      dictateRef.current = null;
      setDictating(false);
    }
  }, [commit, dictateSupported, dictating]);

  const setSpeed = useCallback((speed) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipSpeed(projectRef.current, id, speed));
  }, [commit]);

  const setFreeze = useCallback((freeze) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipFreeze(projectRef.current, id, freeze));
  }, [commit]);

  const setReverse = useCallback((reverse) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipReverse(projectRef.current, id, reverse));
  }, [commit]);

  const setFades = useCallback((fades) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipFades(projectRef.current, id, fades));
  }, [commit]);

  const setAudioRole = useCallback((role) => {
    const id = projectRef.current.selectedClipId;
    if (!id) return;
    commit(setClipAudioRole(projectRef.current, id, role));
  }, [commit]);

  const updateDuck = useCallback((duck) => {
    commit(setProjectDuck(projectRef.current, duck));
  }, [commit]);

  const toggleTrackSolo = useCallback((trackId, solo) => {
    commit(setTrackSolo(projectRef.current, trackId, solo));
  }, [commit]);

  const toggleSafeMargins = useCallback(() => {
    setShowSafeMargins((v) => !v);
  }, []);

  const usedMediaIds = useMemo(() => {
    /** @type {string[]} */
    const ids = [];
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.mediaId) ids.push(clip.mediaId);
      }
    }
    return ids;
  }, [project.tracks]);

  const activeVideoClip = getVideoClipAtPlayhead(project, project.playheadMs);

  return {
    project,
    isEmpty,
    playing,
    snapEnabled,
    setSnapEnabled,
    pxPerSecond,
    setPxPerSecond,
    canUndo,
    canRedo,
    exportOpen,
    setExportOpen,
    importing,
    rejections,
    warnings,
    selectedClip,
    selectedMedia,
    selectedFound,
    activeVideoClip,
    railTab,
    setRailTab,
    voStatus,
    voError,
    voLevel,
    styleClipboard,
    showSafeMargins,
    resumeOffer,
    persistWarning,
    dictateSupported,
    dictating,
    usedMediaIds,
    acceptAttribute: VIDEO_ACCEPT_ATTR,
    timecode: formatTimecode(project.playheadMs, project.fps),
    durationTimecode: formatTimecode(project.durationMs, project.fps),
    undo,
    redo,
    reset,
    setTitle,
    setAspect,
    setPlayhead,
    selectClip,
    togglePlay,
    setPlaying,
    addFiles,
    placeMedia,
    placeOverlayImage,
    addText,
    addSticker,
    addCaption,
    importSrt,
    exportSrt,
    dictateCaption,
    resumeProject,
    discardResume,
    setSpeed,
    setFreeze,
    setReverse,
    setFades,
    setAudioRole,
    updateDuck,
    toggleTrackSolo,
    toggleSafeMargins,
    splitAtPlayhead,
    removeSelected,
    rippleRemoveSelected,
    duplicateSelected,
    applyClipMoveLive,
    applyClipTrimLive,
    applyTransformLive,
    beginGesture,
    endGesture,
    setVolume,
    updateTransform,
    updateOpacity,
    updateText,
    updateFilter,
    applyFilterPreset,
    updateTransition,
    unlinkSelected,
    detachSelected,
    replaceSelectedMedia,
    copyStyleFromSelected,
    pasteStyleToSelected,
    placeMarker,
    deleteMarker,
    updateTrack,
    createTrack,
    nudgeSelected,
    startVo,
    stopVo,
    cancelVo,
    findClip: (id) => findClip(project, id),
    getMedia: (id) => getMedia(project, id),
  };
}
