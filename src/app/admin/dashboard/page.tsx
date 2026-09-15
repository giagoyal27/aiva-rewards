"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/ui";

type Stats = {
  totalCustomers: number;
  activeMembers: number;
  pendingRequests: number;
  totalCompletedPurchases: number;
  rewardsUnlocked: number;
  rewardsRedeemed: number;
  completedCycles: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Stats>("/api/admin/dashboard-stats")
      .then(setStats)
      .catch((err) => {
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
          router.push("/admin/login");
          return;
        }
        setError("Couldn't load dashboard statistics.");
      });
  }, [router]);

  const cards = stats
    ? [
        { label: "Total Customers", value: stats.totalCustomers },
        { label: "Active Members", value: stats.activeMembers },
        { label: "Pending Purchase Requests", value: stats.pendingRequests },
        { label: "Total Completed Purchases", value: stats.totalCompletedPurchases },
        { label: "Rewards Unlocked", value: stats.rewardsUnlocked },
        { label: "Rewards Redeemed", value: stats.rewardsRedeemed },
        { label: "Completed Loyalty Cycles", value: stats.completedCycles },
      ]
    : [];

  return (
    <AdminShell>
      <h1 className="font-display text-3xl mb-6">Overview</h1>
      {error && <StatusBanner kind="error">{error}</StatusBanner>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="aiva-card">
            <p className="text-xs text-aiva-muted mb-2">{c.label}</p>
            <p className="text-3xl font-display">{c.value}</p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
