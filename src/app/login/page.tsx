"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AivaWordmark, LoadingButton, StatusBanner } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ mobileNumber, cardNumber }),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again ♡");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-aiva-bg">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-10">
          <AivaWordmark className="justify-center mb-2" />
          <p className="text-aiva-muted text-sm">925 Sterling Silver Jewellery</p>
          <h1 className="font-display text-3xl mt-6 mb-1">Welcome back ♡</h1>
          <p className="text-aiva-muted text-sm">Log in to your AIVA Rewards account</p>
        </div>

        <form onSubmit={handleSubmit} className="aiva-card space-y-5">
          {error && <StatusBanner kind="error">{error}</StatusBanner>}

          <div>
            <label className="aiva-label" htmlFor="mobile">
              Mobile Number
            </label>
            <input
              id="mobile"
              type="tel"
              required
              inputMode="numeric"
              placeholder="98765 43210"
              className="aiva-input"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="aiva-label" htmlFor="card">
              Card Number
            </label>
            <input
              id="card"
              required
              placeholder="AIVA-00427"
              className="aiva-input uppercase"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
            />
          </div>

          <LoadingButton type="submit" loading={loading}>
            Log In
          </LoadingButton>
        </form>

        <p className="text-center text-sm text-aiva-muted mt-6">
          New to AIVA?{" "}
          <Link href="/register" className="text-aiva-ink font-medium underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
