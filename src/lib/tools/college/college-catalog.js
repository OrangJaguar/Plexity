import catalogData from '@/lib/tools/college/college-catalog.json';

/** @typedef {import('./college-catalog.json')[number]} CatalogCollege */

export const COLLEGE_CATALOG = catalogData;

const byId = new Map(COLLEGE_CATALOG.map((c) => [c.id, c]));

export function getCatalogCollege(id) {
  return byId.get(id) || null;
}

export function formatAcceptanceRate(rate) {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

export function formatPercent(rate) {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

export function formatGradRate(rate) {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

export function formatRetentionRate(rate) {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

export function formatMoney(amount, suffix = '') {
  if (amount == null) return '—';
  return `$${amount.toLocaleString()}${suffix}`;
}

export function formatNetPrice(netPrice) {
  if (netPrice == null) return '—';
  return `$${netPrice.toLocaleString()}`;
}

export function formatSatRange(college) {
  if (!college?.satMid50) return '—';
  return `${college.satMid50[0]}–${college.satMid50[1]}`;
}

export function formatActRange(college) {
  if (!college?.actMid50) return '—';
  return `${college.actMid50[0]}–${college.actMid50[1]}`;
}

export function formatTuition(tuition) {
  if (!tuition) return '—';
  return `$${tuition.toLocaleString()}`;
}

/** @param {CatalogCollege} college */
export function getStickerTuition(college) {
  if (!college) return null;
  return college.tuition ?? college.tuitionOutState ?? college.tuitionInState ?? null;
}

export function formatEnrollment(n) {
  if (!n) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function formatSetting(setting) {
  const map = { urban: 'Urban', suburban: 'Suburban', rural: 'Rural' };
  return map[setting] || setting;
}

/**
 * @param {CatalogCollege} college
 * @returns {{ label: string, value: string }[]}
 */
export function getCatalogCardStats(college) {
  const stats = [
    { label: 'Admit', value: formatAcceptanceRate(college.acceptanceRate) },
    { label: 'Net price', value: formatNetPrice(college.netPrice) },
    { label: 'Grad rate', value: formatGradRate(college.gradRate4yr) },
  ];
  if (college.setting) {
    stats.push({ label: 'Setting', value: formatSetting(college.setting) });
  } else if (college.enrollment) {
    stats.push({ label: 'Size', value: `${formatEnrollment(college.enrollment)} undergrad` });
  }
  return stats.filter((s) => s.value !== '—');
}

/**
 * @param {object} filters
 */
export function searchCatalog(filters = {}) {
  const q = (filters.query || '').trim().toLowerCase();
  let results = COLLEGE_CATALOG;

  if (q) {
    results = results.filter((c) =>
      c.name.toLowerCase().includes(q)
      || c.state.toLowerCase().includes(q)
      || (c.city && c.city.toLowerCase().includes(q))
      || c.id.includes(q));
  }
  if (filters.state && filters.state !== 'all') {
    results = results.filter((c) => c.state === filters.state);
  }
  if (filters.type && filters.type !== 'all') {
    results = results.filter((c) => c.type === filters.type);
  }
  if (filters.platform && filters.platform !== 'all') {
    results = results.filter((c) => c.platform === filters.platform);
  }
  if (filters.testPolicy && filters.testPolicy !== 'all') {
    results = results.filter((c) => c.testPolicy === filters.testPolicy);
  }
  if (filters.region && filters.region !== 'all') {
    results = results.filter((c) => c.region === filters.region);
  }
  if (filters.acceptanceBand && filters.acceptanceBand !== 'all') {
    results = results.filter((c) => {
      if (c.acceptanceRate == null) return false;
      const pct = c.acceptanceRate * 100;
      if (filters.acceptanceBand === 'ultra') return pct < 15;
      if (filters.acceptanceBand === 'selective') return pct >= 15 && pct < 40;
      if (filters.acceptanceBand === 'moderate') return pct >= 40 && pct < 70;
      if (filters.acceptanceBand === 'open') return pct >= 70;
      return true;
    });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function getCatalogStates() {
  return [...new Set(COLLEGE_CATALOG.map((c) => c.state))].sort();
}

export function getCatalogPlatforms() {
  return [...new Set(COLLEGE_CATALOG.map((c) => c.platform).filter(Boolean))].sort();
}

export function getCatalogRegions() {
  return [...new Set(COLLEGE_CATALOG.map((c) => c.region).filter(Boolean))].sort();
}

export function resolveCollegeName(myCollege) {
  if (!myCollege) return '';
  if (myCollege.catalogId) {
    const cat = getCatalogCollege(myCollege.catalogId);
    if (cat) return cat.name;
  }
  return myCollege.customName || 'Unnamed school';
}
