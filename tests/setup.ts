import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { beforeAll, beforeEach, afterAll } from "vitest";

const TEST_DB_PATH = path.resolve(__dirname, "./test.db");
process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
process.env.AUTH_SECRET = "test-secret-key-not-for-production-use-only";

// Fresh schema for the whole test run.
beforeAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  execSync("npx prisma db push --skip-generate --force-reset", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
  });
});

// Import after DATABASE_URL is set so PrismaClient connects to the test DB.
import { prisma } from "../src/lib/db";
import { DEFAULT_REWARD_STRUCTURE } from "../src/lib/rewards";

// Reset all data + reseed reward rules before every single test for isolation.
beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.purchaseRequest.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.loyaltyCycle.deleteMany();
  await prisma.loyaltyCard.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.rewardRule.deleteMany();
  await prisma.systemSettings.deleteMany();

  for (const rule of DEFAULT_REWARD_STRUCTURE) {
    await prisma.rewardRule.create({
      data: {
        purchaseNumber: rule.purchaseNumber,
        type: rule.type,
        displayLabel: rule.displayLabel,
        value: rule.value ?? undefined,
      },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
