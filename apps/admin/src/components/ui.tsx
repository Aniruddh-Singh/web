"use client";

import { useEffect, useRef } from "react";

export const inputClass =
  "mt-1 h-11 w-full rounded-xl border border-line bg-paper px-3 text-[16px] focus:border-roast focus:outline-none aria-[invalid=true]:border-nonveg disabled:bg-surface disabled:text-muted";

export function Button({ variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-roast text-paper hover:bg-roast-hover",
    secondary: "border border-line bg-paper hover:bg-surface",
    danger: "bg-nonveg text-paper hover:brightness-95",
    ghost: "text-roast hover:bg-foam",
  }[variant];
  return <button type="button" {...props} className={`h-11 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`} />;
}

export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {label}
      {hint && <span className="ml-1 font-normal text-muted">{hint}</span>}
      {children}
      {error && <span role="alert" className="mt-1 block text-sm font-normal text-nonveg">{error}</span>}
    </label>
  );
}

/** Accessible on/off switch. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-ok" : "bg-line"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-paper shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

/** Slide-over panel used for editors. */
export function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/40" onClick={onClose}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-lg flex-col bg-paper shadow-2xl outline-none">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-line p-4">{footer}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: React.ReactNode }) {
  const styles = { info: "bg-warn-bg text-ink", error: "bg-danger-bg text-nonveg", success: "bg-[#e7f5ec] text-ok" }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}

/** Rupees in a form <-> paise in the API. */
export const rupeesToPaise = (v: string) => Math.round(Number(v || 0) * 100);
export const paiseToRupees = (p: number | null | undefined) => (p == null ? "" : String(p / 100));

/** Admin pages show dish photos from the customer site when they are site-relative paths. */
export const photoSrc = (url: string | null) => (url ? (url.startsWith("/") ? `${process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"}${url}` : url) : null);
