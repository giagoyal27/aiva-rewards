import { prisma } from "./db";
import { getAdminSession } from "./auth";

/** Resolves + validates the current admin session, or returns null. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) return null;
  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin || !admin.isActive) return null;
  return admin;
}
