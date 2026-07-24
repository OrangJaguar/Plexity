/** @typedef {'image' | 'audio' | 'video' | 'data'} ConverterCategory */
/** @typedef {'light' | 'medium' | 'heavy'} ResourceClass */

/**
 * @typedef {object} ConversionOptionField
 * @property {string} key
 * @property {'number' | 'boolean' | 'enum' | 'string' | 'timecode' | 'dimensions'} type
 * @property {string} label
 * @property {number} [min]
 * @property {number} [max]
 * @property {number} [step]
 * @property {boolean} [default]
 * @property {ReadonlyArray<string | number>} [values]
 * @property {string | number} [defaultValue]
 */

/**
 * @typedef {object} MetadataEffects
 * @property {boolean} [stripsMetadata]
 * @property {boolean} [flattensAlpha]
 * @property {boolean} [dropsAnimation]
 * @property {boolean} [mayLoseTracks]
 */

/**
 * @typedef {object} ConversionOperation
 * @property {string} id
 * @property {string} label
 * @property {ConverterCategory} category
 * @property {ReadonlyArray<string>} inputFormats
 * @property {string} outputFormat
 * @property {string} extension
 * @property {string} mimeType
 * @property {boolean} lossy
 * @property {boolean} transparency
 * @property {string} adapter
 * @property {ReadonlyArray<string>} engineCandidates
 * @property {ReadonlyArray<string>} warnings
 * @property {ResourceClass} resourceClass
 * @property {Readonly<MetadataEffects>} metadataEffects
 * @property {Readonly<{ worker?: boolean, offscreenCanvas?: boolean, videoEncoder?: boolean, opfs?: boolean, ffmpeg?: boolean }>} runtimeRequirements
 * @property {ReadonlyArray<ConversionOptionField>} options
 * @property {Readonly<Record<string, Record<string, unknown>>>} presets
 */

import { FORMAT_MIME } from './format-mime.js';

const IMAGE_OPTIONS = Object.freeze([
  { key: 'maxWidth', type: 'number', label: 'Max width', min: 1, max: 8192, step: 1 },
  { key: 'maxHeight', type: 'number', label: 'Max height', min: 1, max: 8192, step: 1 },
  { key: 'exactWidth', type: 'number', label: 'Exact width', min: 1, max: 8192, step: 1 },
  { key: 'exactHeight', type: 'number', label: 'Exact height', min: 1, max: 8192, step: 1 },
  { key: 'quality', type: 'number', label: 'Quality', min: 0.1, max: 1, step: 0.05, defaultValue: 0.92 },
  { key: 'flattenTransparency', type: 'boolean', label: 'Flatten transparency', default: true },
  { key: 'rasterizeAnimation', type: 'boolean', label: 'Use first animation frame', default: true },
  { key: 'metadataPolicy', type: 'enum', label: 'Metadata', values: ['keep', 'strip', 'minimal'], defaultValue: 'strip' },
]);

const WAV_OPTIONS = Object.freeze([
  { key: 'sampleRate', type: 'enum', label: 'Sample rate', values: [8000, 11025, 16000, 22050, 44100, 48000], defaultValue: 44100 },
  { key: 'channels', type: 'enum', label: 'Channels', values: [1, 2], defaultValue: 2 },
  { key: 'gainDb', type: 'number', label: 'Gain (dB)', min: -24, max: 24, step: 0.5, defaultValue: 0 },
]);

const AUDIO_OPTIONS = Object.freeze([
  { key: 'bitrateKbps', type: 'enum', label: 'Bitrate (kbps)', values: [96, 128, 192, 256, 320], defaultValue: 192 },
  { key: 'sampleRate', type: 'enum', label: 'Sample rate', values: [44100, 48000], defaultValue: 44100 },
  { key: 'channels', type: 'enum', label: 'Channels', values: [1, 2], defaultValue: 2 },
  { key: 'loudnessNormalize', type: 'boolean', label: 'Normalize loudness', default: false },
  { key: 'metadataPolicy', type: 'enum', label: 'Metadata', values: ['keep', 'strip', 'minimal'], defaultValue: 'strip' },
]);

const VIDEO_OPTIONS = Object.freeze([
  { key: 'thumbnail', type: 'boolean', label: 'Generate thumbnail', default: false },
  { key: 'transcode', type: 'boolean', label: 'Transcode when supported', default: false },
  { key: 'videoBitrateKbps', type: 'enum', label: 'Video bitrate (kbps)', values: [500, 1000, 2500, 5000, 8000], defaultValue: 2500 },
  { key: 'audioBitrateKbps', type: 'enum', label: 'Audio bitrate (kbps)', values: [96, 128, 192, 256, 320], defaultValue: 128 },
  { key: 'fps', type: 'enum', label: 'Frame rate', values: [24, 25, 30, 60], defaultValue: 30 },
  { key: 'videoCodec', type: 'enum', label: 'Video codec', values: ['libx264', 'libvpx-vp9'], defaultValue: 'libx264' },
  { key: 'audioCodec', type: 'enum', label: 'Audio codec', values: ['aac', 'libopus'], defaultValue: 'aac' },
  { key: 'width', type: 'number', label: 'Width', min: 1, max: 8192, step: 1 },
  { key: 'height', type: 'number', label: 'Height', min: 1, max: 8192, step: 1 },
]);

