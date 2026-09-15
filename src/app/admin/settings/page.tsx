"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { AdminShell } from "@/components/admin-shell";
import { LoadingButton, StatusBanner } from "@/components/ui";

type Settings = { brandName: string; instagramUrl: string; facebookUrl: string; googleReviewUrl: string };
type RewardRule = { purchaseNumber: number; type: string; displayLabel: string; value: number | null };

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ settings: Settings; rewardRules: RewardRule[] }>("/api/admin/settings")
      .then((data) => {
        setSettings(data.settings);
        setRules(data.rewardRules);
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
          router.push("/admin/login");
          return;
        }
        setError("Couldn't load settings.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(settings) });
      setSuccess("Settings saved.");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRule(rule: RewardRule) {
    try {
      await apiFetch(`/api/admin/settings/reward-rules/${rule.purchaseNumber}`, {
        method: "PUT",
        body: JSON.stringify({ type: rule.type, displayLabel: rule.displayLabel, value: rule.value }),
      });
      setSuccess(`Reward #${rule.purchaseNumber} updated.`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't update reward rule.");
    }
  }

  if (loading) return <AdminShell><p className="text-sm text-aiva-muted">Loading…</p></AdminShell>;

  return (
    <AdminShell>
      <h1 className="font-display text-3xl mb-6">Settings</h1>

      {error && <div className="mb-4"><StatusBanner kind="error">{error}</StatusBanner></div>}
      {success && <div className="mb-4"><StatusBanner kind="success">{success}</StatusBanner></div>}

      {settings && (
        <form onSubmit={handleSaveSettings} className="aiva-card mb-8 space-y-4 max-w-xl">
          <h2 className="font-display text-xl mb-2">Brand & Social Links</h2>
          <div>
            <label className="aiva-label">Brand Name</label>
            <input
              className="aiva-input"
              value={settings.brandName}
              onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
            />
          </div>
          <div>
            <label className="aiva-label">Instagram URL</label>
            <input
              className="aiva-input"
              value={settings.instagramUrl}
              onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
              placeholder="https://instagram.com/aivasilver"
            />
          </div>
          <div>
            <label className="aiva-label">Facebook URL</label>
            <input
              className="aiva-input"
              value={settings.facebookUrl}
              onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
              placeholder="https://facebook.com/aivasilver"
            />
          </div>
          <div>
            <label className="aiva-label">Google Review URL</label>
            <input
              className="aiva-input"
              value={settings.googleReviewUrl}
              onChange={(e) => setSettings({ ...settings, googleReviewUrl: e.target.value })}
              placeholder="https://g.page/r/..."
            />
          </div>
          <LoadingButton type="submit" loading={saving} className="!w-auto px-6">
            Save Settings
          </LoadingButton>
        </form>
      )}

      <div className="aiva-card max-w-2xl">
        <h2 className="font-display text-xl mb-1">Reward Rules</h2>
        <p className="text-xs text-aiva-muted mb-4">
          The 10 purchase positions are fixed — you may edit each reward's label/value only.
        </p>
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={rule.purchaseNumber} className="flex items-center gap-3 border-b border-aiva-line pb-3 last:border-0">
              <span className="w-8 text-sm text-aiva-muted">#{rule.purchaseNumber}</span>
              <input
                className="aiva-input flex-1"
                value={rule.displayLabel}
                onChange={(e) => {
                  const next = [...rules];
                  next[idx] = { ...rule, displayLabel: e.target.value };
                  setRules(next);
                }}
              />
              <select
                className="aiva-input w-auto"
                value={rule.type}
                onChange={(e) => {
                  const next = [...rules];
                  next[idx] = { ...rule, type: e.target.value };
                  setRules(next);
                }}
              >
                <option value="DISCOUNT_PERCENTAGE">Discount %</option>
                <option value="PHYSICAL_GIFT">Physical Gift</option>
                <option value="SURPRISE">Surprise</option>
                <option value="NO_REWARD">No Reward</option>
              </select>
              <button
                className="text-xs underline text-aiva-muted whitespace-nowrap"
                onClick={() => handleUpdateRule(rule)}
              >
                Save
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
