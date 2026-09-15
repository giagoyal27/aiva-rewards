"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { LoadingButton, StatusBanner } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/admin/dashboard");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f7f6f4] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-2xl tracking-wide">AIVA</div>
          <p className="text-aiva-muted text-sm mt-1">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="aiva-card space-y-5">
          {error && <StatusBanner kind="error">{error}</StatusBanner>}

          <div>
            <label className="aiva-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="aiva-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="aiva-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="aiva-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <LoadingButton type="submit" loading={loading}>
            Log In
          </LoadingButton>
        </form>
      </div>
    </main>
  );
}
