"use client";

import { ButtonHTMLAttributes } from "react";

export function AivaWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`font-display tracking-[0.2em] text-2xl font-semibold text-aiva-ink ${className}`}>
      AIVA
    </div>
  );
}

export function StatusBanner({
  kind,
  children,
}: {
  kind: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    error: "bg-red-50 text-red-700 border-red-100",
    success: "bg-aiva-blush/60 text-aiva-ink border-aiva-blushDark/40",
    info: "bg-aiva-bg text-aiva-muted border-aiva-line",
  }[kind];

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm animate-fade-in-up ${styles}`} role="status">
      {children}
    </div>
  );
}

export function LoadingButton({
  loading,
  children,
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: "primary" | "secondary" }) {
  const base = variant === "primary" ? "aiva-btn-primary" : "aiva-btn-secondary";
  return (
    <button className={`${base} w-full ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          Please wait…
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function StepDot({ status }: { status: "COMPLETED" | "PENDING" | "NOT_COMPLETED" }) {
  if (status === "COMPLETED") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-aiva-ink text-white text-sm">
        ✓
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-aiva-blush text-aiva-ink text-sm">
        ⏳
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-aiva-line text-aiva-muted text-sm">
      ○
    </span>
  );
}
