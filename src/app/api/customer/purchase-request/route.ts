import { getCustomerSession } from "@/lib/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { createPurchaseRequest } from "@/lib/loyalty-engine";
import { consume } from "@/lib/rate-limit";

export async function POST() {
  try {
    const session = await getCustomerSession();
    if (!session) return fail("UNAUTHORIZED", 401);

    // Extra defense-in-depth against rapid double-taps on the button,
    // on top of the "one pending request" business rule enforced in the
    // loyalty engine itself.
    const rl = consume(`purchase-request:${session.customerId}`, 3, 60 * 1000);
    if (!rl.allowed) return fail("RATE_LIMITED", 429);

    const request = await createPurchaseRequest(session.customerId);
    return ok({ requestId: request.id, purchaseNumber: request.purchaseNumber, status: request.status });
  } catch (err) {
    return handleApiError(err);
  }
}
