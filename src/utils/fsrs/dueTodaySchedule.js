import { State } from 'ts-fsrs';
import { endOfTodayMs } from '@/utils/dueToday/endOfToday';
import { getDueCards } from '@/utils/fsrs';
import {
  FSRS_DAILY_CARD_CAP,
  FSRS_NEW_CARDS_MAX,
  FSRS_NEW_CARDS_MIN,
  FSRS_OVERDUE_SPREAD_DAYS,
} from '@/utils/weeklyPlan/constants';

export function getEligibleDueCards(cards, endOfToday = endOfTodayMs()) {
  return getDueCards(cards, endOfToday);
}

export function isNewCard(card) {
  const state = card.fsrsState?.state;
  const reps = card.fsrsState?.reps ?? 0;
  return state === State.New || state === 0 || reps === 0;
}

export function isOverdueCard(card, endOfToday = endOfTodayMs()) {
  const due = card.fsrsState?.due;
  if (due == null) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return due < startOfToday.getTime();
}

/**
 * Select cards for today's review with daily cap, new-card rate, and overdue spreading.
 */
export function selectCardsForToday(allCards, {
  endOfToday = endOfTodayMs(),
  dailyCap = FSRS_DAILY_CARD_CAP,
  newCardsMin = FSRS_NEW_CARDS_MIN,
  newCardsMax = FSRS_NEW_CARDS_MAX,
  spreadDays = FSRS_OVERDUE_SPREAD_DAYS,
  dateKey,
} = {}) {
  const active = allCards.filter((c) => !c.suspended);
  const eligible = getEligibleDueCards(active, endOfToday);

  const overdue = eligible.filter((c) => isOverdueCard(c, endOfToday));
  const dueToday = eligible.filter((c) => !isOverdueCard(c, endOfToday));
  const newCards = dueToday.filter(isNewCard);
  const reviewCards = dueToday.filter((c) => !isNewCard(c));

  const dayNum = dateKey
    ? parseInt(dateKey.replace(/-/g, ''), 10) % spreadDays
    : new Date().getDate() % spreadDays;

  const overdueQuota = overdue.length > 0
    ? Math.ceil(overdue.length / spreadDays) + (dayNum === 0 ? overdue.length % spreadDays : 0)
    : 0;
  const overdueToday = overdue.slice(0, Math.min(overdueQuota, dailyCap));

  const newQuota = Math.min(
    newCardsMax,
    Math.max(newCardsMin, Math.floor(dailyCap / 3)),
    newCards.length,
  );
  const newToday = newCards.slice(0, newQuota);

  const remaining = dailyCap - overdueToday.length - newToday.length;
  const reviewToday = reviewCards.slice(0, Math.max(0, remaining));

  const todayCards = [...overdueToday, ...reviewToday, ...newToday].slice(0, dailyCap);
  const deferredCount = eligible.length - todayCards.length;

  return { todayCards, deferredCount, totalEligible: eligible.length };
}

/**
 * Stagger initial due dates for new deck cards (5-10 due first day).
 */
export function staggerNewCardDueDates(cardCount, now = Date.now()) {
  const firstDayCount = Math.min(FSRS_NEW_CARDS_MAX, Math.max(FSRS_NEW_CARDS_MIN, Math.ceil(cardCount / 3)));
  const msPerDay = 86400000;

  return Array.from({ length: cardCount }, (_, i) => {
    if (i < firstDayCount) return now;
    const dayOffset = Math.ceil((i - firstDayCount + 1) / FSRS_NEW_CARDS_MAX);
    return now + dayOffset * msPerDay;
  });
}
