import { describe, expect, it } from 'vitest';
import { buildFeedbackPayload, validateFeedbackForm } from '@/lib/feedback/validate-feedback';

describe('validate-feedback', () => {
  it('requires type, subject, and message', () => {
    expect(validateFeedbackForm({})).toEqual({
      ok: false,
      field: 'type',
      message: 'Choose a feedback type.',
    });
    expect(validateFeedbackForm({ type: 'general' })).toEqual({
      ok: false,
      field: 'subject',
      message: 'Subject is required.',
    });
    expect(validateFeedbackForm({ type: 'general', subject: 'Hi' })).toEqual({
      ok: false,
      field: 'message',
      message: 'Message is required.',
    });
    expect(validateFeedbackForm({
      type: 'general',
      subject: 'Hi',
      message: 'Details here',
    })).toEqual({ ok: true });
  });

  it('validates bug severity and builds payload', () => {
    const form = {
      type: 'bug',
      subject: 'Broken button',
      message: 'It does not click',
      severity: 'high',
      stepsToReproduce: 'Click save',
      expectedBehavior: 'Saves',
      actualBehavior: 'Nothing',
      toolId: 'tasks',
    };
    expect(validateFeedbackForm(form)).toEqual({ ok: true });
    const payload = buildFeedbackPayload(form);
    expect(payload.type).toBe('bug');
    expect(payload.severity).toBe('high');
    expect(payload.toolId).toBe('tasks');
    expect(payload.stepsToReproduce).toBe('Click save');
  });
});
