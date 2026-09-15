"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AdminShell } from "@/components/admin-shell";
import { LoadingButton, StatusBanner } from "@/components/ui";

type Redemption = {
  id: string;
  purchaseNumber: number;
  displayLabel: string;
  type: string;
  status: "UNLOCKED" | "REDEEMED";
  customerName: string;
  cardNumber: string | null;
  unlockedAt: string;
  redeemedAt: string | null;
  redeemedByName: string | null;
};

export default function AdminRewardsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"" | "UNLOCKED" | "REDEEMED">("");
  const [rewards, setRewards] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(status: string) {
    setLoading(true);
    try {
      const data = await apiFetch<Redemption[]>(`/api/admin/rewards${status ? `?status=${status}` : ""}`);
      setRewards(data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
        router.push("/admin/login");
        return;
      }
      setError("Couldn't load rewards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleRedeem(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/rewards/${id}/redeem`, { method: "POST" });
      await load(filter);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't redeem this reward.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="font-display text-3xl mb-6">Rewards</h1>

      <div className="mb-5 flex gap-2">
        {(["", "UNLOCKED", "REDEEMED"] as const).map((f) => (
          <button
            key={f || "all"}
            onClick={() => setFilter(f)}
            className={`aiva-pill border ${
              filter === f ? "bg-aiva-ink text-white border-aiva-ink" : "border-aiva-line text-aiva-muted"
            }`}
          >
            {f === "" ? "All" : f === "UNLOCKED" ? "Unlocked" : "Redeemed"}
          </button>
        ))}
      </div>

      {error && <StatusBanner kind="error">{error}</StatusBanner>}

      {loading ? (
        <p className="text-sm text-aiva-muted">Loading…</p>
      ) : rewards.length === 0 ? (
        <div className="aiva-card text-center text-sm text-aiva-muted">No rewards found.</div>
      ) : (
        <div className="space-y-3">
          {rewards.map((r) => (
            <div key={r.id} className="aiva-card flex items-center justify-between">
              <div>
                <p className="font-medium">{r.displayLabel}</p>
                <p className="text-sm text-aiva-muted">
                  {r.customerName} · Card {r.cardNumber ?? "—"} · Purchase #{r.purchaseNumber}
                </p>
                {r.status === "REDEEMED" && r.redeemedAt && (
                  <p className="text-xs text-aiva-muted mt-1">
                    Redeemed {new Date(r.redeemedAt).toLocaleDateString("en-IN")} by {r.redeemedByName ?? "—"}
                  </p>
                )}
              </div>
              {r.status === "REDEEMED" ? (
                <span className="aiva-pill bg-aiva-line text-aiva-muted">Redeemed</span>
              ) : (
                <LoadingButton
                  variant="secondary"
                  className="!w-auto px-5"
                  loading={busyId === r.id}
                  onClick={() => handleRedeem(r.id)}
                >
                  Mark as Redeemed
                </LoadingButton>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
