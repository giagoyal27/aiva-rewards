"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AdminShell } from "@/components/admin-shell";
import { LoadingButton, StatusBanner, StepDot } from "@/components/ui";
import { JourneyStep } from "@/lib/types";

type CustomerDetail = {
  customer: {
    id: string;
    name: string;
    mobileNumber: string;
    cardNumber: string | null;
    cardStatus: string | null;
    isActive: boolean;
    registeredAt: string;
  };
  currentCycle: { id: string; cycleNumber: number; status: string };
  journey: { steps: JourneyStep[]; completedCount: number; hasPendingRequest: boolean };
  cycles: Array<{ cycleNumber: number; status: string; startedAt: string; completedAt: string | null; purchaseCount: number }>;
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingPurchase, setAddingPurchase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orderRef, setOrderRef] = useState("");

  async function load() {
    try {
      const res = await apiFetch<CustomerDetail>(`/api/admin/customers/${params.id}`);
      setData(res);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
        router.push("/admin/login");
        return;
      }
      setError("Couldn't load this customer.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleAddPurchase() {
    setAddingPurchase(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/api/admin/purchases/manual", {
        method: "POST",
        body: JSON.stringify({ customerId: params.id, orderReference: orderRef || undefined }),
      });
      setSuccess("Purchase added successfully.");
      setConfirmOpen(false);
      setOrderRef("");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't add purchase.");
    } finally {
      setAddingPurchase(false);
    }
  }

  if (loading) return <AdminShell><p className="text-aiva-muted text-sm">Loading…</p></AdminShell>;
  if (!data) return <AdminShell><StatusBanner kind="error">{error ?? "Not found."}</StatusBanner></AdminShell>;

  return (
    <AdminShell>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl">{data.customer.name}</h1>
          <p className="text-sm text-aiva-muted mt-1">
            {data.customer.mobileNumber} · Card {data.customer.cardNumber ?? "—"} · Cycle {data.currentCycle.cycleNumber}
          </p>
        </div>
        <button className="aiva-btn-primary !w-auto px-5" onClick={() => setConfirmOpen(true)}>
          + Add Purchase
        </button>
      </div>

      {error && <div className="mb-4"><StatusBanner kind="error">{error}</StatusBanner></div>}
      {success && <div className="mb-4"><StatusBanner kind="success">{success}</StatusBanner></div>}

      {confirmOpen && (
        <div className="aiva-card mb-6 bg-aiva-blush/20">
          <p className="font-medium mb-2">Confirm manual purchase for {data.customer.name}</p>
          <p className="text-sm text-aiva-muted mb-4">
            This will record purchase #{data.journey.completedCount + 1} and unlock the associated reward. This
            action is logged with your admin identity and cannot be silently undone.
          </p>
          <input
            className="aiva-input mb-3"
            placeholder="Order reference (optional)"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
          />
          <div className="flex gap-2">
            <LoadingButton loading={addingPurchase} className="!w-auto px-6" onClick={handleAddPurchase}>
              Confirm & Add Purchase
            </LoadingButton>
            <button
              className="rounded-full border border-aiva-line px-6 py-3.5 text-sm font-medium text-aiva-muted"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="aiva-card">
          <h2 className="font-display text-xl mb-4">Progress — {data.journey.completedCount} / 10</h2>
          <ol className="space-y-3">
            {data.journey.steps.map((s) => (
              <li key={s.purchaseNumber} className="flex items-center gap-3">
                <StepDot status={s.status} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Purchase {s.purchaseNumber}</p>
                  <p className="text-xs text-aiva-muted">{s.reward.displayLabel}</p>
                </div>
                {s.redemptionStatus && (
                  <span className={`aiva-pill ${s.redemptionStatus === "REDEEMED" ? "bg-aiva-line text-aiva-muted" : "bg-aiva-blush text-aiva-ink"}`}>
                    {s.redemptionStatus === "REDEEMED" ? "Redeemed" : "Unlocked"}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="aiva-card">
          <h2 className="font-display text-xl mb-4">Cycle History</h2>
          <div className="space-y-3">
            {data.cycles.map((c) => (
              <div key={c.cycleNumber} className="flex items-center justify-between border-b border-aiva-line pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">Cycle {c.cycleNumber}</p>
                  <p className="text-xs text-aiva-muted">
                    Started {new Date(c.startedAt).toLocaleDateString("en-IN")}
                    {c.completedAt ? ` · Completed ${new Date(c.completedAt).toLocaleDateString("en-IN")}` : ""}
                  </p>
                </div>
                <span className="aiva-pill bg-aiva-bg border border-aiva-line text-aiva-muted">
                  {c.purchaseCount} / 10
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
