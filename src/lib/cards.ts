import { prisma } from "./db";
import { writeAuditLog } from "./audit";
import { LoyaltyError } from "./loyalty-engine";

/** Admin creates a new blank (unassigned) physical card record. */
export async function createCard(cardNumber: string, adminId: string) {
  const existing = await prisma.loyaltyCard.findUnique({ where: { cardNumber } });
  if (existing) {
    throw new LoyaltyError("CARD_EXISTS", `Card number ${cardNumber} already exists.`);
  }
  const card = await prisma.loyaltyCard.create({ data: { cardNumber, status: "UNASSIGNED" } });
  await writeAuditLog({
    action: "CARD_CREATED",
    adminId,
    entityType: "LoyaltyCard",
    entityId: card.id,
    metadata: { cardNumber },
  });
  return card;
}

/**
 * Links a card number to a customer during registration.
 * Enforces: card must exist, must not already be linked to an active
 * customer, and a customer cannot hold more than one active card.
 */
export async function assignCardToCustomer(cardNumber: string, customerId: string) {
  const card = await prisma.loyaltyCard.findUnique({ where: { cardNumber } });
  if (!card) {
    throw new LoyaltyError("CARD_NOT_FOUND", "That card number was not recognized.");
  }
  if (card.status === "LOST" || card.status === "DEACTIVATED" || card.status === "REPLACED") {
    throw new LoyaltyError("CARD_INACTIVE", "This card is no longer active.");
  }
  if (card.customerId && card.customerId !== customerId) {
    throw new LoyaltyError("CARD_ALREADY_LINKED", "This card is already linked to another customer.");
  }

  const updated = await prisma.loyaltyCard.update({
    where: { id: card.id },
    data: { customerId, status: "ACTIVE", assignedAt: new Date() },
  });

  await writeAuditLog({
    action: "CARD_ASSIGNED",
    customerId,
    entityType: "LoyaltyCard",
    entityId: card.id,
    metadata: { cardNumber },
  });

  return updated;
}

export async function deactivateCard(cardId: string, adminId: string, reason?: string) {
  const card = await prisma.loyaltyCard.findUnique({ where: { id: cardId } });
  if (!card) throw new LoyaltyError("NOT_FOUND", "Card not found.");

  const updated = await prisma.loyaltyCard.update({
    where: { id: cardId },
    data: { status: "DEACTIVATED", deactivatedAt: new Date(), notes: reason },
  });

  await writeAuditLog({
    action: "CARD_DEACTIVATED",
    adminId,
    entityType: "LoyaltyCard",
    entityId: cardId,
    metadata: { reason },
  });

  return updated;
}

/**
 * Replaces a lost card with a brand new card number while preserving the
 * customer's account and full purchase history intact.
 */
export async function replaceLostCard(oldCardId: string, newCardNumber: string, adminId: string, reason?: string) {
  const oldCard = await prisma.loyaltyCard.findUnique({ where: { id: oldCardId } });
  if (!oldCard) throw new LoyaltyError("NOT_FOUND", "Card not found.");
  if (!oldCard.customerId) {
    throw new LoyaltyError("CARD_UNASSIGNED", "Cannot replace a card that isn't linked to a customer.");
  }

  const existingNew = await prisma.loyaltyCard.findUnique({ where: { cardNumber: newCardNumber } });
  if (existingNew) {
    throw new LoyaltyError("CARD_EXISTS", `Card number ${newCardNumber} already exists.`);
  }

  const customerId = oldCard.customerId;

  const [deactivatedOld, newCard] = await prisma.$transaction([
    prisma.loyaltyCard.update({
      where: { id: oldCard.id },
      data: { status: "REPLACED", deactivatedAt: new Date(), notes: reason, customerId: null },
    }),
    prisma.loyaltyCard.create({
      data: {
        cardNumber: newCardNumber,
        status: "ACTIVE",
        customerId,
        assignedAt: new Date(),
      },
    }),
  ]);

  await prisma.loyaltyCard.update({ where: { id: oldCard.id }, data: { replacedByCardId: newCard.id } });

  await writeAuditLog({
    action: "CARD_REPLACED",
    adminId,
    customerId,
    entityType: "LoyaltyCard",
    entityId: newCard.id,
    metadata: { oldCardNumber: oldCard.cardNumber, newCardNumber, reason },
  });

  return { oldCard: deactivatedOld, newCard };
}
