import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_REWARD_STRUCTURE } from "../src/lib/rewards";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding AIVA Rewards database…");

  // ---- Reward rules (the fixed default structure) ----
  for (const rule of DEFAULT_REWARD_STRUCTURE) {
    await prisma.rewardRule.upsert({
      where: { purchaseNumber: rule.purchaseNumber },
      update: { type: rule.type, displayLabel: rule.displayLabel, value: rule.value ?? undefined },
      create: {
        purchaseNumber: rule.purchaseNumber,
        type: rule.type,
        displayLabel: rule.displayLabel,
        value: rule.value ?? undefined,
      },
    });
  }
  console.log("✓ Reward rules seeded (1-10, default AIVA structure)");

  // ---- System settings ----
  await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      brandName: "AIVA",
      instagramUrl: "https://instagram.com/aivasilver",
      facebookUrl: "",
      googleReviewUrl: "",
    },
  });
  console.log("✓ System settings seeded");

  // ---- Dev admin account ----
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@aiva.test";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "AIVA Admin",
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✓ Admin account ready → ${adminEmail} / (see SEED_ADMIN_PASSWORD in your .env)`);

  // ---- Demo cards ----
  const demoCardNumber = "AIVA-00001";
  const spareCardNumber = "AIVA-00002";

  const demoCard = await prisma.loyaltyCard.upsert({
    where: { cardNumber: demoCardNumber },
    update: {},
    create: { cardNumber: demoCardNumber, status: "UNASSIGNED" },
  });
  await prisma.loyaltyCard.upsert({
    where: { cardNumber: spareCardNumber },
    update: {},
    create: { cardNumber: spareCardNumber, status: "UNASSIGNED" },
  });
  console.log(`✓ Demo cards ${demoCardNumber} and ${spareCardNumber} created`);

  // ---- Demo customer with some purchase history ----
  const demoMobile = "+919999900001"; // clearly fake/test number
  let demoCustomer = await prisma.customer.findUnique({ where: { mobileNumber: demoMobile } });

  if (!demoCustomer) {
    demoCustomer = await prisma.customer.create({
      data: { name: "Demo Customer", mobileNumber: demoMobile },
    });
    await prisma.loyaltyCard.update({
      where: { id: demoCard.id },
      data: { customerId: demoCustomer.id, status: "ACTIVE", assignedAt: new Date() },
    });
    console.log(`✓ Demo customer created → mobile ${demoMobile}, card ${demoCardNumber}`);

    const cycle = await prisma.loyaltyCycle.create({
      data: { customerId: demoCustomer.id, cycleNumber: 1, status: "ACTIVE" },
    });

    // Simulate 2 completed (approved) purchases so the dashboard has something to show.
    for (let purchaseNumber = 1; purchaseNumber <= 2; purchaseNumber++) {
      const purchase = await prisma.purchase.create({
        data: {
          customerId: demoCustomer.id,
          cycleId: cycle.id,
          purchaseNumber,
          source: "ADMIN_MANUAL",
          notes: "Seed data",
        },
      });
      const rule = DEFAULT_REWARD_STRUCTURE.find((r) => r.purchaseNumber === purchaseNumber)!;
      await prisma.rewardRedemption.create({
        data: {
          purchaseId: purchase.id,
          cycleId: cycle.id,
          purchaseNumber,
          type: rule.type,
          displayLabel: rule.displayLabel,
          value: rule.value ?? undefined,
          status: "UNLOCKED",
        },
      });
    }
    console.log("✓ Demo customer seeded with 2/10 completed purchases");

    // One pending purchase request awaiting admin approval, to demo that flow immediately.
    await prisma.purchaseRequest.create({
      data: { customerId: demoCustomer.id, cycleId: cycle.id, purchaseNumber: 3, status: "PENDING" },
    });
    console.log("✓ Demo customer has one PENDING purchase request (#3) for you to approve/reject");
  } else {
    console.log("✓ Demo customer already exists — skipping demo data creation");
  }

  console.log("\nSeed complete. Login details:");
  console.log(`  Customer  → mobile: ${demoMobile}, card: ${demoCardNumber} (log in directly, no code needed)`);
  console.log(`  Admin     → email: ${adminEmail}, password: from SEED_ADMIN_PASSWORD in your .env`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
