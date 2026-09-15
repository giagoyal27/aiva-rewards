import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { createCardSchema } from "@/lib/validation";
import { createCard } from "@/lib/cards";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const q = req.nextUrl.searchParams.get("q")?.trim().toUpperCase() ?? "";

    const cards = await prisma.loyaltyCard.findMany({
      where: q ? { cardNumber: { contains: q } } : undefined,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return ok(
      cards.map((c) => ({
        id: c.id,
        cardNumber: c.cardNumber,
        status: c.status,
        customerName: c.customer?.name ?? null,
        customerId: c.customerId,
        issuedAt: c.issuedAt,
        assignedAt: c.assignedAt,
      }))
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const body = createCardSchema.parse(await req.json());
    const card = await createCard(body.cardNumber, admin.id);
    return ok(card, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
