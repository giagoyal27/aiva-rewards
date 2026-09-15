import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { replaceCardSchema } from "@/lib/validation";
import { deactivateCard } from "@/lib/cards";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const body = replaceCardSchema.parse(await req.json().catch(() => ({})));
    const card = await deactivateCard(params.id, admin.id, body.reason);
    return ok(card);
  } catch (err) {
    return handleApiError(err);
  }
}
