/**
 * Adds Scorecard-shaped fields to existing catalog entries (no API).
 * Run import-college-scorecard.mjs when API quota is available for full import.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '../src/lib/tools/college/college-catalog.json');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const enriched = catalog.map((c) => ({
  ...c,
  unitId: c.unitId ?? null,
  website: c.website ?? null,
  tuitionInState: c.tuitionInState ?? (c.type === 'public' ? c.tuition : null),
  tuitionOutState: c.tuitionOutState ?? c.tuition ?? null,
  netPrice: c.netPrice ?? null,
  retentionRate: c.retentionRate ?? null,
  gradRate4yr: c.gradRate4yr ?? null,
  medianDebt: c.medianDebt ?? null,
  medianEarnings10yr: c.medianEarnings10yr ?? null,
  studentFacultyRatio: c.studentFacultyRatio ?? null,
}));

fs.writeFileSync(catalogPath, `${JSON.stringify(enriched)}\n`);
console.log(`Enriched ${enriched.length} entries`);
