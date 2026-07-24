/**
 * Export presets for Video Plan 3.
 */

export const VIDEO_EXPORT_PRESETS = Object.freeze([
  {
    id: 'class-1080p',
    label: 'Class 1080p',
    aspectId: '16:9',
    width: 1920,
    height: 1080,
    format: /** @type {'mp4'} */ ('mp4'),
    audioOnly: false,
    videoBitrateKbps: 4000,
  },
  {
    id: 'phone-9-16',
    label: 'Phone 9:16',
    aspectId: '9:16',
    width: 1080,
    height: 1920,
    format: /** @type {'mp4'} */ ('mp4'),
    audioOnly: false,
    videoBitrateKbps: 3500,
  },
  {
    id: 'audio-only',
    label: 'Audio-only',
    aspectId: null,
    width: null,
    height: null,
    format: /** @type {'mp3'} */ ('mp3'),
    audioOnly: true,
    videoBitrateKbps: 0,
  },
]);

/**
 * @param {string} id
 */
export function getExportPreset(id) {
  return VIDEO_EXPORT_PRESETS.find((p) => p.id === id) || VIDEO_EXPORT_PRESETS[0];
}

/**
 * Apply canvas size from preset onto a project clone (does not mutate if audio-only).
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} presetId
 */
export function applyPresetToProject(project, presetId) {
  const preset = getExportPreset(presetId);
  if (preset.audioOnly || !preset.width || !preset.height) return project;
  return {
    ...project,
    aspectId: preset.aspectId || project.aspectId,
    width: preset.width,
    height: preset.height,
  };
}
