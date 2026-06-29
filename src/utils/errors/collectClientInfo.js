export function collectClientInfo() {
  if (typeof window === 'undefined') return {};
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}
