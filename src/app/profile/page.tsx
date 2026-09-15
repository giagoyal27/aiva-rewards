"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { CustomerMeResponse } from "@/lib/types";
import { CustomerNav } from "@/components/customer-nav";
import { LoadingButton, StatusBanner } from "@/components/ui";

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<CustomerMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CustomerMeResponse>("/api/customer/me")
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
          router.push("/login");
          return;
        }
        setError("Couldn't load your profile.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  }

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
        <h1 className="font-display text-3xl mb-6">Your Profile</h1>

        {error && <StatusBanner kind="error">{error}</StatusBanner>}

        {data && (
          <div className="aiva-card space-y-4 mb-6">
            <ProfileRow label="Name" value={data.customer.name} />
            <ProfileRow label="Mobile Number" value={data.customer.mobileNumber} />
            <ProfileRow label="Card Number" value={data.customer.cardNumber ?? "—"} />
            <ProfileRow
              label="Member Since"
              value={new Date(data.customer.registeredAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
            <ProfileRow label="Current Cycle" value={`Cycle ${data.cycle.cycleNumber}`} />
          </div>
        )}

        <LoadingButton onClick={handleLogout} loading={loggingOut} variant="secondary">
          Log Out
        </LoadingButton>
      </div>
      <CustomerNav />
    </main>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-aiva-line pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-aiva-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
