"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { CustomerMeResponse } from "@/lib/types";
import { CustomerNav } from "@/components/customer-nav";
import { StatusBanner } from "@/components/ui";

export default function RewardsPage() {
  const router = useRouter();
  const [data, setData] = useState<CustomerMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CustomerMeResponse>("/api/customer/me")
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
          router.push("/login");
          return;
        }
        setError("Couldn't load your rewards.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-aiva-bg">
        <div className="h-8 w-8 rounded-full border-2 border-aiva-blushDark border-t-transparent animate-spin" />
      </main>
    );
  }

  const rewardSteps = data?.journey.steps.filter((s) => s.reward.type !== "NO_REWARD") ?? [];
  const unlocked = rewardSteps.filter((s) => s.status === "COMPLETED");
  const locked = rewardSteps.filter((s) => s.status !== "COMPLETED");

  return (
    <main className="min-h-screen bg-aiva-bg pb-28">
      <div className="max-w-md mx-auto px-5 pt-10">
        <h1 className="font-display text-3xl mb-6">Your Rewards</h1>

        {error && <StatusBanner kind="error">{error}</StatusBanner>}

        {unlocked.length > 0 && (
          <div className="mb-8">
            <p className="text-xs uppercase tracking-wide text-aiva-muted mb-3">Unlocked</p>
            <div className="space-y-3">
              {unlocked.map((s) => (
                <div key={s.purchaseNumber} className="aiva-card bg-aiva-blush/30">
                  <p className="text-xs text-aiva-muted mb-1">Unlocked on Purchase #{s.purchaseNumber}</p>
                  <p className="font-display text-2xl mb-2">{s.reward.displayLabel}</p>
                  <span
                    className={`aiva-pill ${
                      s.redemptionStatus === "REDEEMED" ? "bg-aiva-line text-aiva-muted" : "bg-aiva-ink text-white"
                    }`}
                  >
                    {s.redemptionStatus === "REDEEMED" ? "Redeemed" : "Ready to use in-store"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {locked.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-aiva-muted mb-3">Locked</p>
            <div className="space-y-3">
              {locked.map((s) => (
                <div key={s.purchaseNumber} className="aiva-card opacity-60">
                  <p className="text-xs text-aiva-muted mb-1">Unlocks on Purchase #{s.purchaseNumber}</p>
                  <p className="font-display text-xl">{s.reward.displayLabel}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <CustomerNav />
    </main>
  );
}
