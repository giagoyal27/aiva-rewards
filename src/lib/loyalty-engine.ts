import { prisma } from "./db";
import { CYCLE_LENGTH, getRewardRuleFor } from "./rewards";
import { writeAuditLog } from "./audit";

export class LoyaltyError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Returns the customer's current ACTIVE cycle, creating cycle #1 if none exists. */
export async function getOrCreateActiveCycle(customerId: string) {
  let cycle = await prisma.loyaltyCycle.findFirst({
    where: { customerId, status: "ACTIVE" },
  });

  if (!cycle) {
    const lastCycle = await prisma.loyaltyCycle.findFirst({
      where: { customerId },
      orderBy: { cycleNumber: "desc" },
    });
    const nextCycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;
    cycle = await prisma.loyaltyCycle.create({
      data: { customerId, cycleNumber: nextCycleNumber, status: "ACTIVE" },
    });
    await writeAuditLog({
      action: "CYCLE_STARTED",
      customerId,
      entityType: "LoyaltyCycle",
      entityId: cycle.id,
      metadata: { cycleNumber: nextCycleNumber },
    });
  }

  return cycle;
}

/** Number of approved purchases already recorded in a cycle. */
export async function getCyclePurchaseCount(cycleId: string) {
  return prisma.purchase.count({ where: { cycleId } });
}

/**
 * Customer taps "I MADE A PURCHASE ♡".
 * Creates a PENDING PurchaseRequest for the next slot in the active cycle.
 * Rejects if a pending request already exists (no duplicate/spam requests)
 * or if the cycle is already full (should start a new cycle instead, which
 * happens automatically once purchase #10 is approved).
 */
export async function createPurchaseRequest(customerId: string) {
  const cycle = await getOrCreateActiveCycle(customerId);

  const existingPending = await prisma.purchaseRequest.findFirst({
    where: { customerId, cycleId: cycle.id, status: "PENDING" },
  });
  if (existingPending) {
    throw new LoyaltyError("REQUEST_ALREADY_PENDING", "Your purchase is already being verified.");
  }

  const currentCount = await getCyclePurchaseCount(cycle.id);
  if (currentCount >= CYCLE_LENGTH) {
    throw new LoyaltyError("CYCLE_FULL", "This loyalty cycle is already complete.");
  }

  const nextPurchaseNumber = currentCount + 1;

  const request = await prisma.purchaseRequest.create({
    data: {
      customerId,
      cycleId: cycle.id,
      purchaseNumber: nextPurchaseNumber,
      status: "PENDING",
    },
  });

  await writeAuditLog({
    action: "PURCHASE_REQUEST_CREATED",
    customerId,
    entityType: "PurchaseRequest",
    entityId: request.id,
    metadata: { purchaseNumber: nextPurchaseNumber, cycleId: cycle.id },
  });

  return request;
}

/**
 * Shared core: records an approved purchase (either from a customer request
 * or an admin manual add), unlocks the matching reward, and closes out the
 * cycle if this was purchase #10.
 */
async function recordApprovedPurchase(params: {
  customerId: string;
  cycleId: string;
  purchaseNumber: number;
  source: "CUSTOMER_REQUEST_APPROVED" | "ADMIN_MANUAL";
  adminId?: string;
  orderReference?: string;
  notes?: string;
}) {
  const existing = await prisma.purchase.findUnique({
    where: { cycleId_purchaseNumber: { cycleId: params.cycleId, purchaseNumber: params.purchaseNumber } },
  });
  if (existing) {
    throw new LoyaltyError("PURCHASE_ALREADY_RECORDED", `Purchase #${params.purchaseNumber} was already recorded.`);
  }

  const purchase = await prisma.purchase.create({
    data: {
      customerId: params.customerId,
      cycleId: params.cycleId,
      purchaseNumber: params.purchaseNumber,
      source: params.source,
      addedByAdminId: params.adminId,
      orderReference: params.orderReference,
      notes: params.notes,
    },
  });

  const rule = await getRewardRuleFor(params.purchaseNumber);
  await prisma.rewardRedemption.create({
    data: {
      purchaseId: purchase.id,
      cycleId: params.cycleId,
      purchaseNumber: params.purchaseNumber,
      type: rule.type,
      displayLabel: rule.displayLabel,
      value: rule.value ?? undefined,
      status: "UNLOCKED",
    },
  });

  if (params.purchaseNumber >= CYCLE_LENGTH) {
    await prisma.loyaltyCycle.update({
      where: { id: params.cycleId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await writeAuditLog({
      action: "CYCLE_COMPLETED",
      customerId: params.customerId,
      entityType: "LoyaltyCycle",
      entityId: params.cycleId,
    });
  }

  return purchase;
}

/** Admin approves a pending purchase request. */
export async function approvePurchaseRequest(requestId: string, adminId: string) {
  const request = await prisma.purchaseRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new LoyaltyError("NOT_FOUND", "Purchase request not found.");
  if (request.status !== "PENDING") {
    throw new LoyaltyError("ALREADY_DECIDED", "This request has already been decided.");
  }

  const purchase = await recordApprovedPurchase({
    customerId: request.customerId,
    cycleId: request.cycleId,
    purchaseNumber: request.purchaseNumber,
    source: "CUSTOMER_REQUEST_APPROVED",
    adminId,
  });

  const updatedRequest = await prisma.purchaseRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      approvedById: adminId,
      decidedAt: new Date(),
      resultingPurchaseId: purchase.id,
    },
  });

  await writeAuditLog({
    action: "PURCHASE_APPROVED",
    adminId,
    customerId: request.customerId,
    entityType: "Purchase",
    entityId: purchase.id,
    metadata: { purchaseNumber: request.purchaseNumber },
  });

  return updatedRequest;
}