const DATA_OPTIONS = Object.freeze([
  { key: 'delimiter', type: 'enum', label: 'Delimiter', values: [',', '\t', ';'], defaultValue: ',' },
  { key: 'pretty', type: 'boolean', label: 'Pretty JSON', default: true },
  { key: 'rootElement', type: 'enum', label: 'XML root element', values: ['root', 'data', 'items'], defaultValue: 'root' },
]);

const NATIVE_IMAGE = Object.freeze(['native-image']);
const NATIVE_WAV = Object.freeze(['wav']);
const NATIVE_DATA = Object.freeze(['data']);
const MEDIABUNNY_VIDEO = Object.freeze(['mediabunny', 'ffmpeg']);
const FFMPEG_ONLY = Object.freeze(['ffmpeg']);

/**
 * @param {Partial<ConversionOperation> & Pick<ConversionOperation, 'id' | 'category' | 'inputFormats' | 'outputFormat' | 'extension' | 'mimeType' | 'adapter'>} spec
 * @returns {ConversionOperation}
 */
function defineOperation(spec) {
  return Object.freeze({
    label: spec.label ?? `${spec.inputFormats.join('/')} → ${spec.outputFormat}`,
    lossy: spec.lossy ?? false,
    transparency: spec.transparency ?? false,
    engineCandidates: spec.engineCandidates ?? NATIVE_IMAGE,
    warnings: Object.freeze([...(spec.warnings ?? [])]),
    resourceClass: spec.resourceClass ?? 'light',
    metadataEffects: Object.freeze({ ...(spec.metadataEffects ?? {}) }),
    runtimeRequirements: Object.freeze({ worker: true, ...(spec.runtimeRequirements ?? {}) }),
    options: spec.options ?? [],
    presets: Object.freeze({ ...(spec.presets ?? {}) }),
    ...spec,
  });
}

/**
 * @param {string} input
 * @param {string} output
 * @returns {ConversionOperation}
 */
function imageOp(input, output) {
  const ext = output === 'jpeg' ? 'jpg' : output;
  const lossy = output === 'jpeg' || output === 'webp';
  const transparency = output === 'png' || output === 'webp';
  /** @type {ReadonlyArray<string>} */
  const warnings = [];
  /** @type {MetadataEffects} */
  const metadataEffects = { stripsMetadata: lossy };
  if (output === 'jpeg') {
    warnings.push('LOSSY', 'FLATTEN_ALPHA');
    metadataEffects.flattensAlpha = true;
  } else if (lossy) {
    warnings.push('LOSSY');
  }
  if (input === 'gif') {
    warnings.push('DROP_ANIMATION');
    metadataEffects.dropsAnimation = true;
  }

  const inputFormats = input === 'jpeg' ? ['jpeg', 'jpg'] : [input];

  return defineOperation({
    id: `${input}-to-${output}`,
    label: `${input.toUpperCase()} to ${output.toUpperCase()}`,
    category: 'image',
    inputFormats,
    outputFormat: output,
    extension: ext,
    mimeType: FORMAT_MIME[output] ?? FORMAT_MIME[ext],
    lossy,
    transparency,
    adapter: 'image',
    engineCandidates: input === 'bmp' || input === 'gif'
      ? Object.freeze(['native-image', 'ffmpeg'])
      : NATIVE_IMAGE,
    warnings,
    resourceClass: 'light',
    metadataEffects,
    runtimeRequirements: { worker: true, offscreenCanvas: true },
    options: IMAGE_OPTIONS,
    presets: Object.freeze(output === 'webp' || output === 'jpeg' ? { web: { maxWidth: 1920, quality: 0.85 } } : {}),
  });
}

/** @type {ReadonlyArray<ConversionOperation>} */
const IMAGE_OPS = Object.freeze(
  (() => {
    const inputs = ['png', 'jpeg', 'webp', 'bmp', 'gif'];
    const outputs = ['png', 'jpeg', 'webp'];
    /** @type {ConversionOperation[]} */
    const ops = [];
    for (const input of inputs) {
      for (const output of outputs) {
        if (input === output || (input === 'jpeg' && output === 'jpeg')) continue;
        const inFmt = input === 'jpeg' ? 'jpeg' : input;
        const outFmt = output;
        if (inFmt === outFmt) continue;
        ops.push(imageOp(inFmt === 'jpeg' ? 'jpeg' : inFmt, outFmt));
      }
    }
    // Normalize jpeg input alias
    return ops.filter((op, idx, arr) => arr.findIndex((o) => o.id === op.id) === idx);
  })(),
);

