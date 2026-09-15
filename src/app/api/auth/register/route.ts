import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { assignCardToCustomer } from "@/lib/cards";
import { createCustomerSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { consume } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());

    const rl = consume(`register:${body.mobileNumber}`, 8, 15 * 60 * 1000);
    if (!rl.allowed) return fail("RATE_LIMITED", 429);

    // One card number cannot be linked to multiple active customers, and a
    // customer cannot claim another customer's card.
    const [existingCustomer, card] = await Promise.all([
      prisma.customer.findUnique({ where: { mobileNumber: body.mobileNumber } }),
      prisma.loyaltyCard.findUnique({ where: { cardNumber: body.cardNumber } }),
    ]);

    if (existingCustomer) {
      return fail("MOBILE_ALREADY_REGISTERED", 409);
    }
    if (!card) {
      return fail("CARD_NOT_FOUND", 404);
    }
    if (card.status !== "UNASSIGNED" && card.status !== "ACTIVE") {
      return fail("CARD_INACTIVE", 409);
    }
    if (card.customerId) {
      return fail("CARD_ALREADY_LINKED", 409);
    }

    const customer = await prisma.customer.create({
      data: { name: body.name, mobileNumber: body.mobileNumber },
    });

    await assignCardToCustomer(body.cardNumber, customer.id);
    await createCustomerSession(customer.id);
    await writeAuditLog({
      action: "CUSTOMER_REGISTERED",
      customerId: customer.id,
      entityType: "Customer",
      entityId: customer.id,
    });

    return ok({ customerId: customer.id });
  } catch (err) {
    return handleApiError(err);
  }
}
