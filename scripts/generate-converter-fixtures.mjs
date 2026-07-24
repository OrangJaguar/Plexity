#!/usr/bin/env node
/**
 * Generates tiny converter test fixtures under src/lib/tools/converter/__fixtures__/
 * MP4: skipped — use mocked MediaBunny in unit tests; binary minimal MP4 is non-trivial.
 */
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../src/lib/tools/converter/__fixtures__');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** 8x8 RGBA PNG with partial transparency (Chromium-decodable). */
function buildTransparentPng() {
  const w = 8;
  const h = 8;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x += 1) {
      const i = y * (w * 4 + 1) + 1 + x * 4;
      raw[i] = 255;
      raw[i + 1] = 0;
      raw[i + 2] = 0;
      raw[i + 3] = x < 4 ? 255 : 128;
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const TINY_PNG = buildTransparentPng();

/** Minimal valid JPEG (1x1) */
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
  'base64',
);

/** Minimal lossy WebP (RIFF WEBP VP8) — 1x1 */
const TINY_WEBP = Buffer.from(
  'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/vuUAAA=',
  'base64',
);

/** Minimal valid 2x2 24-bit uncompressed BMP (BITMAPINFOHEADER). */
function buildTinyBmp() {
  const width = 2;
  const height = 2;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const dataOffset = 14 + 40;
  const fileSize = dataOffset + pixelDataSize;
  const buffer = Buffer.alloc(fileSize);

  buffer.write('BM', 0, 'ascii');
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(0, 6);
  buffer.writeUInt32LE(dataOffset, 10);

  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelDataSize, 34);

  const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]];
  for (let y = 0; y < height; y += 1) {
    const rowStart = dataOffset + y * rowSize;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = colors[(y * width + x) % colors.length];
      const p = rowStart + x * 3;
      buffer[p] = b;
      buffer[p + 1] = g;
      buffer[p + 2] = r;
    }
  }
  return buffer;
}

/**
 * Minimal GIF87a/89a LZW encoder — packs palette-index pixels into variable
 * width codes per the GIF spec (clear code, incremental dictionary, end
 * code), grouped into <=255-byte sub-blocks. Sufficient for the tiny
 * checkerboard fixtures generated below; not a general-purpose encoder.
 */
class GifBitWriter {
  constructor() {
    this.bytes = [];
    this.bitBuffer = 0;
    this.bitCount = 0;
  }

  writeCode(code, codeSize) {
    this.bitBuffer |= code << this.bitCount;
    this.bitCount += codeSize;
    while (this.bitCount >= 8) {
      this.bytes.push(this.bitBuffer & 0xff);
      this.bitBuffer >>= 8;
      this.bitCount -= 8;
    }
  }

  flush() {
    if (this.bitCount > 0) {
      this.bytes.push(this.bitBuffer & 0xff);
      this.bitBuffer = 0;
      this.bitCount = 0;
    }
  }
}

/**
 * @param {number[]} indices palette-index pixels, row-major
 * @param {number} minCodeSize
 * @returns {Buffer} LZW-compressed data (no sub-block framing yet)
 */
function lzwEncodeGif(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const writer = new GifBitWriter();

  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  /** @type {Map<string, number>} */
  let dict = new Map();

  writer.writeCode(clearCode, codeSize);

  let curCode = indices[0];
  let curKey = String(indices[0]);

  for (let i = 1; i < indices.length; i += 1) {
    const pixel = indices[i];
    const candidateKey = `${curKey}.${pixel}`;
    if (dict.has(candidateKey)) {
      curCode = dict.get(candidateKey);
      curKey = candidateKey;
      continue;
    }

    writer.writeCode(curCode, codeSize);

    if (nextCode < 4096) {
      dict.set(candidateKey, nextCode);
      // Bump width using the code value just assigned (pre-increment) so the
      // new width only applies starting with the *next* transmitted code —
      // matching a decoder, which can't grow its table until it has seen
      // one more symbol than the encoder needed to assign this code.
      if (nextCode === 1 << codeSize && codeSize < 12) {
        codeSize += 1;
      }
      nextCode += 1;
    } else {
      writer.writeCode(clearCode, codeSize);
      dict = new Map();
      nextCode = endCode + 1;
      codeSize = minCodeSize + 1;
    }

    curCode = pixel;
    curKey = String(pixel);
  }

  writer.writeCode(curCode, codeSize);
  writer.writeCode(endCode, codeSize);
  writer.flush();
  return Buffer.from(writer.bytes);
}

/**
 * @param {Buffer} data
 * @returns {Buffer} sub-blocks of <=255 bytes, terminated by 0x00
 */
function gifSubBlocks(data) {
  const chunks = [];
  for (let offset = 0; offset < data.length; offset += 255) {
    const chunk = data.subarray(offset, Math.min(offset + 255, data.length));
    chunks.push(Buffer.from([chunk.length]), chunk);
  }
  chunks.push(Buffer.from([0x00]));
  return Buffer.concat(chunks);
}

const GIF_PALETTE = [[255, 0, 0], [0, 200, 0], [0, 0, 255], [255, 255, 0]];
const GIF_MIN_CODE_SIZE = 2; // 4-color global table

function gifLogicalScreenAndPalette(width, height) {
  const lsd = Buffer.alloc(7);
  lsd.writeUInt16LE(width, 0);
  lsd.writeUInt16LE(height, 2);
  lsd[4] = 0x80 | (GIF_MIN_CODE_SIZE - 1 << 4) | (GIF_MIN_CODE_SIZE - 1);
  lsd[5] = 0;
  lsd[6] = 0;
  const palette = Buffer.concat(GIF_PALETTE.map(([r, g, b]) => Buffer.from([r, g, b])));
  return Buffer.concat([lsd, palette]);
}

