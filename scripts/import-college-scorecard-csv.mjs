/**
 * Build college catalog from College Scorecard institution CSV (bulk download).
 * Download zip first (or run with --download):
 *   curl -L -o scripts/.cache/scorecard-inst.zip \
 *     https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_06102026.zip
 *
 * Usage: node scripts/import-college-scorecard-csv.mjs [--download]
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { COLLEGE_CATALOG_OVERRIDES } from '../src/lib/tools/college/college-catalog-overrides.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(__dirname, '.cache');
const zipPath = path.join(cacheDir, 'scorecard-inst.zip');
const catalogPath = path.join(__dirname, '../src/lib/tools/college/college-catalog.json');
const ZIP_URL = 'https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_06102026.zip';

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

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(university|college|of|the|at|and)\b/g, '').replace(/\s+/g, ' ').trim();
}

function parseCsv(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  const readField = () => {
    let field = '';
    if (text[i] === '"') {
      i += 1;
      while (i < len) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; }
          else { i += 1; break; }
        } else { field += text[i]; i += 1; }
      }
      if (text[i] === ',') i += 1;
      return field;
    }
    while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
      field += text[i]; i += 1;
    }
    if (text[i] === ',') i += 1;
    return field;
  };

  const headers = [];
  while (i < len && text[i] !== '\n' && text[i] !== '\r') {
    headers.push(readField());
  }
  while (i < len && (text[i] === '\n' || text[i] === '\r')) i += 1;

  while (i < len) {
    const row = {};
    for (let h = 0; h < headers.length; h += 1) {
      row[headers[h]] = readField();
    }
    rows.push(row);
    while (i < len && (text[i] === '\n' || text[i] === '\r')) i += 1;
  }
  return rows;
}

function num(val) {
  if (val == null || val === '' || val === 'NULL' || val === 'PrivacySuppressed') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function localeToSetting(locale) {
  const code = Number(locale);
  if (code >= 11 && code <= 13) return 'urban';
  if (code >= 21 && code <= 23) return 'suburban';
  if (code >= 31 && code <= 43) return 'rural';
  return null;
}

function satMid50(row) {
  const ml = num(row.SATMT25); const mh = num(row.SATMT75);
  const rl = num(row.SATVR25); const rh = num(row.SATVR75);
  if ([ml, mh, rl, rh].some((v) => v == null)) return null;
  return [rl + ml, rh + mh];
}

function actMid50(row) {
  const lo = num(row.ACTCM25); const hi = num(row.ACTCM75);
  return lo != null && hi != null ? [lo, hi] : null;
}

function mapRow(row, override) {
  const control = num(row.CONTROL);
  const type = control === 1 ? 'public' : 'private';
  const state = row.STABBR;
  const tuitionIn = num(row.TUITIONFEE_IN);
  const tuitionOut = num(row.TUITIONFEE_OUT);
  const netPub = num(row.NPT4_PUB);
  const netPriv = num(row.NPT4_PRIV);
  const netPrice = type === 'public' ? (netPub ?? netPriv) : (netPriv ?? netPub);
  const sticker = type === 'public' ? (tuitionOut ?? tuitionIn) : (tuitionOut ?? tuitionIn);

  const entry = {
    id: override?.id ?? `sc-${row.UNITID}`,
    unitId: Number(row.UNITID),
    name: row.INSTNM?.trim(),
    city: row.CITY?.trim() || '',
    state,
    type,
    region: REGION[state] || null,
    setting: localeToSetting(row.LOCALE),
    website: row.INSTURL ? `https://${row.INSTURL.replace(/^https?:\/\//, '')}` : null,
    acceptanceRate: num(row.ADM_RATE),
    satMid50: satMid50(row),
    actMid50: actMid50(row),
    tuitionInState: tuitionIn != null ? Math.round(tuitionIn) : null,
    tuitionOutState: tuitionOut != null ? Math.round(tuitionOut) : null,
    tuition: sticker != null ? Math.round(sticker) : null,
    netPrice: netPrice != null ? Math.round(netPrice) : null,
    enrollment: num(row.UGDS) != null ? Math.round(num(row.UGDS)) : null,
    retentionRate: num(row.RET_FT4),
    gradRate4yr: num(row.C150_4),
    medianDebt: num(row.DEBT_MDN) != null ? Math.round(num(row.DEBT_MDN)) : null,
    medianEarnings10yr: num(row.MD_EARN_WNE_P10) != null ? Math.round(num(row.MD_EARN_WNE_P10)) : null,
    studentFacultyRatio: num(row.STUFACR) != null ? Math.round(num(row.STUFACR)) : null,
    platform: override?.platform ?? 'School application',
    rdDeadline: override?.rdDeadline ?? 'Varies',
    eaDeadline: override?.eaDeadline ?? null,
    edDeadline: override?.edDeadline ?? null,
    testPolicy: override?.testPolicy ?? 'optional',
    honorsCollege: override?.honorsCollege ?? false,
  };

  return Object.fromEntries(
    Object.entries(entry).filter(([, v]) => v != null && v !== ''),
  );
}

function buildOverrideMap(existing) {
  const byName = new Map();
  const byUnitId = new Map();

  for (const o of COLLEGE_CATALOG_OVERRIDES) {
    byUnitId.set(o.unitId, o);
  }

  for (const c of existing) {
    const manual = {
      id: c.id,
      platform: c.platform,
      rdDeadline: c.rdDeadline,
      eaDeadline: c.eaDeadline,
      edDeadline: c.edDeadline,
      testPolicy: c.testPolicy,
      honorsCollege: c.honorsCollege,
    };
    if (c.id && !String(c.id).startsWith('sc-')) {
      if (c.unitId) byUnitId.set(c.unitId, { ...byUnitId.get(c.unitId), ...manual });
      byName.set(normalizeName(c.name), manual);
    }
  }
  return { byName, byUnitId };
}

function main() {
  const download = process.argv.includes('--download');
  if (download) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log('Downloading scorecard zip…');
    execSync(`curl -L -o "${zipPath}" "${ZIP_URL}"`, { stdio: 'inherit' });
  }

  if (!fs.existsSync(zipPath)) {
    console.error(`Missing ${zipPath}. Run with --download or curl the zip manually.`);
    process.exit(1);
  }

  const existing = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const { byName, byUnitId } = buildOverrideMap(existing);

  console.log('Parsing CSV from zip…');
  const csv = execSync(
    `unzip -p "${zipPath}" Most-Recent-Cohorts-Institution.csv`,
    { maxBuffer: 200 * 1024 * 1024, encoding: 'utf8' },
  );

  const rows = parseCsv(csv);
  console.log(`Parsed ${rows.length} rows`);

  const catalog = [];
  for (const row of rows) {
    if (num(row.PREDDEG) !== 3) continue;
    if (num(row.MAIN) !== 1) continue;
    if (!row.INSTNM || !row.STABBR) continue;

    const unitId = Number(row.UNITID);
    const override = byUnitId.get(unitId)
      ?? byName.get(normalizeName(row.INSTNM))
      ?? null;

    catalog.push(mapRow(row, override));
  }

  catalog.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog)}\n`);
  console.log(`Wrote ${catalog.length} colleges`);
}

main();
