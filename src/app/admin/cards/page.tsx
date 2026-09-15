"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AdminShell } from "@/components/admin-shell";
import { LoadingButton, StatusBanner } from "@/components/ui";

type CardRow = {
  id: string;
  cardNumber: string;
  status: string;
  customerName: string | null;
  customerId: string | null;
  issuedAt: string;
  assignedAt: string | null;
};

export default function AdminCardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<CardRow[]>("/api/admin/cards");
      setCards(data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
        router.push("/admin/login");
        return;
      }
      setError("Couldn't load cards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/api/admin/cards", { method: "POST", body: JSON.stringify({ cardNumber: newCardNumber }) });
      setSuccess(`Card ${newCardNumber.toUpperCase()} created.`);
      setNewCardNumber("");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't create card.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!window.confirm("Deactivate this card? The customer's account and history will remain intact.")) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/cards/${id}/deactivate`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't deactivate card.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReplace(id: string) {
    const newNumber = window.prompt("Enter the new card number (e.g. AIVA-00512):");
    if (!newNumber) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/cards/${id}/replace`, {
        method: "POST",
        body: JSON.stringify({ newCardNumber: newNumber, reason: "Lost card reported" }),
      });
      setSuccess("Card replaced. Customer history preserved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't replace card.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="font-display text-3xl mb-6">Loyalty Cards</h1>

      <form onSubmit={handleCreate} className="aiva-card mb-6 flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="aiva-label">Create New Card</label>
          <input
            className="aiva-input uppercase"
            placeholder="AIVA-00512"
            value={newCardNumber}
            onChange={(e) => setNewCardNumber(e.target.value)}
            required
          />
        </div>
        <LoadingButton type="submit" loading={creating} className="!w-auto px-6">
          + Create Card
        </LoadingButton>
      </form>

      {error && <div className="mb-4"><StatusBanner kind="error">{error}</StatusBanner></div>}
      {success && <div className="mb-4"><StatusBanner kind="success">{success}</StatusBanner></div>}

      <div className="aiva-card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-aiva-bg text-aiva-muted text-left">
            <tr>
              <th className="px-5 py-3 font-medium">Card Number</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Assigned To</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-aiva-muted">Loading…</td>
              </tr>
            ) : (
              cards.map((c) => (
                <tr key={c.id} className="border-t border-aiva-line">
                  <td className="px-5 py-3 font-medium">{c.cardNumber}</td>
                  <td className="px-5 py-3">
                    <span className="aiva-pill bg-aiva-bg border border-aiva-line text-aiva-muted">{c.status}</span>
                  </td>
                  <td className="px-5 py-3">{c.customerName ?? "—"}</td>
                  <td className="px-5 py-3">
                    {c.status === "ACTIVE" && (
                      <div className="flex gap-2">
                        <button
                          className="text-xs underline text-aiva-muted disabled:opacity-40"
                          disabled={busyId === c.id}
                          onClick={() => handleReplace(c.id)}
                        >
                          Replace (lost)
                        </button>
                        <button
                          className="text-xs underline text-aiva-muted disabled:opacity-40"
                          disabled={busyId === c.id}
                          onClick={() => handleDeactivate(c.id)}
                        >
                          Deactivate
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