/** @type {ReadonlyArray<ConversionOperation>} */
const AUDIO_OPS = Object.freeze([
  defineOperation({
    id: 'wav-transform',
    label: 'Transform WAV',
    category: 'audio',
    inputFormats: ['wav'],
    outputFormat: 'wav',
    extension: 'wav',
    mimeType: FORMAT_MIME.wav,
    lossy: false,
    adapter: 'wav',
    engineCandidates: NATIVE_WAV,
    resourceClass: 'light',
    runtimeRequirements: { worker: true },
    options: WAV_OPTIONS,
    presets: Object.freeze({ voice: { sampleRate: 16000, channels: 1 } }),
  }),
  ...(['mp3', 'm4a', 'aac', 'flac', 'ogg', 'opus'].flatMap((target) => {
    const output = target === 'aac' ? 'm4a' : target;
    const ext = output === 'opus' ? 'opus' : output;
    return [
      defineOperation({
        id: `wav-to-${target}`,
        label: `WAV to ${target.toUpperCase()}`,
        category: 'audio',
        inputFormats: ['wav'],
        outputFormat: output,
        extension: ext,
        mimeType: FORMAT_MIME[output] ?? FORMAT_MIME[ext],
        lossy: !['flac'].includes(target),
        adapter: 'audio',
        engineCandidates: FFMPEG_ONLY,
        warnings: ['LOSSY', 'STRIP_METADATA', 'FFMPEG_REQUIRED'],
        resourceClass: 'medium',
        metadataEffects: { stripsMetadata: true },
        runtimeRequirements: { worker: true, ffmpeg: true },
        options: AUDIO_OPTIONS,
      }),
      defineOperation({
        id: `${target}-to-wav`,
        label: `${target.toUpperCase()} to WAV`,
        category: 'audio',
        inputFormats: [target === 'm4a' ? 'm4a' : target, ...(target === 'aac' ? [] : []), ...(target === 'm4a' ? ['aac'] : [])],
        outputFormat: 'wav',
        extension: 'wav',
        mimeType: FORMAT_MIME.wav,
        lossy: false,
        adapter: 'audio',
        engineCandidates: FFMPEG_ONLY,
        warnings: ['STRIP_METADATA', 'FFMPEG_REQUIRED'],
        resourceClass: 'medium',
        metadataEffects: { stripsMetadata: true },
        runtimeRequirements: { worker: true, ffmpeg: true },
        options: WAV_OPTIONS,
      }),
    ];
  })),
]);

