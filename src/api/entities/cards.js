import { base44 } from '@/api/base44Client';
import { requireAuth } from '@/api/requireAuth';

async function findByClientId(entity, field, value) {
  const rows = await entity.filter({ [field]: value });
  return rows[0] ?? null;
}

export async function listAllCards() {
  await requireAuth();
  return base44.entities.Card.list();
}

export async function listCardsByJourney(journeyId) {
  await requireAuth();
  return base44.entities.Card.filter({ journeyId });
}

export async function listCardsByActivity(activityId) {
  await requireAuth();
  return base44.entities.Card.filter({ activityId });
}

export async function getCard(cardId) {
  await requireAuth();
  return findByClientId(base44.entities.Card, 'cardId', cardId);
}

export async function createCard(activityId, journeyId, payload) {
  const user = await requireAuth();
  return base44.entities.Card.create({
    ...payload,
    activityId,
    journeyId,
    userEmail: user.email,
    suspended: payload.suspended ?? false,
  });
}

export async function createCards(activityId, journeyId, cards) {
  const user = await requireAuth();
  return Promise.all(
    cards.map((card) =>
      base44.entities.Card.create({
        ...card,
        activityId,
        journeyId,
        userEmail: user.email,
        suspended: card.suspended ?? false,
      }),
    ),
  );
}

export async function updateCard(cardId, patch) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Card, 'cardId', cardId);
  if (!existing) throw new Error(`Card not found: ${cardId}`);
  return base44.entities.Card.update(existing.id, patch);
}

export async function deleteCard(cardId) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Card, 'cardId', cardId);
  if (!existing) return;
  await base44.entities.Card.delete(existing.id);
}
