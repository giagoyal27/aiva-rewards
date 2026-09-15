import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { getCyclePurchaseCount } from "@/lib/loyalty-engine";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const requests = await prisma.purchaseRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { customer: { include: { card: true } } },
    });

    const enriched = await Promise.all(
      requests.map(async (r) => ({
        id: r.id,
        purchaseNumber: r.purchaseNumber,
        createdAt: r.createdAt,
        customer: {
          id: r.customer.id,
          name: r.customer.name,
          mobileNumber: r.customer.mobileNumber,
          cardNumber: r.customer.card?.cardNumber ?? null,
        },
        currentCompletedPurchases: await getCyclePurchaseCount(r.cycleId),
      }))
    );

    return ok(enriched);
  } catch (err) {
    return handleApiError(err);
  }
}
