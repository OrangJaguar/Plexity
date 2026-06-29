import { useEffect } from 'react';

const DEFAULT_DESCRIPTION = 'Veridian — study smarter with spaced repetition and AI-generated study materials.';
const SITE_NAME = 'Veridian';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  noindex = false,
} = {}) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = pageTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');

    if (canonicalPath && typeof window !== 'undefined') {
      const href = `${window.location.origin}${canonicalPath}`;
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
      upsertMeta('property', 'og:url', href);
    }

    return () => {
      document.title = SITE_NAME;
    };
  }, [title, description, canonicalPath, noindex]);
}
