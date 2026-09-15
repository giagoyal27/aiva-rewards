import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { ok, fail, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return fail("UNAUTHORIZED", 401);

    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
    const pageSize = 50;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { admin: true, customer: true },
      }),
      prisma.auditLog.count(),
    ]);

    return ok({
      page,
      pageSize,
      total,
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        adminName: l.admin?.name ?? null,
        customerName: l.customer?.name ?? null,
        entityType: l.entityType,
        entityId: l.entityId,
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
