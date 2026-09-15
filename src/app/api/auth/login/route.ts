import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { createCustomerSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { consume } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());

    const rl = consume(`login:${body.mobileNumber}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) return fail("RATE_LIMITED", 429);

    const customer = await prisma.customer.findUnique({
      where: { mobileNumber: body.mobileNumber },
      include: { card: true },
    });

    // Deliberately generic error for both "no such account" and "card
    // doesn't match", so the endpoint can't be used to enumerate which
    // mobile numbers are registered.
    if (
      !customer ||
      !customer.isActive ||
      !customer.card ||
      customer.card.cardNumber !== body.cardNumber ||
      customer.card.status !== "ACTIVE"
    ) {
      return fail("LOGIN_MISMATCH", 401);
    }

    await createCustomerSession(customer.id);
    await writeAuditLog({ action: "CUSTOMER_LOGIN", customerId: customer.id });

    return ok({ customerId: customer.id });
  } catch (err) {
    return handleApiError(err);
  }
}
