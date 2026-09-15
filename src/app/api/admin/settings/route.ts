import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { settingsSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { getRewardRules } from "@/lib/rewards";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const settings = await prisma.systemSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    const rewardRules = await getRewardRules();

    return ok({ settings, rewardRules });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const body = settingsSchema.parse(await req.json());
    const updated = await prisma.systemSettings.upsert({
      where: { id: "singleton" },
      update: body,
      create: { id: "singleton", ...body },
    });

    await writeAuditLog({ action: "SETTINGS_CHANGED", adminId: admin.id, metadata: body });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
