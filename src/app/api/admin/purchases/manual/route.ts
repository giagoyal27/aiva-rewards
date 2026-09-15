import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { addManualPurchase } from "@/lib/loyalty-engine";
import { manualPurchaseSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const body = manualPurchaseSchema.parse(await req.json());
    const purchase = await addManualPurchase({
      customerId: body.customerId,
      adminId: admin.id,
      orderReference: body.orderReference,
      notes: body.notes,
    });
    return ok(purchase);
  } catch (err) {
    return handleApiError(err);
  }
}
