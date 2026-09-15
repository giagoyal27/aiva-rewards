import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { mobileNumber: { contains: q } },
              { card: { cardNumber: { contains: q.toUpperCase() } } },
            ],
          }
        : undefined,
      include: { card: true, cycles: { orderBy: { cycleNumber: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return ok(
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        mobileNumber: c.mobileNumber,
        cardNumber: c.card?.cardNumber ?? null,
        isActive: c.isActive,
        currentCycleNumber: c.cycles[0]?.cycleNumber ?? 0,
        registeredAt: c.createdAt,
      }))
    );
  } catch (err) {
    return handleApiError(err);
  }
}
