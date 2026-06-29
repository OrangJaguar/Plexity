export function getEnvironment() {
  if (typeof window === 'undefined') return 'development';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'development';
  if (host.includes('staging') || host.includes('preview')) return 'staging';
  return 'production';
}
