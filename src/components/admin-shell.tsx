"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

const LINKS = [
  { href: "/admin/dashboard", label: "Overview" },
  { href: "/admin/purchases", label: "Pending Requests" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/cards", label: "Cards" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f6f4] flex">
      <aside className="w-60 shrink-0 bg-white border-r border-aiva-line min-h-screen sticky top-0 flex flex-col">
        <div className="px-6 py-6 border-b border-aiva-line">
          <div className="font-display text-xl tracking-wide">AIVA</div>
          <p className="text-xs text-aiva-muted mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-aiva-ink text-white" : "text-aiva-ink/80 hover:bg-aiva-bg"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-aiva-line">
          <button
            onClick={handleLogout}
            className="w-full text-left rounded-lg px-3 py-2.5 text-sm text-aiva-muted hover:bg-aiva-bg transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
