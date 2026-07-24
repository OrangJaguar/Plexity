import zlib from 'node:zlib';
import { resolveUniqueArchivePath } from './archive-numbering.js';
import { admitPackageEntry, pickCompressionMethod } from './package-limits.js';
import {
  buildMetadataSidecar,
  buildSubtitleSidecarPlaceholder,
  buildThumbnailSidecarPlaceholder,
  sidecarArchivePath,
} from './package-sidecars.js';
import { putObject } from './storage.js';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const dt = date;
  const dosTime = ((dt.getHours() << 11) | (dt.getMinutes() << 5) | (Math.floor(dt.getSeconds() / 2)));
  const dosDate = (((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate());
  return { time: dosTime, date: dosDate };
}

/**
 * Minimal ZIP builder (store + deflate) for server-side packages.
 */
export class ZipBuilder {
  constructor() {
    this.entries = [];
    this.totalBytes = 0;
  }

  /**
   * @param {string} name archive path
   * @param {Buffer} data
   * @param {'store'|'deflate'|'auto'} [method]
   */
  addEntry(name, data, method = 'auto') {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const admission = admitPackageEntry(this.totalBytes, buf.length);
    if (!admission.ok) {
      const err = new Error(admission.message);
      err.code = admission.code;
      throw err;
    }
    const resolvedMethod = method === 'auto'
      ? pickCompressionMethod('', name)
      : method;
    let payload = buf;
    let compMethod = 0;
    if (resolvedMethod === 'deflate') {
      payload = zlib.deflateRawSync(buf);
      compMethod = 8;
    }
    this.entries.push({
      name: String(name).replace(/\\/g, '/'),
      uncompressedSize: buf.length,
      compressedSize: payload.length,
      crc: crc32(buf),
      method: compMethod,
      data: payload,
    });
    this.totalBytes = admission.totalBytes;
    return this.totalBytes;
  }

  buildBuffer() {
    const parts = [];
    const central = [];
    let offset = 0;
    const { time, date } = dosDateTime();

    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.name, 'utf8');
      const localHeader = Buffer.alloc(30 + nameBuf.length);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(entry.method, 6);
      localHeader.writeUInt16LE(time, 8);
      localHeader.writeUInt16LE(date, 10);
      localHeader.writeUInt32LE(entry.crc, 12);
      localHeader.writeUInt32LE(entry.compressedSize, 16);
      localHeader.writeUInt32LE(entry.uncompressedSize, 20);
      localHeader.writeUInt16LE(nameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28);
      nameBuf.copy(localHeader, 30);

      parts.push(localHeader, entry.data);

      const cd = Buffer.alloc(46 + nameBuf.length);
      cd.writeUInt32LE(0x02014b50, 0);
      cd.writeUInt16LE(20, 4);
      cd.writeUInt16LE(20, 6);
      cd.writeUInt16LE(entry.method, 8);
      cd.writeUInt16LE(time, 10);
      cd.writeUInt16LE(date, 12);
      cd.writeUInt32LE(entry.crc, 16);
      cd.writeUInt32LE(entry.compressedSize, 20);
      cd.writeUInt32LE(entry.uncompressedSize, 24);
      cd.writeUInt16LE(nameBuf.length, 28);
      cd.writeUInt16LE(0, 30);
      cd.writeUInt16LE(0, 32);
      cd.writeUInt16LE(0, 34);
      cd.writeUInt16LE(0, 36);
      cd.writeUInt32LE(0, 38);
      cd.writeUInt32LE(offset, 42);
      nameBuf.copy(cd, 46);
      central.push(cd);

      offset += localHeader.length + entry.data.length;
    }

    const centralBuf = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(this.entries.length, 8);
    end.writeUInt16LE(this.entries.length, 10);
    end.writeUInt32LE(centralBuf.length, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([...parts, centralBuf, end]);
  }
}

/**
 * Build a package ZIP from ready job artifacts.
 * @param {object} opts
 * @param {Array<{ job: object, artifact: object, buffer: Buffer, fileName: string }>} opts.entries
 * @param {string} [opts.numberingPolicy]
 * @param {boolean} [opts.includeThumbnails]
 * @param {boolean} [opts.includeSubtitles]
 * @param {boolean} [opts.includeMetadata]
 */
export function buildPackageZip({
  entries,
  numberingPolicy = 'index-prefix',
  includeThumbnails = false,
  includeSubtitles = false,
  includeMetadata = false,
}) {
  const zip = new ZipBuilder();
  const used = new Map();
  const packageEntries = [];

  for (const entry of entries) {
    const index = entry.job.playlist_index ?? (packageEntries.length + 1);
    const archivePath = resolveUniqueArchivePath(
      index,
      entry.fileName || `${entry.job.job_id}.bin`,
      numberingPolicy,
      used,
    );

    zip.addEntry(archivePath, entry.buffer);
    packageEntries.push({
      jobId: entry.job.job_id,
      artifactId: entry.artifact.artifact_id,
      archivePath,
    });

    if (includeMetadata) {
      const metaPath = sidecarArchivePath(archivePath, 'metadata');
      zip.addEntry(metaPath, Buffer.from(buildMetadataSidecar(entry.job, entry.artifact), 'utf8'), 'deflate');
    }
    if (includeSubtitles) {
      const subPath = sidecarArchivePath(archivePath, 'subtitle');
      zip.addEntry(subPath, Buffer.from(buildSubtitleSidecarPlaceholder(entry.job), 'utf8'), 'deflate');
    }
    if (includeThumbnails) {
      const thumbPath = sidecarArchivePath(archivePath, 'thumbnail');
      zip.addEntry(thumbPath, Buffer.from(buildThumbnailSidecarPlaceholder(entry.job), 'utf8'), 'deflate');
    }
  }

  return {
    buffer: zip.buildBuffer(),
    sizeBytes: zip.totalBytes,
    entries: packageEntries,
  };
}

export async function buildAndUploadPackage(opts) {
  const { buffer, sizeBytes, entries } = buildPackageZip(opts);
  const objectKey = opts.objectKey;
  await putObject(objectKey, buffer, 'application/zip');
  return { objectKey, sizeBytes, entries, buffer };
}
