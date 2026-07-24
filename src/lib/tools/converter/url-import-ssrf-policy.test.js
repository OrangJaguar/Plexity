import { describe, expect, it } from 'vitest';
import { evaluateUrlSsrfPolicy, SSRF_POLICY } from '@/lib/tools/converter/url-import-ssrf-policy.js';

describe('url-import-ssrf-policy', () => {
  it('allows public https hosts', () => {
    expect(evaluateUrlSsrfPolicy('https://cdn.example.com/a.mp4').ok).toBe(true);
  });

  it('blocks private ips, localhost, credentials, and http', () => {
    expect(evaluateUrlSsrfPolicy('https://127.0.0.1/x').code).toBe('SSRF_BLOCKED');
    expect(evaluateUrlSsrfPolicy('https://10.0.0.5/x').code).toBe('SSRF_BLOCKED');
    expect(evaluateUrlSsrfPolicy('https://169.254.169.254/latest').code).toBe('SSRF_BLOCKED');
    expect(evaluateUrlSsrfPolicy('https://localhost/x').code).toBe('SSRF_BLOCKED');
    expect(evaluateUrlSsrfPolicy('http://cdn.example.com/x').code).toBe('URL_DISALLOWED');
    expect(evaluateUrlSsrfPolicy('https://user:pass@cdn.example.com/x').code).toBe('URL_DISALLOWED');
  });

  it('documents redirect and auth-stripping policy constants', () => {
    expect(SSRF_POLICY.maxRedirects).toBe(3);
    expect(SSRF_POLICY.stripAuthOnOriginChange).toBe(true);
  });
});
