"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/ui";

type LogEntry = {
  id: string;
  action: string;
  adminName: string | null;
  customerName: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ logs: LogEntry[]; total: number; pageSize: number }>(`/api/admin/audit-logs?page=${page}`)
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
          router.push("/admin/login");
          return;
        }
        setError("Couldn't load audit logs.");
      })
      .finally(() => setLoading(false));
  }, [page, router]);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminShell>
      <h1 className="font-display text-3xl mb-6">Audit Logs</h1>
      {error && <StatusBanner kind="error">{error}</StatusBanner>}

      <div className="aiva-card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-aiva-bg text-aiva-muted text-left">
            <tr>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Actor</th>
              <th className="px-5 py-3 font-medium">Entity</th>
              <th className="px-5 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-aiva-muted">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-aiva-muted">No activity yet.</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="border-t border-aiva-line align-top">
                  <td className="px-5 py-3 font-medium">{l.action.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3">{l.adminName ?? l.customerName ?? "—"}</td>
                  <td className="px-5 py-3 text-aiva-muted">
                    {l.entityType ?? "—"} {l.entityId ? `(${l.entityId.slice(0, 8)}…)` : ""}
                  </td>
                  <td className="px-5 py-3 text-aiva-muted whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-3 mt-4">
          <button
            className="text-sm underline disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-aiva-muted">
            Page {page} of {totalPages}
          </span>
          <button
            className="text-sm underline disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </AdminShell>
  );
}
