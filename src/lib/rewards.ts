import { prisma } from "./db";

export type RewardType = "DISCOUNT_PERCENTAGE" | "PHYSICAL_GIFT" | "SURPRISE" | "NO_REWARD";

/**
 * DEFAULT AIVA REWARD STRUCTURE — DO NOT CHANGE THESE VALUES.
 *
 * This is the exact, fixed default reward sequence for every new
 * loyalty cycle. It is stored in the `RewardRule` table (seeded by
 * prisma/seed.ts) so it can be viewed/edited from Admin > Settings,
 * but these constants remain the canonical fallback/reset values.
 */
export const DEFAULT_REWARD_STRUCTURE: Array<{
  purchaseNumber: number;
  type: RewardType;
  displayLabel: string;
  value: number | null;
}> = [
  { purchaseNumber: 1, type: "DISCOUNT_PERCENTAGE", displayLabel: "10% OFF", value: 10 },
  { purchaseNumber: 2, type: "NO_REWARD", displayLabel: "Keep Going ♡", value: null },
  { purchaseNumber: 3, type: "DISCOUNT_PERCENTAGE", displayLabel: "12% OFF", value: 12 },
  { purchaseNumber: 4, type: "NO_REWARD", displayLabel: "Keep Going ♡", value: null },
  { purchaseNumber: 5, type: "PHYSICAL_GIFT", displayLabel: "Free Jewellery Organizer", value: null },
  { purchaseNumber: 6, type: "NO_REWARD", displayLabel: "Keep Going ♡", value: null },
  { purchaseNumber: 7, type: "DISCOUNT_PERCENTAGE", displayLabel: "10% OFF", value: 10 },
  { purchaseNumber: 8, type: "NO_REWARD", displayLabel: "Keep Going ♡", value: null },
  { purchaseNumber: 9, type: "DISCOUNT_PERCENTAGE", displayLabel: "15% OFF", value: 15 },
  { purchaseNumber: 10, type: "SURPRISE", displayLabel: "AIVA Surprise ✨", value: null },
];

export const CYCLE_LENGTH = 10;

/** Fetch current reward rules (1-10), ordered. Falls back to defaults if unseeded. */
export async function getRewardRules() {
  const rules = await prisma.rewardRule.findMany({ orderBy: { purchaseNumber: "asc" } });
  if (rules.length === CYCLE_LENGTH) return rules;
  // Defensive fallback — should not happen once seeded.
  return DEFAULT_REWARD_STRUCTURE.map((r) => ({ id: `default-${r.purchaseNumber}`, updatedAt: new Date(), ...r }));
}

export async function getRewardRuleFor(purchaseNumber: number) {
  const rules = await getRewardRules();
  const rule = rules.find((r) => r.purchaseNumber === purchaseNumber);
  if (!rule) throw new Error(`No reward rule configured for purchase #${purchaseNumber}`);
  return rule;
}