/** @type {ReadonlyArray<ConversionOperation>} */
const VIDEO_OPS = Object.freeze([
  defineOperation({
    id: 'mp4-to-webm',
    label: 'MP4 to WebM',
    category: 'video',
    inputFormats: ['mp4'],
    outputFormat: 'webm',
    extension: 'webm',
    mimeType: FORMAT_MIME.webm,
    lossy: true,
    adapter: 'video',
    engineCandidates: MEDIABUNNY_VIDEO,
    warnings: ['LOSSY', 'LOSE_TRACKS', 'CODEC_FALLBACK'],
    resourceClass: 'heavy',
    metadataEffects: { mayLoseTracks: true, stripsMetadata: true },
    runtimeRequirements: { worker: true, videoEncoder: true },
    options: VIDEO_OPTIONS,
  }),
  defineOperation({
    id: 'mp4-remux',
    label: 'Remux MP4',
    category: 'video',
    inputFormats: ['mp4', 'm4v', 'mov'],
    outputFormat: 'mp4',
    extension: 'mp4',
    mimeType: FORMAT_MIME.mp4,
    adapter: 'video',
    engineCandidates: Object.freeze(['mediabunny', 'ffmpeg']),
    resourceClass: 'medium',
    runtimeRequirements: { worker: true },
    options: VIDEO_OPTIONS,
  }),
  defineOperation({
    id: 'webm-to-mp4',
    label: 'WebM to MP4',
    category: 'video',
    inputFormats: ['webm'],
    outputFormat: 'mp4',
    extension: 'mp4',
    mimeType: FORMAT_MIME.mp4,
    lossy: true,
    adapter: 'video',
    engineCandidates: MEDIABUNNY_VIDEO,
    warnings: ['LOSSY', 'LOSE_TRACKS', 'CODEC_FALLBACK'],
    resourceClass: 'heavy',
    metadataEffects: { mayLoseTracks: true },
    runtimeRequirements: { worker: true, videoEncoder: true },
    options: VIDEO_OPTIONS,
  }),
  defineOperation({
    id: 'webm-remux',
    label: 'Remux WebM',
    category: 'video',
    inputFormats: ['webm'],
    outputFormat: 'webm',
    extension: 'webm',
    mimeType: FORMAT_MIME.webm,
    adapter: 'video',
    engineCandidates: Object.freeze(['mediabunny']),
    resourceClass: 'medium',
    runtimeRequirements: { worker: true },
    options: VIDEO_OPTIONS,
  }),
  ...(['mkv', 'avi', 'mpeg', 'mpg'].flatMap((fmt) => [
    defineOperation({
      id: `${fmt}-to-mp4`,
      label: `${fmt.toUpperCase()} to MP4`,
      category: 'video',
      inputFormats: [fmt],
      outputFormat: 'mp4',
      extension: 'mp4',
      mimeType: FORMAT_MIME.mp4,
      lossy: true,
      adapter: 'video',
      engineCandidates: FFMPEG_ONLY,
      warnings: ['LOSSY', 'LOSE_TRACKS', 'FFMPEG_REQUIRED'],
      resourceClass: 'heavy',
      metadataEffects: { mayLoseTracks: true },
      runtimeRequirements: { worker: true, ffmpeg: true },
      options: VIDEO_OPTIONS,
    }),
  ])),
  ...(['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4v', 'mpeg', 'mpg'].flatMap((fmt) =>
    ['mp3', 'm4a', 'wav', 'ogg'].map((audioFmt) => {
      const isDefaultMp3 = audioFmt === 'mp3';
      const ext = audioFmt;
      return defineOperation({
        // Keep extract-audio-{fmt} as the mp3 id so presets/recipes stay stable.
        id: isDefaultMp3 ? `extract-audio-${fmt}` : `extract-audio-${fmt}-to-${audioFmt}`,
        label: `Extract ${audioFmt.toUpperCase()} from ${fmt.toUpperCase()}`,
        category: 'audio',
        inputFormats: [fmt],
        outputFormat: audioFmt,
        extension: ext,
        mimeType: FORMAT_MIME[audioFmt] ?? FORMAT_MIME.mp3,
        lossy: audioFmt !== 'wav',
        adapter: 'audio',
        engineCandidates: FFMPEG_ONLY,
        warnings: audioFmt === 'wav'
          ? ['LOSE_TRACKS', 'FFMPEG_REQUIRED']
          : ['LOSSY', 'LOSE_TRACKS', 'FFMPEG_REQUIRED'],
        resourceClass: 'heavy',
        metadataEffects: { mayLoseTracks: true, stripsMetadata: true },
        runtimeRequirements: { worker: true, ffmpeg: true },
        options: AUDIO_OPTIONS,
      });
    }),
  )),
]);

/**
 * @param {string} input
 * @param {string} output
 * @returns {ConversionOperation}
 */
function dataOp(input, output) {
  const ffmpeg = false;
  const adapter = 'data';
  const engine = NATIVE_DATA;
  return defineOperation({
    id: `${input}-to-${output}`,
    label: `${input.toUpperCase()} to ${output.toUpperCase()}`,
    category: 'data',
    inputFormats: [input],
    outputFormat: output,
    extension: output,
    mimeType: FORMAT_MIME[output] ?? `text/${output}`,
    adapter,
    engineCandidates: engine,
    resourceClass: 'light',
    runtimeRequirements: { worker: true, ffmpeg },
    options: DATA_OPTIONS,
  });
}

/** @type {ReadonlyArray<ConversionOperation>} */
const DATA_OPS = Object.freeze([
  dataOp('csv', 'json'),
  dataOp('csv', 'tsv'),
  dataOp('tsv', 'json'),
  dataOp('tsv', 'csv'),
  dataOp('json', 'csv'),
  dataOp('json', 'tsv'),
  dataOp('json', 'yaml'),
  dataOp('yaml', 'json'),
  dataOp('json', 'xml'),
  dataOp('xml', 'json'),
  dataOp('csv', 'yaml'),
  dataOp('yaml', 'csv'),
  dataOp('txt', 'json'),
  dataOp('json', 'txt'),
  dataOp('txt', 'csv'),
  dataOp('csv', 'txt'),
]);

/** @type {ReadonlyArray<ConversionOperation>} */
export const CONVERSION_OPERATIONS = Object.freeze([
  ...IMAGE_OPS,
  ...AUDIO_OPS,
  ...VIDEO_OPS,
  ...DATA_OPS,
]);

export {
  IMAGE_OPTIONS,
  WAV_OPTIONS,
  AUDIO_OPTIONS,
  VIDEO_OPTIONS,
  DATA_OPTIONS,
};
