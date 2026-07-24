import { buildExportGraph, summarizeExportGraph } from './video-export-graph.js';
import { cancelFfmpegJob, runFfmpegJob } from '@/lib/tools/converter/ffmpeg/ffmpeg-runner.js';
import { getFfmpegRuntime } from '@/lib/tools/converter/ffmpeg/ffmpeg-runtime.js';
import { sanitizeDisplayName } from '@/lib/tools/shared/display-filename.js';
import { fetchFile } from '@ffmpeg/util';

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {{ audioOnly?: boolean, presetId?: string }} [opts]
 */
export function planExport(project, opts = {}) {
  const graph = buildExportGraph(project, { audioOnly: opts.audioOnly });
  const summary = summarizeExportGraph(graph);
  return {
    ...summary,
    videoCount: summary.baseCount,
    audioCount: summary.audioCount,
    totalDurationMs: graph.durationMs,
    graph,
    checklist: [
      ...graph.softWarnings,
      ...(summary.baseCount === 0 && !graph.audioOnly && summary.audioCount === 0
        ? ['Nothing to export']
        : []),
    ],
  };
}

/** @param {Blob} blob */
async function blobToBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

/** @param {string} name @param {string} fallback */
function extFromName(name, fallback) {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : fallback;
}

/**
 * Encode still / sticker to short transparent-friendly mp4 (yuv420).
 */
async function encodeStill(ffmpeg, blob, name, durationSec, width, height) {
  const inName = name;
  await ffmpeg.writeFile(inName, await fetchFile(blob));
  const outName = `${name}.mp4`;
  const w = Math.max(2, Math.floor(width / 2) * 2);
  const h = Math.max(2, Math.floor(height / 2) * 2);
  await ffmpeg.exec([
    '-loop', '1',
    '-i', inName,
    '-t', String(Math.max(0.1, durationSec)),
    '-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-an',
    '-y', outName,
  ]);
  return outName;
}

/**
 * Extract timed media segment to mp4 scaled/padded to canvas.
 */
async function extractBaseSegment(ffmpeg, layer, canvasW, canvasH, index) {
  const media = layer.media;
  if (!media) throw new Error('Missing media for base layer');
  const inputExt = extFromName(media.name, media.kind === 'image' ? 'png' : 'mp4');
  const inName = `base_in_${index}.${inputExt}`;
  const outName = `base_${index}.mp4`;
  await ffmpeg.writeFile(inName, await fetchFile(media.blob));
  const start = layer.sourceInMs / 1000;
  const dur = Math.max(0.05, layer.durationMs / 1000);
  const w = Math.max(2, Math.floor(canvasW / 2) * 2);
  const h = Math.max(2, Math.floor(canvasH / 2) * 2);
  /** @type {string[]} */
  const vf = [`scale=${w}:${h}:force_original_aspect_ratio=decrease`, `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`];
  if (layer.speedVf?.length) vf.push(...layer.speedVf);
  if (layer.filterEq) vf.push(layer.filterEq);

  if (media.kind === 'image') {
    await ffmpeg.exec([
      '-loop', '1',
      '-i', inName,
      '-t', String(dur),
      '-vf', vf.join(','),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-y', outName,
    ]);
  } else {
    await ffmpeg.exec([
      '-ss', String(start),
      '-i', inName,
      '-t', String(dur),
      '-vf', vf.join(','),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-y', outName,
    ]);
  }
  await ffmpeg.deleteFile(inName).catch(() => {});
  return outName;
}

/**
 * Export project via FFmpeg WASM using the Plan 3 graph.
 * @param {import('./video-project.js').VideoProject} project
 * @param {{ format?: 'mp4'|'webm'|'mp3', signal?: AbortSignal, onProgress?: (r: number) => void, audioOnly?: boolean, burnCaptions?: boolean, includeSrt?: boolean, presetId?: string }} [opts]
 */
