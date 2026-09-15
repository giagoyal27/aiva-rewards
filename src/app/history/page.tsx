"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { CustomerMeResponse } from "@/lib/types";
import { CustomerNav } from "@/components/customer-nav";
import { StatusBanner } from "@/components/ui";

export default function HistoryPage() {
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
        setError("Couldn't load your purchase history.");
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

  return (
    <main className="min-h-screen bg-aiva-bg pb-28">
      <div className="max-w-md mx-auto px-5 pt-10">
        <h1 className="font-display text-3xl mb-6">Purchase History</h1>

        {error && <StatusBanner kind="error">{error}</StatusBanner>}

        {data && (
          <div className="space-y-3">
            {data.journey.steps.map((step) => (
              <div key={step.purchaseNumber} className="aiva-card flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">Purchase #{step.purchaseNumber}</p>
                  <p className="text-xs text-aiva-muted mt-0.5">
                    {step.status === "COMPLETED" && step.completedAt
                      ? new Date(step.completedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : step.status === "PENDING"
                      ? "Pending verification"
                      : "Not completed"}
                  </p>
                </div>
                <span
                  className={`aiva-pill ${
                    step.status === "COMPLETED"
                      ? "bg-aiva-ink text-white"
                      : step.status === "PENDING"
                      ? "bg-aiva-blush text-aiva-ink"
                      : "bg-aiva-bg border border-aiva-line text-aiva-muted"
                  }`}
                >
                  {step.status === "COMPLETED" ? "Completed" : step.status === "PENDING" ? "Pending" : "Not completed"}
                </span>
              </div>
            ))}

            {data.history.length > 0 && (
              <div className="pt-4">
                <p className="text-xs uppercase tracking-wide text-aiva-muted mb-2">Previous Cycles</p>
                <p className="text-sm text-aiva-muted">
                  You are currently on cycle #{data.cycle.cycleNumber}.{" "}
                  {data.cycle.cycleNumber > 1 ? "Earlier cycles remain saved in your account." : ""}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <CustomerNav />
    </main>
  );
}
