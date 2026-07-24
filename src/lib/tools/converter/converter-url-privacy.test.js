import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('Plan 5 privacy regressions', () => {
  it('adminConverterApi audits never interpolate raw URL variables into detail', () => {
    const source = readFileSync(
      path.join(root, 'base44/functions/adminConverterApi/entry.ts'),
      'utf8',
    );
    expect(source).toContain('redactLabel');
    expect(source).not.toMatch(/detail:\s*[`'"].*\$\{[^}]*url/i);
    expect(source).toMatch(/detail:\s*"download-issued"/);
    const auditCalls = [...source.matchAll(/writeAudit\([\s\S]*?\);/g)].map((m) => m[0]);
    expect(auditCalls.length).toBeGreaterThan(3);
    for (const call of auditCalls) {
      expect(call).not.toMatch(/downloadUrl/);
      expect(call).not.toMatch(/https?:\/\//);
    }
  });

  it('remote hook never materializes remote jobs as browser File/OPFS sources', () => {
    const source = readFileSync(
      path.join(root, 'src/hooks/useAdminConverterUrlWorkspace.js'),
      'utf8',
    );
    expect(source).not.toMatch(/new File\(/);
    expect(source).not.toMatch(/URL\.createObjectURL/);
    expect(source).not.toMatch(/navigator\.storage\.getDirectory/);
    expect(source).toContain('converterJobDownload');
  });

  it('Authorized URL Import UI discloses temporary server processing', () => {
    const source = readFileSync(
      path.join(root, 'src/components/tools/converter/ConverterAuthorizedUrlImport.jsx'),
      'utf8',
    );
    expect(source.toLowerCase()).toMatch(/temporary/);
    expect(source.toLowerCase()).toMatch(/admin only/);
    expect(source).toContain('Authorized URL Import');
    expect(source).not.toMatch(/YouTube Downloader/i);
  });
});
