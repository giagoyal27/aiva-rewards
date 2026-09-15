"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AivaWordmark, LoadingButton, StatusBanner } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, mobileNumber, cardNumber }),
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
          <h1 className="font-display text-3xl mt-6 mb-1">Join AIVA Rewards ♡</h1>
          <p className="text-aiva-muted text-sm">Link your loyalty card to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="aiva-card space-y-5">
          {error && <StatusBanner kind="error">{error}</StatusBanner>}

          <div>
            <label className="aiva-label" htmlFor="name">
              Your Name
            </label>
            <input
              id="name"
              required
              placeholder="Gia Sharma"
              className="aiva-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
            <p className="text-xs text-aiva-muted mt-1.5">Found on the back of your physical AIVA card.</p>
          </div>

          <LoadingButton type="submit" loading={loading}>
            Create Account
          </LoadingButton>
        </form>

        <p className="text-center text-sm text-aiva-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-aiva-ink font-medium underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
