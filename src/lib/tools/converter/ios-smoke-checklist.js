/**
 * Physical iOS 17+ smoke matrix for Converter.
 * Playwright WebKit is not Mobile Safari — run these manually on device/PWA.
 *
 * @type {ReadonlyArray<{ id: string, title: string, steps: string }>}
 */
export const CONVERTER_IOS_SMOKE_CHECKLIST = Object.freeze([
  Object.freeze({
    id: 'files-picker',
    title: 'Files / iCloud picker',
    steps: 'Open /convert in Safari iOS 17+, tap Choose files, pick PNG/WAV/CSV from Files and iCloud Drive.',
  }),
  Object.freeze({
    id: 'standalone-pwa',
    title: 'Standalone PWA',
    steps: 'Add to Home Screen, open Converter, convert one image and download the result.',
  }),
  Object.freeze({
    id: 'limits',
    title: 'Memory / size limits',
    steps: 'Attempt an oversized image/video and confirm actionable FILE_TOO_LARGE or MEMORY_BUDGET_EXCEEDED messaging.',
  }),
  Object.freeze({
    id: 'cancel',
    title: 'Cancel active job',
    steps: 'Start a conversion and cancel mid-flight; confirm status becomes Cancelled and UI stays responsive.',
  }),
  Object.freeze({
    id: 'repeat',
    title: 'Repeated conversions',
    steps: 'Convert several files back-to-back, reset, and convert again without leaks or stuck progress.',
  }),
  Object.freeze({
    id: 'download-share',
    title: 'Download / share',
    steps: 'Download a completed file; if Share Sheet supports files, share one WAV/PNG successfully.',
  }),
  Object.freeze({
    id: 'background',
    title: 'Background interruption',
    steps: 'Start a conversion, background Safari briefly, return; confirm interruption handling without a hung queue.',
  }),
  Object.freeze({
    id: 'private-storage',
    title: 'Private mode storage fallback',
    steps: 'In Private Browsing, convert a small CSV→JSON and download; confirm memory fallback works without OPFS.',
  }),
  Object.freeze({
    id: 'folder-fallback',
    title: 'Folder import fallback',
    steps: 'Attempt a folder/multi-file import; confirm iOS Safari falls back to per-file picking without a stuck UI.',
  }),
  Object.freeze({
    id: 'clipboard-fallback',
    title: 'Clipboard import fallback',
    steps: 'Copy an image and try Paste-to-import; if clipboard read is unsupported, confirm CLIPBOARD_UNAVAILABLE messaging and a manual file-picker fallback.',
  }),
  Object.freeze({
    id: 'ffmpeg-load-cancel-reload',
    title: 'FFmpeg load / cancel / reload',
    steps: 'Start an FFmpeg-only conversion (e.g. WAV to MP3), cancel mid-load, then retry; confirm the runtime reloads cleanly without a hung queue.',
  }),
  Object.freeze({
    id: 'zip-thresholds',
    title: 'ZIP package thresholds',
    steps: 'Package outputs near the file-count and aggregate-size limits; confirm actionable TOO_MANY_FILES / AGGREGATE_TOO_LARGE messaging instead of a silent failure.',
  }),
  Object.freeze({
    id: 'format-matrix',
    title: 'Format matrix categories',
    steps: 'Spot-check one conversion per category (image, audio, video, data) end-to-end, including at least one FFmpeg-only path, to catch category-specific regressions.',
  }),
  Object.freeze({
    id: 'background-completion-unsupported',
    title: 'Background completion unsupported',
    steps: 'Start a long conversion, background Safari for longer than iOS allows background execution, and confirm the UI clearly shows the job as interrupted/incomplete rather than silently "still running".',
  }),
  Object.freeze({
    id: 'v2-target-size',
    title: 'V2 under-size / target-size',
    steps: 'Import a short video or large image, apply Under size limit, convert, and confirm approximate messaging (never exact bytes) plus admission rejection on oversized mobile cases.',
  }),
  Object.freeze({
    id: 'v2-merge-split-admission',
    title: 'V2 merge/split admission',
    steps: 'Select incompatible merge sources and confirm MERGE_INCOMPATIBLE; attempt a high fan-out split and confirm SPLIT_LIMIT_EXCEEDED rather than a hung queue.',
  }),
  Object.freeze({
    id: 'v2-structure-zip',
    title: 'V2 folder-structure ZIP',
    steps: 'Import a small folder tree, enable preserve structure, package ZIP, and confirm relative paths survive without exceeding mobile package limits.',
  }),
  Object.freeze({
    id: 'v2-advanced-drawer',
    title: 'V2 advanced drawer',
    steps: 'Open Advanced on a job, change bitrate/metadata policy, acknowledge GPS/strip warnings when shown, convert, and confirm focus returns to the job card.',
  }),
  Object.freeze({
    id: 'v2-background-cancel',
    title: 'V2 multi-pass background cancel',
    steps: 'Start a target-size or merge job, background Safari, return; confirm parent/child work cancels or interrupts cleanly with unsupported-background messaging.',
  }),
]);
