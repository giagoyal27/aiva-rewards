import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const [
      totalCustomers,
      activeMembers,
      pendingRequests,
      totalCompletedPurchases,
      rewardsUnlocked,
      rewardsRedeemed,
      completedCycles,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.purchaseRequest.count({ where: { status: "PENDING" } }),
      prisma.purchase.count(),
      prisma.rewardRedemption.count(),
      prisma.rewardRedemption.count({ where: { status: "REDEEMED" } }),
      prisma.loyaltyCycle.count({ where: { status: "COMPLETED" } }),
    ]);

    return ok({
      totalCustomers,
      activeMembers,
      pendingRequests,
      totalCompletedPurchases,
      rewardsUnlocked,
      rewardsRedeemed,
      completedCycles,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
