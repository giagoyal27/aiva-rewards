import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { getOrCreateActiveCycle, getCycleJourney } from "@/lib/loyalty-engine";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: { card: true },
    });
    if (!customer) return fail("NOT_FOUND", 404);

    const cycle = await getOrCreateActiveCycle(customer.id);
    const journey = await getCycleJourney(cycle.id);

    const allCycles = await prisma.loyaltyCycle.findMany({
      where: { customerId: customer.id },
      orderBy: { cycleNumber: "desc" },
      include: { purchases: true },
    });

    return ok({
      customer: {
        id: customer.id,
        name: customer.name,
        mobileNumber: customer.mobileNumber,
        cardNumber: customer.card?.cardNumber ?? null,
        cardStatus: customer.card?.status ?? null,
        isActive: customer.isActive,
        registeredAt: customer.createdAt,
      },
      currentCycle: { id: cycle.id, cycleNumber: cycle.cycleNumber, status: cycle.status },
      journey,
      cycles: allCycles.map((c) => ({
        cycleNumber: c.cycleNumber,
        status: c.status,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
        purchaseCount: c.purchases.length,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
