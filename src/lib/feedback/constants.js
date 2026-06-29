export const FEEDBACK_TYPES = [
  { id: 'bug', label: 'Bug report', description: 'Something broke or behaves wrong' },
  { id: 'feature', label: 'Feature request', description: 'An idea for a new capability' },
  { id: 'general', label: 'General feedback', description: 'Thoughts, praise, or other notes' },
];

export const FEEDBACK_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
];

export const BUG_SEVERITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export { SUPPORT_EMAIL as FEEDBACK_SUPPORT_EMAIL } from '@/lib/branding/constants';

export const FEEDBACK_LIMITS = {
  subject: 200,
  message: 8000,
  longField: 4000,
};
