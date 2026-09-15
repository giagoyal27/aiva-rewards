import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { rejectPurchaseRequest } from "@/lib/loyalty-engine";
import { rejectRequestSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const body = rejectRequestSchema.parse(await req.json().catch(() => ({})));
    const updated = await rejectPurchaseRequest(params.id, admin.id, body.reason);
    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
