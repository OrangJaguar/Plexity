/**
 * Sidecar file helpers for Plan 6 server packages.
 * Metadata JSON is redacted — no raw source URLs.
 */

export function buildMetadataSidecar(job, artifact) {
  return JSON.stringify({
    jobId: job.job_id,
    provider: job.provider,
    redactedLabel: job.redacted_label,
    operationId: job.operation_id,
    playlistIndex: job.playlist_index ?? null,
    artifactKind: artifact?.kind ?? 'primary',
    contentType: artifact?.content_type ?? 'application/octet-stream',
    byteSize: Number(artifact?.byte_size ?? 0),
    sha256: artifact?.sha256 ? String(artifact.sha256).slice(0, 16) + '…' : null,
    completedAt: job.completed_at ? new Date(job.completed_at).toISOString() : null,
  }, null, 2);
}

export function buildSubtitleSidecarPlaceholder(job) {
  return `# Subtitles not available for ${job.job_id}\n# Provider: ${job.provider}\n`;
}

export function buildThumbnailSidecarPlaceholder(job) {
  return JSON.stringify({
    jobId: job.job_id,
    note: 'thumbnail_not_extracted',
    redactedLabel: job.redacted_label,
  });
}

export function sidecarArchivePath(basePath, kind) {
  const stem = basePath.replace(/\.[^./\\]+$/, '');
  if (kind === 'metadata') return `${stem}.metadata.json`;
  if (kind === 'subtitle') return `${stem}.subtitles.txt`;
  if (kind === 'thumbnail') return `${stem}.thumbnail.json`;
  return `${stem}.${kind}`;
}
