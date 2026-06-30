#!/usr/bin/env node
/**
 * Smoke-test toolsMarketData on a deployed Base44 app.
 *
 * Usage:
 *   node scripts/test-tools-market-data.mjs
 *   MARKET_DATA_TEST_URL=https://plexity.base44.app node scripts/test-tools-market-data.mjs
 *
 * Exits 0 when the function boots and returns Yahoo chart data for AAPL.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function readAppId() {
  if (process.env.VITE_BASE44_APP_ID) return process.env.VITE_BASE44_APP_ID;
  try {
    const env = readFileSync(path.join(root, '.env'), 'utf8');
    const match = env.match(/^VITE_BASE44_APP_ID=(.+)$/m);
    if (match?.[1]) return match[1].trim();
  } catch { /* no .env */ }
  return '69f7f418be004e32dd4e8acc';
}

const APP_ID = readAppId();
const BASE = (process.env.MARKET_DATA_TEST_URL || 'https://plexity.base44.app').replace(/\/$/, '');
const URL = `${BASE}/api/apps/${APP_ID}/functions/toolsMarketData`;

const PAYLOAD = {
  action: 'yahoo',
  path: '/v8/finance/chart/AAPL?interval=1d&range=1d',
  method: 'GET',
};

async function main() {
  console.log(`POST ${URL}`);
  console.log('Body:', JSON.stringify(PAYLOAD));

  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(PAYLOAD),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('Non-JSON response:', text.slice(0, 500));
    process.exit(1);
  }

  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(json, null, 2).slice(0, 1200));

  if (!res.ok) {
    console.error('\nFAIL: function returned HTTP error (often boot/import failure before Deno.serve).');
    process.exit(1);
  }

  const price = json?.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (price == null) {
    console.error('\nFAIL: function responded but Yahoo chart payload missing regularMarketPrice.');
    process.exit(1);
  }

  console.log(`\nOK: AAPL regularMarketPrice = ${price}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
