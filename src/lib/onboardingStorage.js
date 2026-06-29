const PREFIX = 'veridian:onboarding:';

export function onboardingStorageKey(email) {
  return `${PREFIX}${email}`;
}

export function isOnboardingDoneLocally(email) {
  if (!email || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(onboardingStorageKey(email)) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingDoneLocally(email) {
  if (!email || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(onboardingStorageKey(email), '1');
  } catch {
    // ignore quota errors
  }
}

export function clearOnboardingDoneLocally(email) {
  if (!email || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(onboardingStorageKey(email));
  } catch {
    // ignore
  }
}
