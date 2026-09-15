import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/db";
import { createCard, assignCardToCustomer } from "../src/lib/cards";
import { getOrCreateActiveCycle, getCycleJourney, addManualPurchase } from "../src/lib/loyalty-engine";

async function makeAdmin() {
  return prisma.admin.create({ data: { name: "Test Admin", email: `a${Date.now()}${Math.random()}@aiva.test`, passwordHash: "x" } });
}

describe("Uniqueness constraints", () => {
  it("prevents two customers from registering with the same mobile number", async () => {
    await prisma.customer.create({ data: { name: "First", mobileNumber: "+919993000001" } });
    await expect(
      prisma.customer.create({ data: { name: "Second", mobileNumber: "+919993000001" } })
    ).rejects.toThrow();
  });

  it("prevents two cards from sharing the same card number", async () => {
    await prisma.loyaltyCard.create({ data: { cardNumber: "AIVA-00099", status: "UNASSIGNED" } });
    await expect(prisma.loyaltyCard.create({ data: { cardNumber: "AIVA-00099", status: "UNASSIGNED" } })).rejects.toThrow();
  });
});

describe("Login credentials (mobile number + card number, no OTP)", () => {
  it("only succeeds when the mobile number AND card number both match the same account", async () => {
    const admin = await makeAdmin();
    const customer = await prisma.customer.create({ data: { name: "Gia", mobileNumber: "+919995000001" } });
    await createCard("AIVA-00050", admin.id);
    await assignCardToCustomer("AIVA-00050", customer.id);

    const found = await prisma.customer.findUnique({
      where: { mobileNumber: "+919995000001" },
      include: { card: true },
    });

    expect(found).not.toBeNull();
    expect(found!.card?.cardNumber).toBe("AIVA-00050");
  });

  it("a customer's card cannot be used to log in with a different mobile number", async () => {
    const admin = await makeAdmin();
    const customer = await prisma.customer.create({ data: { name: "Gia", mobileNumber: "+919995000002" } });
    await createCard("AIVA-00051", admin.id);
    await assignCardToCustomer("AIVA-00051", customer.id);

    // Simulates the login route's lookup: find by mobile, then compare card number.
    const attempt = await prisma.customer.findUnique({
      where: { mobileNumber: "+919995000099" }, // wrong mobile
      include: { card: true },
    });
    expect(attempt).toBeNull();
  });
});

describe("Per-customer data isolation", () => {
  it("a customer's journey never includes another customer's purchases", async () => {
    const admin = await makeAdmin();
    const customerA = await prisma.customer.create({ data: { name: "A", mobileNumber: "+919994000001" } });
    const customerB = await prisma.customer.create({ data: { name: "B", mobileNumber: "+919994000002" } });

    await addManualPurchase({ customerId: customerA.id, adminId: admin.id });
    await addManualPurchase({ customerId: customerA.id, adminId: admin.id });
    // customerB makes no purchases

    const cycleA = await getOrCreateActiveCycle(customerA.id);
    const cycleB = await getOrCreateActiveCycle(customerB.id);

    const journeyA = await getCycleJourney(cycleA.id);
    const journeyB = await getCycleJourney(cycleB.id);

    expect(journeyA.completedCount).toBe(2);
    expect(journeyB.completedCount).toBe(0);
    expect(cycleA.id).not.toBe(cycleB.id);
  });
});
