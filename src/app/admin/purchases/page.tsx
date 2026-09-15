"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AdminShell } from "@/components/admin-shell";
import { LoadingButton, StatusBanner } from "@/components/ui";

type PendingRequest = {
  id: string;
  purchaseNumber: number;
  createdAt: string;
  customer: { id: string; name: string; mobileNumber: string; cardNumber: string | null };
  currentCompletedPurchases: number;
};

export default function AdminPurchasesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<PendingRequest[]>("/api/admin/purchases/pending");
      setRequests(data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
        router.push("/admin/login");
        return;
      }
      setError("Couldn't load pending requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/purchases/${id}/approve`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't approve this request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Optional rejection reason:") ?? undefined;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/purchases/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't reject this request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="font-display text-3xl mb-6">Pending Purchase Requests</h1>
      {error && (
        <div className="mb-4">
          <StatusBanner kind="error">{error}</StatusBanner>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-aiva-muted">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="aiva-card text-center text-sm text-aiva-muted">No pending purchase requests right now.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="aiva-card flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-aiva-muted mb-1">
                  New Purchase Request · #{r.purchaseNumber}
                </p>
                <p className="font-medium">{r.customer.name}</p>
                <p className="text-sm text-aiva-muted">
                  Card: {r.customer.cardNumber ?? "—"} · {r.customer.mobileNumber}
                </p>
                <p className="text-xs text-aiva-muted mt-1">
                  Current completed purchases: {r.currentCompletedPurchases}
                </p>
              </div>
              <div className="flex gap-2">
                <LoadingButton
                  variant="secondary"
                  className="!w-auto px-5"
                  loading={busyId === r.id}
                  onClick={() => handleApprove(r.id)}
                >
                  Approve
                </LoadingButton>
                <button
                  className="rounded-full border border-aiva-line px-5 py-3.5 text-sm font-medium text-aiva-muted hover:bg-aiva-bg transition-colors disabled:opacity-40"
                  disabled={busyId === r.id}
                  onClick={() => handleReject(r.id)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
