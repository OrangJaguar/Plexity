/**
 * Fetches US bachelor's colleges from College Scorecard (state-by-state to reduce rate limits)
 * and merges manual overrides from the existing catalog.
 *
 * Usage: node scripts/import-college-scorecard.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '../src/lib/tools/college/college-catalog.json');

const API_KEY = process.env.COLLEGE_SCORECARD_API_KEY;
if (!API_KEY) {
  console.error(
    'Missing COLLEGE_SCORECARD_API_KEY.\n'
    + 'Request a free key at https://api.data.gov/signup/ then run:\n'
    + '  COLLEGE_SCORECARD_API_KEY=your_key node scripts/import-college-scorecard.mjs',
  );
  process.exit(1);
}
const PER_PAGE = 100;
const REQUEST_DELAY_MS = 650;

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
  'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT',
  'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const REGION = {
  ME: 'Northeast', NH: 'Northeast', VT: 'Northeast', MA: 'Northeast', RI: 'Northeast',
  CT: 'Northeast', NY: 'Northeast', NJ: 'Northeast', PA: 'Northeast',
  DE: 'South', MD: 'South', DC: 'South', VA: 'South', WV: 'South', KY: 'South',
  TN: 'South', NC: 'South', SC: 'South', GA: 'South', FL: 'South', AL: 'South',
  MS: 'South', LA: 'South', AR: 'South', TX: 'South', OK: 'South',
  OH: 'Midwest', MI: 'Midwest', IN: 'Midwest', IL: 'Midwest', WI: 'Midwest',
  MN: 'Midwest', IA: 'Midwest', MO: 'Midwest', ND: 'Midwest', SD: 'Midwest',
  NE: 'Midwest', KS: 'Midwest',
  MT: 'West', ID: 'West', WY: 'West', CO: 'West', NM: 'West', AZ: 'West',
  UT: 'West', NV: 'West', WA: 'West', OR: 'West', CA: 'West', AK: 'West', HI: 'West',
};

const FIELDS = [
  'id', 'school.name', 'school.city', 'school.state', 'school.locale', 'school.ownership',
  'school.school_url', 'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.25th_percentile.math',
  'latest.admissions.sat_scores.75th_percentile.math',
  'latest.admissions.sat_scores.25th_percentile.critical_reading',
  'latest.admissions.sat_scores.75th_percentile.critical_reading',
  'latest.admissions.act_scores.25th_percentile.cumulative',
  'latest.admissions.act_scores.75th_percentile.cumulative',
  'latest.cost.tuition.in_state', 'latest.cost.tuition.out_of_state',
  'latest.cost.avg_net_price.public', 'latest.cost.avg_net_price.private',
  'latest.student.size', 'latest.student.retention_rate.four_year.full_time',
  'latest.completion.completion_rate_4yr_150nt', 'latest.aid.median_debt.completers.overall',
  'latest.earnings.10_yrs_after_entry.median',
  'latest.student.demographics.student_faculty_ratio',
].join(',');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(university|college|of|the|at|and)\b/g, '').replace(/\s+/g, ' ').trim();
}

function localeToSetting(locale) {
  const code = Number(locale);
  if (code >= 11 && code <= 13) return 'urban';
  if (code >= 21 && code <= 23) return 'suburban';
  if (code >= 31 && code <= 43) return 'rural';
  return null;
}

function ownershipToType(ownership) {
  return ownership === 1 ? 'public' : 'private';
}

function satMid50(row) {
  const ml = row['latest.admissions.sat_scores.25th_percentile.math'];
  const mh = row['latest.admissions.sat_scores.75th_percentile.math'];
  const rl = row['latest.admissions.sat_scores.25th_percentile.critical_reading'];
  const rh = row['latest.admissions.sat_scores.75th_percentile.critical_reading'];
  if ([ml, mh, rl, rh].some((v) => v == null)) return null;
  return [rl + ml, rh + mh];
}

function actMid50(row) {
  const lo = row['latest.admissions.act_scores.25th_percentile.cumulative'];
  const hi = row['latest.admissions.act_scores.75th_percentile.cumulative'];
  return lo != null && hi != null ? [lo, hi] : null;
}

function netPrice(row, type) {
  const pub = row['latest.cost.avg_net_price.public'];
  const priv = row['latest.cost.avg_net_price.private'];
  const val = type === 'public' ? (pub ?? priv) : (priv ?? pub);
  return val != null ? Math.round(val) : null;
}

function stickerTuition(row, type) {
  const ins = row['latest.cost.tuition.in_state'];
  const outs = row['latest.cost.tuition.out_of_state'];
  const val = type === 'public' ? (outs ?? ins) : (outs ?? ins);
  return val != null ? Math.round(val) : null;
}

function mapRow(row, override) {
  const state = row['school.state'];
  const type = ownershipToType(row['school.ownership']);
  const entry = {
    id: override?.id ?? `sc-${row.id}`,
    unitId: row.id,
    name: row['school.name'],
    city: row['school.city'] || '',
    state,
    type,
    region: REGION[state] || null,
    setting: localeToSetting(row['school.locale']),
    website: row['school.school_url']
      ? `https://${row['school.school_url'].replace(/^https?:\/\//, '')}` : null,
    acceptanceRate: row['latest.admissions.admission_rate.overall'] ?? null,
    satMid50: satMid50(row),
    actMid50: actMid50(row),
    tuitionInState: row['latest.cost.tuition.in_state'] != null
      ? Math.round(row['latest.cost.tuition.in_state']) : null,
    tuitionOutState: row['latest.cost.tuition.out_of_state'] != null
      ? Math.round(row['latest.cost.tuition.out_of_state']) : null,
    tuition: stickerTuition(row, type),
    netPrice: netPrice(row, type),
    enrollment: row['latest.student.size'] != null ? Math.round(row['latest.student.size']) : null,
    retentionRate: row['latest.student.retention_rate.four_year.full_time'] ?? null,
    gradRate4yr: row['latest.completion.completion_rate_4yr_150nt'] ?? null,
    medianDebt: row['latest.aid.median_debt.completers.overall'] != null
      ? Math.round(row['latest.aid.median_debt.completers.overall']) : null,
    medianEarnings10yr: row['latest.earnings.10_yrs_after_entry.median'] != null
      ? Math.round(row['latest.earnings.10_yrs_after_entry.median']) : null,
    studentFacultyRatio: row['latest.student.demographics.student_faculty_ratio'] != null
      ? Math.round(row['latest.student.demographics.student_faculty_ratio']) : null,
    platform: override?.platform ?? 'School application',
    rdDeadline: override?.rdDeadline ?? 'Varies',
    eaDeadline: override?.eaDeadline ?? null,
    edDeadline: override?.edDeadline ?? null,
    testPolicy: override?.testPolicy ?? 'optional',
    honorsCollege: override?.honorsCollege ?? false,
  };
  return Object.fromEntries(Object.entries(entry).filter(([, v]) => v != null && v !== false || v === false));
}

async function fetchStatePage(state, page, attempt = 0) {
  const url = new URL('https://api.data.gov/ed/collegescorecard/v1/schools');
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('fields', FIELDS);
  url.searchParams.set('school.degrees_awarded.predominant', '3');
  url.searchParams.set('school.state', state);
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', String(page));

  await sleep(REQUEST_DELAY_MS);
  const res = await fetch(url);
  if (res.status === 429 && attempt < 8) {
    const wait = 3000 * (attempt + 1);
    console.log(`  rate limited ${state} p${page}, wait ${wait}ms`);
    await sleep(wait);
    return fetchStatePage(state, page, attempt + 1);
  }
  if (!res.ok) throw new Error(`API ${res.status} ${state} page ${page}`);
  return res.json();
}

function buildOverrideMap(existing) {
  const byName = new Map();
  const byUnitId = new Map();
  for (const c of existing) {
    const manual = {
      id: c.id, platform: c.platform, rdDeadline: c.rdDeadline,
      eaDeadline: c.eaDeadline, edDeadline: c.edDeadline,
      testPolicy: c.testPolicy, honorsCollege: c.honorsCollege,
    };
    byName.set(normalizeName(c.name), manual);
    if (c.unitId) byUnitId.set(c.unitId, manual);
  }
  return { byName, byUnitId };
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const { byName, byUnitId } = buildOverrideMap(existing);
  const allRows = [];

  for (const state of US_STATES) {
    let page = 0;
    let total = Infinity;
    while (page * PER_PAGE < total) {
      const data = await fetchStatePage(state, page);
      total = data.metadata.total;
      allRows.push(...data.results);
      page += 1;
      if (data.results.length === 0) break;
    }
    process.stdout.write(` ${state}:${total}`);
  }
  console.log('');

  const seen = new Set();
  const catalog = [];
  for (const row of allRows) {
    if (!row['school.name'] || seen.has(row.id)) continue;
    seen.add(row.id);
    const override = byUnitId.get(row.id) ?? byName.get(normalizeName(row['school.name'])) ?? null;
    catalog.push(mapRow(row, override));
  }

  catalog.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog)}\n`);
  console.log(`Wrote ${catalog.length} colleges`);
}

main().catch((e) => { console.error(e); process.exit(1); });
