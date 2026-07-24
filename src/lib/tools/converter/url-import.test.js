import { describe, expect, it } from 'vitest';
import {
  parseUrlListCsv,
  parseUrlListText,
  normalizeUrlCandidate,
  URL_IMPORT_LIMITS,
} from '@/lib/tools/converter/url-import-parse.js';
import { classifyImportUrl, isAcceptedProvider } from '@/lib/tools/converter/url-import-classify.js';
import { redactUrlForDisplay, redactedSourceLabel } from '@/lib/tools/converter/url-import-redact.js';
import {
  canConfirmReview,
  createUrlImportReviewSession,
  setReviewAcknowledgment,
  acceptedUrlsForCreate,
} from '@/lib/tools/converter/url-import-review.js';
import {
  applyRemoteStateCas,
  canTransitionRemoteState,
  REMOTE_ERROR_CODES,
  validateRemotePlanSnapshot,
} from '@/lib/tools/converter/remote-job-schema.js';
import { sanitizeTelemetryProps } from '@/lib/tools/converter/converter-privacy.js';

describe('url-import-classify', () => {
  it('accepts direct https media urls', () => {
    const c = classifyImportUrl('https://cdn.example.com/path/video.mp4');
    expect(c.provider).toBe('direct-https');
    expect(isAcceptedProvider(c.provider)).toBe(true);
  });

  it('classifies single youtube watch urls', () => {
    const c = classifyImportUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(c.provider).toBe('youtube-single');
    expect(c.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });

  it('defers playlists and channels', () => {
    expect(classifyImportUrl('https://www.youtube.com/playlist?list=PLxxxx').provider).toBe('playlist-deferred');
    expect(classifyImportUrl('https://www.youtube.com/@somechannel').provider).toBe('channel-deferred');
  });

  it('rejects credentials, http, and ip literals', () => {
    expect(classifyImportUrl('http://example.com/a.mp4').reason).toBe('URL_DISALLOWED');
    expect(classifyImportUrl('https://user:pass@example.com/a.mp4').reason).toBe('URL_DISALLOWED');
    expect(classifyImportUrl('https://127.0.0.1/a.mp4').reason).toBe('SSRF_BLOCKED');
  });
});

describe('url-import-parse', () => {
  it('parses paste lists with dedupe and caps', () => {
    const text = [
      'https://cdn.example.com/a.mp4',
      'https://cdn.example.com/a.mp4',
      'https://www.youtube.com/watch?v=abcdefghijk',
      'not a url',
      'https://www.youtube.com/playlist?list=PLabc',
    ].join('\n');
    const result = parseUrlListText(text);
    expect(result.accepted).toHaveLength(2);
    expect(result.duplicates).toHaveLength(1);
    expect(result.rejected.some((e) => e.disposition === 'rejected')).toBe(true);
    expect(result.deferred).toHaveLength(1);
  });

  it('parses csv with url header', () => {
    const csv = 'url,note\nhttps://cdn.example.com/b.mp4,ok\n';
    const result = parseUrlListCsv(csv);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].normalizedUrl).toContain('cdn.example.com');
  });

  it('normalizes bare hosts to https', () => {
    expect(normalizeUrlCandidate('cdn.example.com/x.mp4')).toMatch(/^https:\/\//);
  });

  it('respects max url submission constant', () => {
    expect(URL_IMPORT_LIMITS.maxUrlsPerSubmission).toBe(10);
  });
});

describe('url-import-redact', () => {
  it('never returns credentials or signed query values', () => {
    const display = redactUrlForDisplay('https://user:secret@cdn.example.com/a.mp4?token=abc&x=1');
    expect(display).not.toContain('secret');
    expect(display).not.toContain('token=abc');
    expect(display).toContain('***@');
    expect(redactedSourceLabel('https://cdn.example.com/dir/file.mp4')).toContain('cdn.example.com');
  });
});

describe('url-import-review', () => {
  it('requires source rights and youtube ack when needed', () => {
    const parsed = parseUrlListText('https://www.youtube.com/watch?v=abcdefghijk\n');
    let session = createUrlImportReviewSession(parsed);
    expect(canConfirmReview(session).ok).toBe(false);
    session = setReviewAcknowledgment(session, 'sourceRights', true);
    expect(canConfirmReview(session).reason).toBe('YOUTUBE_ACK_REQUIRED');
    session = setReviewAcknowledgment(session, 'youtubeTermsRisk', true);
    expect(canConfirmReview(session).ok).toBe(true);
    expect(acceptedUrlsForCreate(session)).toHaveLength(1);
  });
});

describe('remote-job-schema', () => {
  it('validates allowlisted plans and rejects argv escape hatches', () => {
    expect(validateRemotePlanSnapshot({ operationId: 'video-to-mp4' }).ok).toBe(true);
    expect(validateRemotePlanSnapshot({ operationId: 'video-to-mp4', argv: ['-i'] }).ok).toBe(false);
    expect(validateRemotePlanSnapshot({ operationId: 'not-real' }).code).toBe(REMOTE_ERROR_CODES.PLAN_INVALID);
  });

  it('enforces CAS transitions and stale attempts', () => {
    expect(canTransitionRemoteState('queued', 'fetching')).toBe(true);
    expect(canTransitionRemoteState('ready', 'queued')).toBe(false);
    const job = { state: 'queued', stateVersion: 1, attemptId: 'att-1' };
    const ok = applyRemoteStateCas(job, {
      expectedVersion: 1,
      expectedAttemptId: 'att-1',
      nextState: 'fetching',
    });
    expect(ok.ok).toBe(true);
    expect(ok.job.state).toBe('fetching');
    const stale = applyRemoteStateCas(job, {
      expectedVersion: 99,
      expectedAttemptId: 'att-1',
      nextState: 'fetching',
    });
    expect(stale.ok).toBe(false);
  });
});

describe('remote telemetry privacy', () => {
  it('allows provider enums and booleans but strips urls and filenames', () => {
    const safe = sanitizeTelemetryProps({
      outcome: 'success',
      provider: 'direct-https',
      remoteSource: true,
      url: 'https://evil.example/secret',
      filename: 'secret.mp4',
    });
    expect(safe.outcome).toBe('success');
    expect(safe.provider).toBe('direct-https');
    expect(safe.remoteSource).toBe(true);
    expect(safe.url).toBeUndefined();
    expect(safe.filename).toBeUndefined();
  });
});
