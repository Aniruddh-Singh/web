"use client";

import Link from "next/link";
import { useCustomer } from "./customer-auth";

const icon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0" />
  </svg>
);

/** "Log in" or "Account" in the header. Nothing while the session is being checked (avoids a flash). */
export function AccountLink({ compact = false }: { compact?: boolean }) {
  const { session } = useCustomer();
  if (session === undefined) return <span className={compact ? "w-10" : "w-20"} aria-hidden="true" />;
  const href = session ? "/account" : "/login";
  const label = session ? "Account" : "Log in";
  return compact ? (
    <Link href={href} aria-label={label} className="rounded-lg p-2 text-ink hover:bg-surface">
      {icon}
    </Link>
  ) : (
    <Link href={href} className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-muted transition-colors hover:bg-surface hover:text-ink">
      {icon}
      {label}
    </Link>
  );
}
