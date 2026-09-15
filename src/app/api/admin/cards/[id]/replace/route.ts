import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import { cardNumberSchema } from "@/lib/validation";
import { replaceLostCard } from "@/lib/cards";

const bodySchema = z.object({
  newCardNumber: cardNumberSchema,
  reason: z.string().trim().max(300).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const body = bodySchema.parse(await req.json());
    const result = await replaceLostCard(params.id, body.newCardNumber, admin.id, body.reason);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