export async function exportVideoProject(project, opts = {}) {
  const audioOnly = Boolean(opts.audioOnly);
  const format = audioOnly ? 'mp3' : (opts.format === 'webm' ? 'webm' : 'mp4');
  const outputExt = format;
  const mimeType = format === 'webm' ? 'video/webm' : format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
  const plan = planExport(project, { audioOnly });
  const graph = plan.graph;

  if (!graph.videoLayers.length && !graph.audioLayers.length) {
    throw Object.assign(new Error('Nothing to export — add clips to the timeline.'), { code: 'EMPTY' });
  }

  // Audio-only or no base video
  if ((audioOnly || !graph.videoLayers.some((l) => l.role === 'base')) && graph.audioLayers.length) {
    const seg = graph.audioLayers[0];
    const inputExt = extFromName(seg.media.name, 'mp3');
    const vol = (seg.volume || 1) * (seg.duckGain || 1);
    const result = await runFfmpegJob({
      builderName: 'splitMediaSegment',
      builderParams: {
        inputExt,
        outputExt: audioOnly ? 'mp3' : inputExt,
        startSec: seg.sourceInMs / 1000,
        durationSec: seg.durationMs / 1000,
      },
      sourceBytes: await blobToBytes(seg.media.blob),
      inputExt,
      outputExt: audioOnly ? 'mp3' : inputExt,
      mimeType: audioOnly ? 'audio/mpeg' : seg.media.mime,
      fileName: `${sanitizeDisplayName(project.title)}.${audioOnly ? 'mp3' : inputExt}`,
      signal: opts.signal,
      onProgress: opts.onProgress,
    });
    void vol;
    return {
      blob: result.blob,
      mimeType: result.mimeType,
      fileName: result.fileName || `${sanitizeDisplayName(project.title)}.${audioOnly ? 'mp3' : inputExt}`,
      srtText: opts.includeSrt ? (await import('./video-captions.js')).exportProjectSrt(project) : undefined,
    };
  }

  const ffmpeg = await getFfmpegRuntime({ onProgress: opts.onProgress });
  if (opts.signal?.aborted) {
    throw Object.assign(new Error('Cancelled'), { code: 'CANCELLED' });
  }

  const bases = graph.videoLayers.filter((l) => l.role === 'base');
  /** @type {string[]} */
  const baseFiles = [];
  for (let i = 0; i < bases.length; i += 1) {
    opts.onProgress?.(i / (bases.length + 3));
    const name = await extractBaseSegment(ffmpeg, bases[i], graph.width, graph.height, i);
    baseFiles.push(name);
  }

  let programFile = baseFiles[0];
  if (baseFiles.length > 1) {
    // Prefer xfade when a transition is planned between first pair
    if (graph.transitions.length && baseFiles.length === 2) {
      const tr = graph.transitions[0];
      const outName = 'program_xfade.mp4';
      const offset = Math.max(0, tr.offsetSec);
      const dur = Math.max(0.05, tr.durationMs / 1000);
      try {
        await ffmpeg.exec([
          '-i', baseFiles[0],
          '-i', baseFiles[1],
          '-filter_complex',
          `[0:v][1:v]xfade=transition=${tr.xfade}:duration=${dur}:offset=${offset}[v]`,
          '-map', '[v]',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-an',
          '-y', outName,
        ]);
        programFile = outName;
      } catch {
        // fall through to concat
      }
    }
    if (programFile === baseFiles[0] && baseFiles.length > 1) {
      const listBody = `${baseFiles.map((n) => `file '${n}'`).join('\n')}\n`;
      await ffmpeg.writeFile('concat-list.txt', listBody);
      programFile = 'program_concat.mp4';
      try {
        await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat-list.txt', '-c', 'copy', '-y', programFile]);
      } catch {
        await ffmpeg.exec([
          '-f', 'concat', '-safe', '0', '-i', 'concat-list.txt',
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', '-y', programFile,
        ]);
      }
    }
  }

  let current = programFile;
  const overlays = graph.videoLayers.filter((l) => (
    l.role === 'text' || l.role === 'sticker' || l.role === 'overlay' || l.role === 'caption'
  ));
  for (let i = 0; i < overlays.length; i += 1) {
    const layer = overlays[i];
    const outName = `ov_${i}.mp4`;
    const enable = `between(t\\,${(layer.timelineStartMs / 1000).toFixed(3)}\\,${((layer.timelineStartMs + layer.durationMs) / 1000).toFixed(3)})`;
    const x = Math.round(layer.transform.x);
    const y = Math.round(layer.transform.y);

    if (layer.role === 'text' || layer.role === 'caption' || (opts.burnCaptions !== false && layer.role === 'caption')) {
      const text = String(layer.text || 'Text').replace(/:/g, '\\:').replace(/'/g, '');
      const fontsize = layer.style?.fontSize || (layer.role === 'caption' ? 36 : 48);
      const fontcolor = (layer.style?.color || 'white').replace('#', '');
      const fc = fontcolor.length === 6 ? fontcolor : 'ffffff';
      await ffmpeg.exec([
        '-i', current,
        '-vf', `drawtext=text='${text}':fontsize=${fontsize}:fontcolor=0x${fc}:x=${x}:y=${y}:enable='${enable}'`,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-an',
        '-y', outName,
      ]);
    } else if (layer.media) {
      const inputExt = extFromName(layer.media.name, 'png');
      const ovIn = `ovsrc_${i}.${inputExt}`;
      await ffmpeg.writeFile(ovIn, await fetchFile(layer.media.blob));
      const scale = Math.max(0.05, layer.transform.scale);
      const sw = Math.max(2, Math.floor((layer.media.width || 240) * scale / 2) * 2);
      const sh = Math.max(2, Math.floor((layer.media.height || 240) * scale / 2) * 2);
      await ffmpeg.exec([
        '-i', current,
        '-i', ovIn,
        '-filter_complex',
        `[1:v]scale=${sw}:${sh}[ov];[0:v][ov]overlay=x=${x}:y=${y}:enable='${enable}'[v]`,
        '-map', '[v]',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-an',
        '-y', outName,
      ]);
      await ffmpeg.deleteFile(ovIn).catch(() => {});
    } else {
      continue;
    }
    if (current !== programFile && current !== baseFiles[0]) {
      await ffmpeg.deleteFile(current).catch(() => {});
    }
    current = outName;
  }

  /** @type {string[]} */
  const audioParts = [];
  for (let i = 0; i < graph.audioLayers.length; i += 1) {
    const a = graph.audioLayers[i];
    const inputExt = extFromName(a.media.name, a.media.kind === 'video' ? 'mp4' : 'mp3');
    const inName = `ain_${i}.${inputExt}`;
    const outName = `a_${i}.wav`;
    await ffmpeg.writeFile(inName, await fetchFile(a.media.blob));
    const delay = Math.max(0, Math.round(a.delayMs));
    const vol = (a.volume || 1) * (a.duckGain || 1);
    /** @type {string[]} */
    const af = [`volume=${vol}`];
    if (a.speedAf?.length) af.push(...a.speedAf);
    if (a.fadeInMs || a.fadeOutMs) {
      const d = Math.max(0.05, a.durationMs / 1000);
      const fi = (a.fadeInMs || 0) / 1000;
      const fo = (a.fadeOutMs || 0) / 1000;
      af.push(`afade=t=in:st=0:d=${fi}`, `afade=t=out:st=${Math.max(0, d - fo)}:d=${fo}`);
    }
    af.push(`adelay=${delay}|${delay}`);
    await ffmpeg.exec([
      '-ss', String(a.sourceInMs / 1000),
      '-i', inName,
      '-t', String(Math.max(0.05, a.durationMs / 1000)),
      '-af', af.join(','),
      '-y', outName,
    ]);
    audioParts.push(outName);
    await ffmpeg.deleteFile(inName).catch(() => {});
  }

  const finalName = `final.${outputExt}`;
  if (audioParts.length === 0) {
    await ffmpeg.exec(['-i', current, '-c:v', 'copy', '-an', '-y', finalName]);
  } else if (audioParts.length === 1) {
    await ffmpeg.exec([
      '-i', current,
      '-i', audioParts[0],
      '-c:v', 'copy',
      '-c:a', format === 'webm' ? 'libopus' : 'aac',
      '-shortest',
      '-y', finalName,
    ]);
  } else {
    /** @type {string[]} */
    const args = ['-i', current];
    for (const p of audioParts) args.push('-i', p);
    const n = audioParts.length;
    const inputs = Array.from({ length: n }, (_, i) => `[${i + 1}:a]`).join('');
    args.push(
      '-filter_complex', `${inputs}amix=inputs=${n}:duration=longest:normalize=0[aout]`,
      '-map', '0:v',
      '-map', '[aout]',
      '-c:v', 'copy',
      '-c:a', format === 'webm' ? 'libopus' : 'aac',
      '-shortest',
      '-y', finalName,
    );
    await ffmpeg.exec(args);
  }

  const data = await ffmpeg.readFile(finalName);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));

  for (const f of [...baseFiles, ...audioParts, current, finalName, 'concat-list.txt']) {
    await ffmpeg.deleteFile(f).catch(() => {});
  }

  opts.onProgress?.(1);
  const { exportProjectSrt } = await import('./video-captions.js');
  return {
    blob: new Blob([bytes], { type: mimeType }),
    mimeType,
    fileName: `${sanitizeDisplayName(project.title)}.${outputExt}`,
    srtText: opts.includeSrt !== false ? exportProjectSrt(project) : undefined,
  };
}

export { cancelFfmpegJob as cancelVideoExport, encodeStill };
