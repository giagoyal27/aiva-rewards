"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/ui";

type CustomerRow = {
  id: string;
  name: string;
  mobileNumber: string;
  cardNumber: string | null;
  isActive: boolean;
  currentCycleNumber: number;
  registeredAt: string;
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(q: string) {
    setLoading(true);
    try {
      const data = await apiFetch<CustomerRow[]>(`/api/admin/customers?q=${encodeURIComponent(q)}`);
      setCustomers(data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
        router.push("/admin/login");
        return;
      }
      setError("Couldn't load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminShell>
      <h1 className="font-display text-3xl mb-6">Customers</h1>

      <div className="mb-5 flex gap-2">
        <input
          className="aiva-input max-w-sm"
          placeholder="Search by name, mobile, or card number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(query)}
        />
        <button onClick={() => load(query)} className="aiva-btn-primary !w-auto px-6">
          Search
        </button>
      </div>

      {error && <StatusBanner kind="error">{error}</StatusBanner>}

      <div className="aiva-card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-aiva-bg text-aiva-muted text-left">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Mobile</th>
              <th className="px-5 py-3 font-medium">Card</th>
              <th className="px-5 py-3 font-medium">Cycle</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-aiva-muted">
                  Loading…
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-aiva-muted">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-t border-aiva-line hover:bg-aiva-bg/60">
                  <td className="px-5 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="font-medium underline underline-offset-2">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{c.mobileNumber}</td>
                  <td className="px-5 py-3">{c.cardNumber ?? "—"}</td>
                  <td className="px-5 py-3">Cycle {c.currentCycleNumber}</td>
                  <td className="px-5 py-3">
                    <span className={`aiva-pill ${c.isActive ? "bg-aiva-blush text-aiva-ink" : "bg-aiva-line text-aiva-muted"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
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