/** Admin rejects a pending purchase request. */
export async function rejectPurchaseRequest(requestId: string, adminId: string, reason?: string) {
  const request = await prisma.purchaseRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new LoyaltyError("NOT_FOUND", "Purchase request not found.");
  if (request.status !== "PENDING") {
    throw new LoyaltyError("ALREADY_DECIDED", "This request has already been decided.");
  }

  const updatedRequest = await prisma.purchaseRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      approvedById: adminId,
      decidedAt: new Date(),
      rejectionReason: reason,
    },
  });

  await writeAuditLog({
    action: "PURCHASE_REJECTED",
    adminId,
    customerId: request.customerId,
    entityType: "PurchaseRequest",
    entityId: request.id,
    metadata: { reason },
  });

  return updatedRequest;
}

/** Admin manually adds a purchase without a prior customer request. */
export async function addManualPurchase(params: {
  customerId: string;
  adminId: string;
  orderReference?: string;
  notes?: string;
}) {
  const cycle = await getOrCreateActiveCycle(params.customerId);
  const currentCount = await getCyclePurchaseCount(cycle.id);
  if (currentCount >= CYCLE_LENGTH) {
    throw new LoyaltyError("CYCLE_FULL", "This loyalty cycle is already complete.");
  }
  const nextPurchaseNumber = currentCount + 1;

  const purchase = await recordApprovedPurchase({
    customerId: params.customerId,
    cycleId: cycle.id,
    purchaseNumber: nextPurchaseNumber,
    source: "ADMIN_MANUAL",
    adminId: params.adminId,
    orderReference: params.orderReference,
    notes: params.notes,
  });

  await writeAuditLog({
    action: "PURCHASE_ADDED_MANUAL",
    adminId: params.adminId,
    customerId: params.customerId,
    entityType: "Purchase",
    entityId: purchase.id,
    metadata: { purchaseNumber: nextPurchaseNumber },
  });

  return purchase;
}

/** Admin marks a reward as redeemed. Idempotent-safe: cannot redeem twice. */
export async function redeemReward(redemptionId: string, adminId: string) {
  const redemption = await prisma.rewardRedemption.findUnique({ where: { id: redemptionId } });
  if (!redemption) throw new LoyaltyError("NOT_FOUND", "Reward not found.");
  if (redemption.status === "REDEEMED") {
    throw new LoyaltyError("ALREADY_REDEEMED", "This reward has already been redeemed.");
  }

  const updated = await prisma.rewardRedemption.update({
    where: { id: redemptionId },
    data: { status: "REDEEMED", redeemedAt: new Date(), redeemedById: adminId },
  });

  await writeAuditLog({
    action: "REWARD_REDEEMED",
    adminId,
    entityType: "RewardRedemption",
    entityId: redemption.id,
    metadata: { purchaseNumber: redemption.purchaseNumber, displayLabel: redemption.displayLabel },
  });

  return updated;
}

/** Builds the full 1-10 journey view (for customer dashboard + admin profile). */
export async function getCycleJourney(cycleId: string) {
  const [purchases, pendingRequest, redemptions] = await Promise.all([
    prisma.purchase.findMany({ where: { cycleId }, orderBy: { purchaseNumber: "asc" } }),
    prisma.purchaseRequest.findFirst({ where: { cycleId, status: "PENDING" } }),
    prisma.rewardRedemption.findMany({ where: { cycleId }, orderBy: { purchaseNumber: "asc" } }),
  ]);

  const purchasedNumbers = new Set(purchases.map((p) => p.purchaseNumber));
  const rules = await Promise.all(
    Array.from({ length: CYCLE_LENGTH }, (_, i) => i + 1).map((n) => getRewardRuleFor(n))
  );

  const steps = rules.map((rule) => {
    const purchaseNumber = rule.purchaseNumber;
    const isCompleted = purchasedNumbers.has(purchaseNumber);
    const isPending = pendingRequest?.purchaseNumber === purchaseNumber;
    const redemption = redemptions.find((r) => r.purchaseNumber === purchaseNumber);
    return {
      purchaseNumber,
      status: isCompleted ? ("COMPLETED" as const) : isPending ? ("PENDING" as const) : ("NOT_COMPLETED" as const),
      reward: {
        type: rule.type,
        displayLabel: rule.displayLabel,
        value: rule.value,
      },
      redemptionStatus: redemption?.status ?? null,
      redemptionId: redemption?.id ?? null,
      completedAt: purchases.find((p) => p.purchaseNumber === purchaseNumber)?.createdAt ?? null,
    };
  });

  return {
    steps,
    completedCount: purchases.length,
    hasPendingRequest: Boolean(pendingRequest),
    pendingPurchaseNumber: pendingRequest?.purchaseNumber ?? null,
  };
}
