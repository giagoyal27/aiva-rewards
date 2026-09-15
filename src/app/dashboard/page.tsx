"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { CustomerMeResponse } from "@/lib/types";
import { CustomerNav } from "@/components/customer-nav";
import { LoadingButton, StatusBanner, StepDot } from "@/components/ui";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<CustomerMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<CustomerMeResponse>("/api/customer/me");
      setData(res);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
        router.push("/login");
        return;
      }
      setError(err instanceof ApiRequestError ? err.message : "Couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePurchaseClick() {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/customer/purchase-request", { method: "POST" });
      setSuccess("Your purchase request has been submitted. AIVA is verifying your purchase ♡");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again ♡");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-aiva-bg">
        <div className="h-8 w-8 rounded-full border-2 border-aiva-blushDark border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-aiva-bg px-6">
        <StatusBanner kind="error">{error ?? "We couldn't load your account."}</StatusBanner>
      </main>
    );
  }

  const { customer, journey } = data;
  const nextStep = journey.steps.find((s) => s.status !== "COMPLETED");
  const firstName = customer.name.split(" ")[0];

  return (
    <main className="min-h-screen bg-aiva-bg pb-28">
      <div className="max-w-md mx-auto px-5 pt-10">
        <header className="mb-6 animate-fade-in-up">
          <p className="text-aiva-muted text-sm">Card {customer.cardNumber ?? "—"}</p>
          <h1 className="font-display text-3xl mt-1">Hi, {firstName} ♡</h1>
          <p className="text-aiva-muted text-sm mt-1">Welcome to AIVA Rewards</p>
        </header>

        {error && (
          <div className="mb-4">
            <StatusBanner kind="error">{error}</StatusBanner>
          </div>
        )}
        {success && (
          <div className="mb-4">
            <StatusBanner kind="success">{success}</StatusBanner>
          </div>
        )}

        <section className="aiva-card mb-5 animate-fade-in-up">
          <h2 className="font-display text-xl mb-4">Your AIVA Journey</h2>

          <ol className="space-y-3">
            {journey.steps.map((step) => (
              <li key={step.purchaseNumber} className="flex items-center gap-3">
                <StepDot status={step.status} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Purchase {step.purchaseNumber}</p>
                  <p className="text-xs text-aiva-muted">
                    {step.reward.type === "NO_REWARD" ? step.reward.displayLabel : `🎁 ${step.reward.displayLabel}`}
                  </p>
                </div>
                {step.status === "COMPLETED" && step.redemptionStatus === "REDEEMED" && (
                  <span className="aiva-pill bg-aiva-line text-aiva-muted">Redeemed</span>
                )}
                {step.status === "COMPLETED" && step.redemptionStatus === "UNLOCKED" && step.reward.type !== "NO_REWARD" && (
                  <span className="aiva-pill bg-aiva-blush text-aiva-ink">Unlocked</span>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-5 pt-5 border-t border-aiva-line text-center">
            <p className="font-display text-2xl">
              {journey.completedCount} / 10 <span className="text-base font-sans text-aiva-muted">Purchases Completed</span>
            </p>
          </div>
        </section>

        {nextStep && nextStep.reward.type !== "NO_REWARD" && (
          <section className="aiva-card mb-5 bg-aiva-blush/40 border-aiva-blushDark/30 animate-fade-in-up">
            <p className="text-xs uppercase tracking-wide text-aiva-muted mb-1">Next Reward</p>
            <p className="font-display text-2xl">{nextStep.reward.displayLabel}</p>
          </section>
        )}

        <section className="mb-8 animate-fade-in-up">
          {journey.hasPendingRequest ? (
            <div className="aiva-card text-center bg-aiva-bg">
              <p className="text-sm text-aiva-ink">Your purchase is being verified ♡</p>
              <p className="text-xs text-aiva-muted mt-1">
                Purchase #{journey.pendingPurchaseNumber} · pending verification
              </p>
            </div>
          ) : journey.completedCount >= 10 ? (
            <div className="aiva-card text-center bg-aiva-bg">
              <p className="text-sm">You've completed this journey! A new cycle will begin with your next purchase.</p>
            </div>
          ) : (
            <LoadingButton onClick={handlePurchaseClick} loading={submitting} variant="secondary">
              I MADE A PURCHASE ♡
            </LoadingButton>
          )}
        </section>

        <SocialSection social={data.social} />
      </div>

      <CustomerNav />
    </main>
  );
}

function SocialSection({ social }: { social: CustomerMeResponse["social"] }) {
  const links = [
    { label: "Instagram", url: social.instagramUrl },
    { label: "Facebook", url: social.facebookUrl },
    { label: "Google Reviews", url: social.googleReviewUrl },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <section className="aiva-card animate-fade-in-up">
      <h2 className="font-display text-lg mb-1">Stay Connected with {social.brandName} ♡</h2>
      <p className="text-xs text-aiva-muted mb-4">Love your AIVA? Leave us a Google Review ⭐</p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="aiva-pill bg-aiva-bg border border-aiva-line text-aiva-ink hover:bg-aiva-blush/40 transition-colors"
          >
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}
