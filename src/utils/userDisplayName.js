import { normalizeUsername } from '@/utils/schemas/preferences';

/** Name shown in greetings — prefers saved username over auth full_name / email handle. */
export function getGreetingName({ user, preferences } = {}) {
  const username = preferences?.username?.trim();
  if (username) return username;

  const fromFullName = user?.full_name?.trim();
  if (fromFullName) return fromFullName.split(/\s+/)[0];

  const handle = user?.email?.split('@')[0];
  return handle || null;
}

/** True when User.full_name still looks like the email handle, not the chosen username. */
export function authNameNeedsUsernameSync(user, preferences) {
  const username = normalizeUsername(preferences?.username);
  if (!username || !user?.email) return false;

  const current = normalizeUsername(user.full_name || '');
  if (current === username) return false;

  const emailHandle = normalizeUsername(user.email.split('@')[0]);
  return !current || current === emailHandle;
}
