import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/db";
import { createCard, assignCardToCustomer, deactivateCard, replaceLostCard } from "../src/lib/cards";
import { LoyaltyError } from "../src/lib/loyalty-engine";

async function makeAdmin() {
  return prisma.admin.create({ data: { name: "Test Admin", email: `a${Date.now()}@aiva.test`, passwordHash: "x" } });
}

async function makeCustomer(mobile = "+919990000001") {
  return prisma.customer.create({ data: { name: "Test Customer", mobileNumber: mobile } });
}

describe("Card management", () => {
  it("creates a card and rejects a duplicate card number", async () => {
    const admin = await makeAdmin();
    await createCard("AIVA-00001", admin.id);
    await expect(createCard("AIVA-00001", admin.id)).rejects.toThrow(LoyaltyError);
  });

  it("links a card to a customer during registration", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer();
    await createCard("AIVA-00002", admin.id);

    const card = await assignCardToCustomer("AIVA-00002", customer.id);
    expect(card.customerId).toBe(customer.id);
    expect(card.status).toBe("ACTIVE");
  });

  it("rejects an unknown card number", async () => {
    const customer = await makeCustomer();
    await expect(assignCardToCustomer("AIVA-99999", customer.id)).rejects.toMatchObject({ code: "CARD_NOT_FOUND" });
  });

  it("prevents a card from being linked to a second, different customer", async () => {
    const admin = await makeAdmin();
    const customerA = await makeCustomer("+919990000002");
    const customerB = await makeCustomer("+919990000003");
    await createCard("AIVA-00003", admin.id);

    await assignCardToCustomer("AIVA-00003", customerA.id);
    await expect(assignCardToCustomer("AIVA-00003", customerB.id)).rejects.toMatchObject({
      code: "CARD_ALREADY_LINKED",
    });
  });

  it("deactivates a card without deleting the customer's data", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919990000004");
    const card = await createCard("AIVA-00004", admin.id);
    await assignCardToCustomer("AIVA-00004", customer.id);

    const deactivated = await deactivateCard(card.id, admin.id, "Lost");
    expect(deactivated.status).toBe("DEACTIVATED");

    const stillExists = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(stillExists).not.toBeNull();
  });

  it("rejects purchases/assignment against a deactivated card", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919990000005");
    const card = await createCard("AIVA-00005", admin.id);
    await deactivateCard(card.id, admin.id);

    await expect(assignCardToCustomer("AIVA-00005", customer.id)).rejects.toMatchObject({ code: "CARD_INACTIVE" });
  });

  it("replaces a lost card while preserving the customer's account and history", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer("+919990000006");
    const oldCard = await createCard("AIVA-00006", admin.id);
    await assignCardToCustomer("AIVA-00006", customer.id);

    const { oldCard: deactivatedOld, newCard } = await replaceLostCard(oldCard.id, "AIVA-00007", admin.id, "Lost");

    expect(deactivatedOld.status).toBe("REPLACED");
    expect(newCard.cardNumber).toBe("AIVA-00007");
    expect(newCard.customerId).toBe(customer.id);

    const customerStillThere = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(customerStillThere).not.toBeNull();
  });
});
