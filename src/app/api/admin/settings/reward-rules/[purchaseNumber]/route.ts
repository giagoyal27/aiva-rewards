import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z.object({
  type: z.enum(["DISCOUNT_PERCENTAGE", "PHYSICAL_GIFT", "SURPRISE", "NO_REWARD"]),
  displayLabel: z.string().trim().min(1).max(80),
  value: z.number().int().min(0).max(100).nullable().optional(),
});

export async function PUT(req: Request, { params }: { params: { purchaseNumber: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const purchaseNumber = Number(params.purchaseNumber);
    if (!Number.isInteger(purchaseNumber) || purchaseNumber < 1 || purchaseNumber > 10) {
      return fail("VALIDATION_ERROR", 400, "Purchase position must be between 1 and 10.");
    }

    const body = bodySchema.parse(await req.json());

    const updated = await prisma.rewardRule.update({
      where: { purchaseNumber },
      data: { type: body.type, displayLabel: body.displayLabel, value: body.value ?? null },
    });

    await writeAuditLog({
      action: "SETTINGS_CHANGED",
      adminId: admin.id,
      entityType: "RewardRule",
      entityId: updated.id,
      metadata: { purchaseNumber, ...body },
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
