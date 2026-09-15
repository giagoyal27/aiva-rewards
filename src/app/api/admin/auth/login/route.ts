import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminLoginSchema } from "@/lib/validation";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { verifyPassword, createAdminSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { consume } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = adminLoginSchema.parse(await req.json());

    const rl = consume(`admin-login:${body.email}`, 8, 15 * 60 * 1000);
    if (!rl.allowed) return fail("RATE_LIMITED", 429);

    const admin = await prisma.admin.findUnique({ where: { email: body.email } });
    if (!admin || !admin.isActive) {
      return fail("UNAUTHORIZED", 401, "Invalid email or password.");
    }

    const validPassword = await verifyPassword(body.password, admin.passwordHash);
    if (!validPassword) {
      return fail("UNAUTHORIZED", 401, "Invalid email or password.");
    }

    await createAdminSession(admin.id);
    await writeAuditLog({ action: "ADMIN_LOGIN", adminId: admin.id });

    return ok({ adminId: admin.id, name: admin.name, role: admin.role });
  } catch (err) {
    return handleApiError(err);
  }
}
