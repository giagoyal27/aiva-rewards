import { prisma } from "./db";

export type AuditAction =
  | "ADMIN_LOGIN"
  | "CUSTOMER_LOGIN"
  | "CUSTOMER_REGISTERED"
  | "CARD_CREATED"
  | "CARD_ASSIGNED"
  | "CARD_DEACTIVATED"
  | "CARD_REPLACED"
  | "PURCHASE_REQUEST_CREATED"
  | "PURCHASE_APPROVED"
  | "PURCHASE_REJECTED"
  | "PURCHASE_ADDED_MANUAL"
  | "REWARD_REDEEMED"
  | "CYCLE_COMPLETED"
  | "CYCLE_STARTED"
  | "SETTINGS_CHANGED";

export async function writeAuditLog(entry: {
  action: AuditAction;
  adminId?: string;
  customerId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      action: entry.action,
      adminId: entry.adminId,
      customerId: entry.customerId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
    },
  });
}
