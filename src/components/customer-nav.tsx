"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/history", label: "History", icon: "≡" },
  { href: "/rewards", label: "Rewards", icon: "♡" },
  { href: "/profile", label: "Profile", icon: "◐" },
];

export function CustomerNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-aiva-line z-20">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? "text-aiva-ink font-medium" : "text-aiva-muted"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