function gifGraphicControlExtension(delayCentiseconds) {
  const buf = Buffer.alloc(8);
  buf[0] = 0x21;
  buf[1] = 0xf9;
  buf[2] = 0x04;
  buf[3] = 0x04; // disposal method: do not dispose, no transparency
  buf.writeUInt16LE(delayCentiseconds, 4);
  buf[6] = 0x00;
  buf[7] = 0x00;
  return buf;
}

function gifImageDescriptorAndData(width, height, indices) {
  const descriptor = Buffer.alloc(10);
  descriptor[0] = 0x2c;
  descriptor.writeUInt16LE(0, 1); // left
  descriptor.writeUInt16LE(0, 3); // top
  descriptor.writeUInt16LE(width, 5);
  descriptor.writeUInt16LE(height, 7);
  descriptor[9] = 0x00; // no local color table, no interlace

  const compressed = lzwEncodeGif(indices, GIF_MIN_CODE_SIZE);
  return Buffer.concat([
    descriptor,
    Buffer.from([GIF_MIN_CODE_SIZE]),
    gifSubBlocks(compressed),
  ]);
}

function gifNetscapeLoopExtension() {
  return Buffer.concat([
    Buffer.from([0x21, 0xff, 0x0b]),
    Buffer.from('NETSCAPE2.0', 'ascii'),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]),
  ]);
}

/** 4x4 single-frame (non-animated) GIF. */
function buildStaticGif() {
  const width = 4;
  const height = 4;
  const indices = Array.from({ length: width * height }, (_, i) => i % GIF_PALETTE.length);

  return Buffer.concat([
    Buffer.from('GIF89a', 'ascii'),
    gifLogicalScreenAndPalette(width, height),
    gifImageDescriptorAndData(width, height, indices),
    Buffer.from([0x3b]),
  ]);
}

/** 4x4 two-frame looping animated GIF (checkerboard swap). */
function buildAnimatedGif() {
  const width = 4;
  const height = 4;
  const frameA = Array.from({ length: width * height }, (_, i) => i % 2);
  const frameB = Array.from({ length: width * height }, (_, i) => (i + 1) % 2);

  return Buffer.concat([
    Buffer.from('GIF89a', 'ascii'),
    gifLogicalScreenAndPalette(width, height),
    gifNetscapeLoopExtension(),
    gifGraphicControlExtension(20),
    gifImageDescriptorAndData(width, height, frameA),
    gifGraphicControlExtension(20),
    gifImageDescriptorAndData(width, height, frameB),
    Buffer.from([0x3b]),
  ]);
}

function writeWavPcm16() {
  const sampleRate = 8000;
  const channels = 1;
  const numSamples = 800;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i += 1) {
    const s = Math.sin((i / sampleRate) * Math.PI * 2 * 440) * 0.25;
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buffer;
}

/** First 16 bytes of a valid PNG — signature plus a truncated IHDR chunk. */
function buildTruncatedPng() {
  return TINY_PNG.subarray(0, 16);
}

const FIXTURES = [
  { name: 'tiny.png', data: TINY_PNG },
  { name: 'tiny.jpg', data: TINY_JPEG },
  { name: 'tiny.webp', data: TINY_WEBP },
  { name: 'tiny.bmp', data: buildTinyBmp() },
  { name: 'tiny.gif', data: buildStaticGif() },
  { name: 'tiny-animated.gif', data: buildAnimatedGif() },
  { name: 'tiny.wav', data: writeWavPcm16() },
  { name: 'sample.csv', data: Buffer.from('name,value\nalpha,1\nbeta,2\n', 'utf8') },
  { name: 'sample.tsv', data: Buffer.from('name\tvalue\nalpha\t1\nbeta\t2\n', 'utf8') },
  { name: 'sample.json', data: Buffer.from('[{"name":"alpha","value":1},{"name":"beta","value":2}]', 'utf8') },
  { name: 'sample.yaml', data: Buffer.from('name: test\nitems:\n  - alpha\n  - beta\n', 'utf8') },
  { name: 'sample.xml', data: Buffer.from('<root><item name="alpha">1</item><item name="beta">2</item></root>\n', 'utf8') },
  { name: 'sample.txt', data: Buffer.from('alpha,1\nbeta,2\n', 'utf8') },
  { name: 'corrupt.png', data: buildTruncatedPng() },
];

async function main() {
  await mkdir(FIXTURES_DIR, { recursive: true });
  for (const fixture of FIXTURES) {
    await writeFile(path.join(FIXTURES_DIR, fixture.name), fixture.data);
  }
  await writeFile(
    path.join(FIXTURES_DIR, 'README.txt'),
    [
      'Fixtures generated by scripts/generate-converter-fixtures.mjs',
      'MP4/WebM video fixtures omitted — video adapter tests mock MediaBunny.',
      'tiny-animated.gif has two frames + a NETSCAPE2.0 loop extension; tiny.gif is single-frame (static).',
      'corrupt.png is the first 16 bytes of tiny.png — a valid signature with a truncated IHDR chunk, for',
      'exercising INSPECTION_FAILED / truncated-header handling.',
      '',
      'Oversized-name testing note: this directory intentionally does not ship a fixture with an oversized',
      'filename (e.g. 200+ chars). Construct that case at test time by taking any small fixture above and',
      'renaming/wrapping it with a long name via converter-filenames.js (sanitizeFileName /',
      'resolveNameCollision) rather than committing an oversized-named file to the repo.',
    ].join('\n') + '\n',
  );
  console.log(`Wrote ${FIXTURES.length} fixtures to ${FIXTURES_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
