import { cpSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfjsDist = path.dirname(require.resolve('pdfjs-dist/package.json'));
const publicDir = path.join(root, 'public');

for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  const src = path.join(pdfjsDist, folder);
  const dest = path.join(publicDir, folder);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`[pdfjs] copied ${folder} -> public/${folder}`);
}

const workerSrc = path.join(pdfjsDist, 'legacy/build/pdf.worker.min.mjs');
const workerDest = path.join(publicDir, 'pdf.worker.min.mjs');
cpSync(workerSrc, workerDest);
console.log('[pdfjs] copied pdf.worker.min.mjs -> public/pdf.worker.min.mjs');
