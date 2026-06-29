import { FEEDBACK_LIMITS } from '@/lib/feedback/constants';

const VALID_TYPES = new Set(['bug', 'feature', 'general']);
const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);

/**
 * @returns {{ ok: true } | { ok: false, field?: string, message: string }}
 */
export function validateFeedbackForm(form, { type } = {}) {
  const feedbackType = type || form.type;
  if (!VALID_TYPES.has(feedbackType)) {
    return { ok: false, field: 'type', message: 'Choose a feedback type.' };
  }

  const subject = String(form.subject || '').trim();
  const message = String(form.message || '').trim();

  if (!subject) {
    return { ok: false, field: 'subject', message: 'Subject is required.' };
  }
  if (subject.length > FEEDBACK_LIMITS.subject) {
    return { ok: false, field: 'subject', message: `Subject must be under ${FEEDBACK_LIMITS.subject} characters.` };
  }
  if (!message) {
    return { ok: false, field: 'message', message: 'Message is required.' };
  }
  if (message.length > FEEDBACK_LIMITS.message) {
    return { ok: false, field: 'message', message: `Message must be under ${FEEDBACK_LIMITS.message} characters.` };
  }

  if (feedbackType === 'bug') {
    const severity = form.severity || 'medium';
    if (!VALID_SEVERITIES.has(severity)) {
      return { ok: false, field: 'severity', message: 'Choose a severity.' };
    }
    for (const key of ['stepsToReproduce', 'expectedBehavior', 'actualBehavior']) {
      const val = String(form[key] || '').trim();
      if (val.length > FEEDBACK_LIMITS.longField) {
        return { ok: false, field: key, message: 'Field is too long.' };
      }
    }
  }

  return { ok: true };
}

export function buildFeedbackPayload(form) {
  return {
    type: form.type,
    subject: String(form.subject || '').trim(),
    message: String(form.message || '').trim(),
    displayName: String(form.displayName || '').trim(),
    toolId: String(form.toolId || '').trim(),
    severity: form.type === 'bug' ? (form.severity || 'medium') : undefined,
    stepsToReproduce: form.type === 'bug' ? String(form.stepsToReproduce || '').trim() : undefined,
    expectedBehavior: form.type === 'bug' ? String(form.expectedBehavior || '').trim() : undefined,
    actualBehavior: form.type === 'bug' ? String(form.actualBehavior || '').trim() : undefined,
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : '',
  };
}
