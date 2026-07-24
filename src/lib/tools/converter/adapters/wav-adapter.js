import { sanitizeFileName, replaceExtension } from '../converter-filenames.js';
import { adapterError, throwIfAborted } from './adapter-contract.js';

const PCM_FORMATS = new Set([0x0001, 0x0003]); // PCM, IEEE float

/**
 * @param {DataView} view
 * @param {number} offset
 * @returns {string}
 */
function readFourCC(view, offset) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

/**
 * @param {Uint8Array} bytes
 * @returns {{ audioFormat: number, channels: number, sampleRate: number, bitsPerSample: number, dataOffset: number, dataSize: number }}
 */
export function parseWavPcm(bytes) {
  if (bytes.length < 44) {
    throw adapterError({ code: 'UNSUPPORTED_FORMAT', message: 'WAV file too small' });
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readFourCC(view, 0) !== 'RIFF' || readFourCC(view, 8) !== 'WAVE') {
    throw adapterError({ code: 'UNSUPPORTED_FORMAT', message: 'Not a RIFF/WAVE file' });
  }

  let offset = 12;
  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= bytes.length) {
    const chunkId = readFourCC(view, offset);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;

    if (chunkId === 'fmt ') {
      audioFormat = view.getUint16(chunkDataOffset, true);
      channels = view.getUint16(chunkDataOffset + 2, true);
      sampleRate = view.getUint32(chunkDataOffset + 4, true);
      bitsPerSample = view.getUint16(chunkDataOffset + 14, true);
    } else if (chunkId === 'data') {
      dataOffset = chunkDataOffset;
      dataSize = chunkSize;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (!PCM_FORMATS.has(audioFormat)) {
    throw adapterError({ code: 'UNSUPPORTED_FORMAT', message: 'Only PCM WAV supported' });
  }
  if (dataOffset < 0 || dataSize <= 0) {
    throw adapterError({ code: 'UNSUPPORTED_FORMAT', message: 'Missing WAV data chunk' });
  }
  if (dataOffset + dataSize > bytes.length) {
    throw adapterError({ code: 'FILE_TRUNCATED', message: 'WAV data chunk truncated' });
  }

  return { audioFormat, channels, sampleRate, bitsPerSample, dataOffset, dataSize };
}

/**
 * @param {Float32Array} samples
 * @param {number} channels
 * @param {number} sampleRate
 * @returns {Uint8Array}
 */
export function encodeWavPcm16(samples, channels, sampleRate) {
  const numSamples = samples.length;
  const blockAlign = channels * 2;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let o = 44;
  for (let i = 0; i < numSamples; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }

  return new Uint8Array(buffer);
}

/**
 * @param {Uint8Array} pcmBytes
 * @param {number} channels
 * @param {number} bitsPerSample
 * @returns {Float32Array}
 */
function decodePcmToFloat(pcmBytes, channels, bitsPerSample) {
  const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);
  const sampleCount = pcmBytes.byteLength / (bitsPerSample / 8);
  const out = new Float32Array(sampleCount);

  if (bitsPerSample === 16) {
    for (let i = 0; i < sampleCount; i += 1) {
      out[i] = view.getInt16(i * 2, true) / 0x8000;
    }
  } else if (bitsPerSample === 32) {
    for (let i = 0; i < sampleCount; i += 1) {
      out[i] = view.getFloat32(i * 4, true);
    }
  } else {
    throw adapterError({ code: 'UNSUPPORTED_FORMAT', message: `Unsupported bits per sample: ${bitsPerSample}` });
  }

  return out;
}

/**
 * @param {Float32Array} input
 * @param {number} inChannels
 * @param {number} inRate
 * @param {number} outChannels
 * @param {number} outRate
 * @param {number} gainDb
 * @returns {Float32Array}
 */
export function transformPcm(input, inChannels, inRate, outChannels, outRate, gainDb = 0) {
  const gain = 10 ** (gainDb / 20);
  const inFrames = Math.floor(input.length / inChannels);
  const outFrames = Math.max(1, Math.round(inFrames * outRate / inRate));
  const output = new Float32Array(outFrames * outChannels);

  for (let i = 0; i < outFrames; i += 1) {
    const srcFrame = Math.min(inFrames - 1, Math.floor(i * inRate / outRate));
    const frameSamples = [];
    for (let ch = 0; ch < inChannels; ch += 1) {
      frameSamples.push(input[srcFrame * inChannels + ch] * gain);
    }

    if (outChannels === 1) {
      const mono = frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length;
      output[i] = Math.max(-1, Math.min(1, mono));
    } else {
      const left = frameSamples[0] ?? 0;
      const right = frameSamples[1] ?? left;
      output[i * 2] = Math.max(-1, Math.min(1, left));
      output[i * 2 + 1] = Math.max(-1, Math.min(1, right));
    }
  }

  return output;
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @returns {Promise<import('./adapter-contract.js').AdapterAnalyzeResult>}
 */
export async function analyzeWav(sourceBytes, ctx) {
  throwIfAborted(ctx.signal);
  const info = parseWavPcm(sourceBytes);
  return {
    metadata: {
      channels: info.channels,
      sampleRate: info.sampleRate,
      bitsPerSample: info.bitsPerSample,
      durationSec: info.dataSize / (info.sampleRate * info.channels * (info.bitsPerSample / 8)),
    },
  };
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @param {string} [sourceName]
 * @returns {Promise<import('./adapter-contract.js').AdapterProcessResult>}
 */
export async function processWav(sourceBytes, ctx, sourceName = 'audio.wav') {
  throwIfAborted(ctx.signal);
  ctx.onProgress?.('processing', 0.1);

  const info = parseWavPcm(sourceBytes);
  const pcm = sourceBytes.subarray(info.dataOffset, info.dataOffset + info.dataSize);
  const samples = decodePcmToFloat(pcm, info.channels, info.bitsPerSample);

  const outRate = Number(ctx.options.sampleRate ?? info.sampleRate);
  const outChannels = Number(ctx.options.channels ?? info.channels);
  const gainDb = Number(ctx.options.gainDb ?? 0);

  ctx.onProgress?.('processing', 0.5);
  const transformed = transformPcm(samples, info.channels, info.sampleRate, outChannels, outRate, gainDb);
  const outBytes = encodeWavPcm16(transformed, outChannels, outRate);

  ctx.onProgress?.('processing', 0.95);
  return {
    blob: new Blob([outBytes], { type: 'audio/wav' }),
    mimeType: 'audio/wav',
    fileName: replaceExtension(sanitizeFileName(sourceName), 'wav'),
    metadata: { sampleRate: outRate, channels: outChannels },
  };
}

export const wavAdapter = Object.freeze({
  id: 'wav',
  analyze: analyzeWav,
  process: processWav,
});
