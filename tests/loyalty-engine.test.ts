import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/db";
import {
  createPurchaseRequest,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  addManualPurchase,
  redeemReward,
  getOrCreateActiveCycle,
  getCyclePurchaseCount,
  LoyaltyError,
} from "../src/lib/loyalty-engine";

async function makeAdmin() {
  return prisma.admin.create({ data: { name: "Test Admin", email: `a${Date.now()}${Math.random()}@aiva.test`, passwordHash: "x" } });
}

async function makeCustomer(mobile: string) {
  return prisma.customer.create({ data: { name: "Test Customer", mobileNumber: mobile } });
}

describe("Purchase request lifecycle", () => {
  it("creates a pending purchase request for the next slot", async () => {
    const customer = await makeCustomer("+919991000001");
    const request = await createPurchaseRequest(customer.id);
    expect(request.status).toBe("PENDING");
    expect(request.purchaseNumber).toBe(1);
  });

  it("prevents duplicate/simultaneous pending requests", async () => {
    const customer = await makeCustomer("+919991000002");
    await createPurchaseRequest(customer.id);
    await expect(createPurchaseRequest(customer.id)).rejects.toMatchObject({ code: "REQUEST_ALREADY_PENDING" });
  });

  it("admin approval increases purchase count and unlocks the reward", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000003");
    const request = await createPurchaseRequest(customer.id);

    await approvePurchaseRequest(request.id, admin.id);

    const cycle = await getOrCreateActiveCycle(customer.id);
    const count = await getCyclePurchaseCount(cycle.id);
    expect(count).toBe(1);

    const redemption = await prisma.rewardRedemption.findFirst({ where: { cycleId: cycle.id, purchaseNumber: 1 } });
    expect(redemption).not.toBeNull();
    expect(redemption!.displayLabel).toBe("10% OFF");
    expect(redemption!.status).toBe("UNLOCKED");
  });

  it("admin rejection does not increase purchase count", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000004");
    const request = await createPurchaseRequest(customer.id);

    const rejected = await rejectPurchaseRequest(request.id, admin.id, "Receipt didn't match");
    expect(rejected.status).toBe("REJECTED");

    const cycle = await getOrCreateActiveCycle(customer.id);
    const count = await getCyclePurchaseCount(cycle.id);
    expect(count).toBe(0);
  });

  it("cannot approve or reject an already-decided request", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000005");
    const request = await createPurchaseRequest(customer.id);
    await approvePurchaseRequest(request.id, admin.id);

    await expect(approvePurchaseRequest(request.id, admin.id)).rejects.toMatchObject({ code: "ALREADY_DECIDED" });
    await expect(rejectPurchaseRequest(request.id, admin.id)).rejects.toMatchObject({ code: "ALREADY_DECIDED" });
  });

  it("after rejection, the customer can submit a new request for the same slot", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000006");
    const request = await createPurchaseRequest(customer.id);
    await rejectPurchaseRequest(request.id, admin.id);

    const secondRequest = await createPurchaseRequest(customer.id);
    expect(secondRequest.purchaseNumber).toBe(1); // slot 1 still not completed
  });
});

describe("Admin manual purchase", () => {
  it("adds a purchase without a prior customer request and records ADMIN_MANUAL source", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000007");

    const purchase = await addManualPurchase({ customerId: customer.id, adminId: admin.id, orderReference: "ORD-1" });
    expect(purchase.purchaseNumber).toBe(1);
    expect(purchase.source).toBe("ADMIN_MANUAL");

    const cycle = await getOrCreateActiveCycle(customer.id);
    const count = await getCyclePurchaseCount(cycle.id);
    expect(count).toBe(1);
  });
});

describe("Reward structure — exact sequence", () => {
  it("matches the fixed AIVA reward sequence for all 10 purchases", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000008");
    const cycle = await getOrCreateActiveCycle(customer.id);

    const expected = [
      "10% OFF",
      "Keep Going ♡",
      "12% OFF",
      "Keep Going ♡",
      "Free Jewellery Organizer",
      "Keep Going ♡",
      "10% OFF",
      "Keep Going ♡",
      "15% OFF",
      "AIVA Surprise ✨",
    ];

    for (let i = 1; i <= 10; i++) {
      await addManualPurchase({ customerId: customer.id, adminId: admin.id });
      const redemption = await prisma.rewardRedemption.findFirst({ where: { cycleId: cycle.id, purchaseNumber: i } });
      expect(redemption!.displayLabel).toBe(expected[i - 1]);
    }
  });
});

describe("Reward redemption", () => {
  it("marks a reward as redeemed and records who redeemed it", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000009");
    await addManualPurchase({ customerId: customer.id, adminId: admin.id });

    const cycle = await getOrCreateActiveCycle(customer.id);
    const redemption = await prisma.rewardRedemption.findFirstOrThrow({ where: { cycleId: cycle.id, purchaseNumber: 1 } });

    const redeemed = await redeemReward(redemption.id, admin.id);
    expect(redeemed.status).toBe("REDEEMED");
    expect(redeemed.redeemedById).toBe(admin.id);
  });

  it("never allows a reward to be redeemed twice", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000010");
    await addManualPurchase({ customerId: customer.id, adminId: admin.id });

    const cycle = await getOrCreateActiveCycle(customer.id);
    const redemption = await prisma.rewardRedemption.findFirstOrThrow({ where: { cycleId: cycle.id, purchaseNumber: 1 } });

    await redeemReward(redemption.id, admin.id);
    await expect(redeemReward(redemption.id, admin.id)).rejects.toMatchObject({ code: "ALREADY_REDEEMED" });
  });
});

describe("Cycle completion & rollover", () => {
  it("marks the cycle COMPLETED after purchase #10 and starts a fresh cycle #2 on the next request", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000011");

    for (let i = 1; i <= 10; i++) {
      await addManualPurchase({ customerId: customer.id, adminId: admin.id });
    }

    const cycle1 = await prisma.loyaltyCycle.findFirstOrThrow({ where: { customerId: customer.id, cycleNumber: 1 } });
    expect(cycle1.status).toBe("COMPLETED");
    expect(cycle1.completedAt).not.toBeNull();

    // Historical purchases must remain — never deleted.
    const historicalCount = await prisma.purchase.count({ where: { cycleId: cycle1.id } });
    expect(historicalCount).toBe(10);

    // Next active cycle should be a brand new #2.
    const cycle2 = await getOrCreateActiveCycle(customer.id);
    expect(cycle2.cycleNumber).toBe(2);
    expect(cycle2.status).toBe("ACTIVE");

    const request = await createPurchaseRequest(customer.id);
    expect(request.purchaseNumber).toBe(1);
    expect(request.cycleId).toBe(cycle2.id);
  });

  it("rejects a new purchase request once a cycle already has 10 purchases and hasn't rolled over yet", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919991000012");
    const cycle = await getOrCreateActiveCycle(customer.id);

    for (let i = 1; i <= 10; i++) {
      await addManualPurchase({ customerId: customer.id, adminId: admin.id });
    }

    // Cycle is now COMPLETED; directly hitting addManualPurchase again should
    // start (or use) a new cycle rather than overflow the old one.
    const secondPurchase = await addManualPurchase({ customerId: customer.id, adminId: admin.id });
    expect(secondPurchase.purchaseNumber).toBe(1);
    expect(secondPurchase.cycleId).not.toBe(cycle.id);
  });
});
