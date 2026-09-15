export type JourneyStep = {
  purchaseNumber: number;
  status: "COMPLETED" | "PENDING" | "NOT_COMPLETED";
  reward: {
    type: "DISCOUNT_PERCENTAGE" | "PHYSICAL_GIFT" | "SURPRISE" | "NO_REWARD";
    displayLabel: string;
    value: number | null;
  };
  redemptionStatus: "UNLOCKED" | "REDEEMED" | null;
  redemptionId: string | null;
  completedAt: string | null;
};

export type CustomerMeResponse = {
  customer: {
    id: string;
    name: string;
    mobileNumber: string;
    cardNumber: string | null;
    registeredAt: string;
  };
  cycle: { id: string; cycleNumber: number; status: "ACTIVE" | "COMPLETED" };
  journey: {
    steps: JourneyStep[];
    completedCount: number;
    hasPendingRequest: boolean;
    pendingPurchaseNumber: number | null;
  };
  history: Array<{ purchaseNumber: number; cycleNumber: number; createdAt: string; source: string }>;
  social: { instagramUrl: string; facebookUrl: string; googleReviewUrl: string; brandName: string };
};
