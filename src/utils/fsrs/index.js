import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs';
import { endOfTodayMs } from '@/utils/dueToday/endOfToday';

const scheduler = fsrs();

export function cardToFsrs(card) {
  const s = card.fsrsState ?? {};
  return {
    due: s.due ? new Date(s.due) : new Date(),
    stability: s.stability ?? 0,
    difficulty: s.difficulty ?? 0,
    elapsed_days: s.elapsed_days ?? 0,
    scheduled_days: s.scheduled_days ?? 0,
    learning_steps: s.learning_steps ?? 0,
    reps: s.reps ?? 0,
    lapses: s.lapses ?? 0,
    state: s.state ?? State.New,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  };
}

export function fsrsToState(record) {
  return {
    due: record.due.getTime(),
    stability: record.stability,
    difficulty: record.difficulty,
    elapsed_days: record.elapsed_days,
    scheduled_days: record.scheduled_days,
    learning_steps: record.learning_steps,
    reps: record.reps,
    lapses: record.lapses,
    state: record.state,
    lastReview: record.last_review ? record.last_review.getTime() : null,
  };
}

/**
 * Schedule a card after a review rating (1=Again, 2=Hard, 3=Good, 4=Easy).
 */
export function scheduleCard(card, rating = Rating.Good, now = new Date()) {
  const fsrsCard = cardToFsrs(card);
  const scheduling = scheduler.repeat(fsrsCard, now);
  const grade = rating in scheduling ? rating : Rating.Good;
  const next = scheduling[grade]?.card ?? scheduling[Rating.Good]?.card;
  return fsrsToState(next);
}

export function isCardDueToday(card, endOfToday = endOfTodayMs()) {
  if (card.suspended) return false;
  const due = card.fsrsState?.due;
  if (due == null) return false;
  return due <= endOfToday;
}

export function getDueCards(cards, endOfToday = endOfTodayMs()) {
  return cards.filter((c) => {
    if (c.suspended) return false;
    const due = c.fsrsState?.due;
    return due != null && due <= endOfToday;
  });
}

export function getCardHealth(card) {
  const stability = card.fsrsState?.stability ?? 0;
  const lapses = card.fsrsState?.lapses ?? 0;
  if (stability >= 21) return 'strong';
  if (stability >= 7) return 'moderate';
  if (stability < 7 || lapses >= 2) return 'fragile';
  return 'fragile';
}

export function averageStability(cards) {
  const active = cards.filter((c) => !c.suspended);
  if (!active.length) return 0;
  const sum = active.reduce((acc, c) => acc + (c.fsrsState?.stability ?? 0), 0);
  return sum / active.length;
}

export function stabilityToScore(stability) {
  return Math.min(100, Math.round((stability / 30) * 100));
}

export { Rating, State, createEmptyCard };
