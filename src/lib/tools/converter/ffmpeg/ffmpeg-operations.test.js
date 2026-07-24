import { describe, expect, it } from 'vitest';
import {
  buildFfmpegArgv,
  concatMedia,
  convertAudioAdvanced,
  convertAudioToMp3,
  convertVideoAdvanced,
  FFMPEG_OPERATION_BUILDERS,
  isAllowlistedFfmpegArgv,
  sanitizeVirtualInput,
  sanitizeVirtualName,
  sanitizeVirtualOutput,
  splitMediaSegment,
} from '@/lib/tools/converter/ffmpeg/ffmpeg-operations.js';

describe('ffmpeg-operations', () => {
  it('uses fixed virtual input/output names', () => {
    const argv = convertAudioToMp3({ inputExt: '../../etc/passwd', outputExt: 'mp3' });
    expect(argv).toContain('input.etcpasswd');
    expect(argv).toContain('output.mp3');
    expect(argv.some((token) => token.includes('..'))).toBe(false);
  });

  it('only exposes allowlisted builders', () => {
    expect(Object.keys(FFMPEG_OPERATION_BUILDERS).sort()).toEqual([
      'concatMedia',
      'convertAudioAdvanced',
      'convertAudioGeneric',
      'convertAudioToMp3',
      'convertImageViaFfmpeg',
      'convertVideoAdvanced',
      'convertVideoToMp4',
      'extractAudioFromVideo',
      'splitMediaSegment',
    ]);
    expect(() => buildFfmpegArgv('shellInjection', {})).toThrow(/Disallowed/);
  });

  it('validates argv tokens', () => {
    expect(isAllowlistedFfmpegArgv(convertAudioToMp3({ inputExt: 'wav', outputExt: 'mp3' }))).toBe(true);
    expect(isAllowlistedFfmpegArgv(['-i', 'input.wav; rm -rf /'])).toBe(false);
    expect(isAllowlistedFfmpegArgv(convertVideoAdvanced({
      inputExt: 'mp4',
      outputExt: 'webm',
      videoBitrateKbps: 2500,
      audioBitrateKbps: 128,
      videoCodec: 'libvpx-vp9',
      audioCodec: 'libopus',
      width: 1280,
      height: 720,
      fps: 30,
    }))).toBe(true);
    expect(isAllowlistedFfmpegArgv(concatMedia({
      inputCount: 3,
      inputExt: 'mp4',
      outputExt: 'mp4',
      mode: 'filter',
    }))).toBe(true);
    expect(isAllowlistedFfmpegArgv(splitMediaSegment({
      inputExt: 'mp4',
      outputExt: 'mp4',
      startSec: 10,
      durationSec: 5,
    }))).toBe(true);
  });

  it('sanitizes virtual names', () => {
    expect(sanitizeVirtualName('mp3')).toBe('input.mp3');
    expect(sanitizeVirtualName('weird/name')).toBe('input.weirdname');
    expect(sanitizeVirtualOutput('webm')).toBe('output.webm');
    expect(sanitizeVirtualInput(2, 'mp4')).toBe('input2.mp4');
  });

  it('restricts advanced video codecs to the allowlist', () => {
    const argv = convertVideoAdvanced({
      inputExt: 'mp4',
      outputExt: 'mp4',
      videoBitrateKbps: 2500,
      audioBitrateKbps: 128,
      videoCodec: 'evil-codec',
      audioCodec: 'evil-audio',
    });
    expect(argv).toContain('libx264');
    expect(argv).toContain('aac');
    expect(argv).not.toContain('evil-codec');
  });

  it('builds concat demuxer argv with a virtual list file', () => {
    const argv = concatMedia({
      inputCount: 4,
      inputExt: 'mp4',
      outputExt: 'mp4',
      mode: 'demuxer',
    });
    expect(argv).toContain('concat-list.mp4.txt');
    expect(argv).toContain('-c');
    expect(argv).toContain('copy');
  });

  it('builds advanced audio argv with sample rate and channels', () => {
    const argv = convertAudioAdvanced({
      inputExt: 'wav',
      outputExt: 'opus',
      bitrateKbps: 192,
      sampleRate: 48000,
      channels: 1,
    });
    expect(argv).toContain('-ar');
    expect(argv).toContain('48000');
    expect(argv).toContain('-ac');
    expect(argv).toContain('1');
  });
});
