import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const feedbackPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../base44/entities/ToolsFeedback.jsonc',
);
const auditPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../base44/entities/AdminAuditLog.jsonc',
);

function loadJsonc(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  // Strip // comments for JSON.parse
  return JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''));
}

describe('ToolsFeedback RLS hardening', () => {
  const schema = loadJsonc(feedbackPath);

  it('allows owners to create and read their own feedback', () => {
    expect(schema.rls.create).toEqual({ 'data.userEmail': '{{user.email}}' });
    expect(schema.rls.read.$or).toEqual(
      expect.arrayContaining([
        { 'data.userEmail': '{{user.email}}' },
        { user_condition: { role: 'admin' } },
      ]),
    );
  });

  it('restricts update and delete to admins only', () => {
    expect(schema.rls.update).toEqual({ user_condition: { role: 'admin' } });
    expect(schema.rls.delete).toEqual({ user_condition: { role: 'admin' } });
  });

  it('protects status and adminNotes writes for admins', () => {
    expect(schema.properties.status.rls.write).toEqual({ user_condition: { role: 'admin' } });
    expect(schema.properties.adminNotes.rls.write).toEqual({ user_condition: { role: 'admin' } });
  });
});

describe('AdminAuditLog entity', () => {
  const schema = loadJsonc(auditPath);

  it('is admin-readable and append-only for non-service actors', () => {
    expect(schema.rls.read).toEqual({ user_condition: { role: 'admin' } });
    expect(schema.rls.create).toEqual({ user_condition: { role: 'admin' } });
    expect(schema.rls.update).toEqual({ user_condition: { role: '__service_only__' } });
    expect(schema.rls.delete).toEqual({ user_condition: { role: '__service_only__' } });
  });

  it('requires sanitized audit fields', () => {
    expect(schema.required).toEqual(
      expect.arrayContaining(['actorEmail', 'action', 'outcome', 'requestId', 'createdAt']),
    );
  });
});
