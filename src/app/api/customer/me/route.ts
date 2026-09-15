import { prisma } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { getOrCreateActiveCycle, getCycleJourney } from "@/lib/loyalty-engine";

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) return fail("UNAUTHORIZED", 401);

    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      include: { card: true },
    });
    if (!customer || !customer.isActive) return fail("UNAUTHORIZED", 401);

    const cycle = await getOrCreateActiveCycle(customer.id);
    const journey = await getCycleJourney(cycle.id);

    const pastPurchases = await prisma.purchase.findMany({
      where: { customerId: customer.id },
      orderBy: [{ cycleId: "desc" }, { purchaseNumber: "asc" }],
      include: { cycle: true },
    });

    const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });

    return ok({
      customer: {
        id: customer.id,
        name: customer.name,
        mobileNumber: customer.mobileNumber,
        cardNumber: customer.card?.cardNumber ?? null,
        registeredAt: customer.createdAt,
      },
      cycle: { id: cycle.id, cycleNumber: cycle.cycleNumber, status: cycle.status },
      journey,
      history: pastPurchases.map((p) => ({
        purchaseNumber: p.purchaseNumber,
        cycleNumber: p.cycle.cycleNumber,
        createdAt: p.createdAt,
        source: p.source,
      })),
      social: {
        instagramUrl: settings?.instagramUrl ?? "",
        facebookUrl: settings?.facebookUrl ?? "",
        googleReviewUrl: settings?.googleReviewUrl ?? "",
        brandName: settings?.brandName ?? "AIVA",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
