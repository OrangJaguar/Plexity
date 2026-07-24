/** Shared MIME map for converter formats. */

/** @type {Readonly<Record<string, string>>} */
export const FORMAT_MIME = Object.freeze({
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  bmp: 'image/bmp',
  gif: 'image/gif',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  xml: 'application/xml',
  txt: 'text/plain',
});

/** @type {ReadonlyArray<string>} */
export const RECOGNIZED_EXTENSIONS = Object.freeze([
  'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif',
  'wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'opus',
  'mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'mpeg', 'mpg',
  'csv', 'tsv', 'json', 'yaml', 'yml', 'xml', 'txt',
]);

/** @type {ReadonlyArray<string>} */
export const RECOGNIZED_MIMES = Object.freeze([
  ...new Set(Object.values(FORMAT_MIME)),
]);
