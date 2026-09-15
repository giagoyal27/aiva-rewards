import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { approvePurchaseRequest } from "@/lib/loyalty-engine";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const updated = await approvePurchaseRequest(params.id, admin.id);
    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
