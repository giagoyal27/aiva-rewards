import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const statusFilter = req.nextUrl.searchParams.get("status"); // UNLOCKED | REDEEMED | null (all)

    const redemptions = await prisma.rewardRedemption.findMany({
      where: statusFilter ? { status: statusFilter as "UNLOCKED" | "REDEEMED" } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        purchase: { include: { customer: { include: { card: true } } } },
        redeemedBy: true,
      },
    });

    return ok(
      redemptions
        .filter((r) => r.type !== "NO_REWARD")
        .map((r) => ({
          id: r.id,
          purchaseNumber: r.purchaseNumber,
          displayLabel: r.displayLabel,
          type: r.type,
          status: r.status,
          customerName: r.purchase.customer.name,
          cardNumber: r.purchase.customer.card?.cardNumber ?? null,
          unlockedAt: r.createdAt,
          redeemedAt: r.redeemedAt,
          redeemedByName: r.redeemedBy?.name ?? null,
        }))
    );
  } catch (err) {
    return handleApiError(err);
  }
}
