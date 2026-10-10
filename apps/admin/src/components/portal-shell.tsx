"use client";

import { can, type Permission } from "@coffeecat/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-provider";
import { Logo } from "./logo";

export type NavItem = { href: string; label: string; permission: Permission; icon: React.ReactNode };

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Every section of the portal. Items are hidden when the role can't use them; the API enforces it too. */
export const nav: NavItem[] = [
  { href: "/", label: "Orders", permission: "orders:view", icon: icon("M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6") },
  { href: "/menu", label: "Menu", permission: "menu:availability", icon: icon("M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M9 9h6 M9 13h6") },
  { href: "/store", label: "Store", permission: "store:pause", icon: icon("M4 10h16l-1.5-5h-13z M5 10v10h14V10 M10 20v-5h4v5") },
  { href: "/coupons", label: "Coupons", permission: "coupons:manage", icon: icon("M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 1 0-4V4H4z M10 4v12") },
  { href: "/staff", label: "Staff", permission: "staff:manage", icon: icon("M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M17 11a3 3 0 1 0 0-6 M22 21a6 6 0 0 0-4-5.6") },
  { href: "/activity", label: "Activity", permission: "audit:view", icon: icon("M3 12h4l3-8 4 16 3-8h4") },
  { href: "/account", label: "Account", permission: "orders:view", icon: icon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0") },
];

/** Signed-in staff only: redirects to /login otherwise, then shows the sidebar (desktop) or tab bar (phone). */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const { state, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (state.status === "signed-out" || state.status === "not-staff") router.replace("/login");
  }, [state, router]);

  if (state.status !== "staff") {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <Logo className="h-14 w-14 animate-pulse" />
      </div>
    );
  }

  const items = nav.filter((n) => can(state.staff.role, n.permission));
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-paper p-4 md:flex">
        <div className="flex items-center gap-2 px-2">
          <Logo />
          <span className="font-display text-lg font-bold">Coffee Cat</span>
        </div>
        <nav aria-label="Staff portal" className="mt-8 flex-1 space-y-1">
          {items.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active(n.href) ? "bg-foam text-roast" : "text-muted hover:bg-surface hover:text-ink"}`}
            >
              {n.icon}
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line pt-4 text-sm">
          <p className="truncate font-semibold">{state.staff.email}</p>
          <p className="capitalize text-muted">{state.staff.role}</p>
          <button type="button" onClick={signOut} className="mt-3 text-sm font-semibold text-roast hover:underline">
            Log out
          </button>
        </div>
      </aside>

      <div className="pb-20 md:pb-0">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-paper px-4 md:hidden">
          <span className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-display font-bold">Coffee Cat staff</span>
          </span>
          <button type="button" onClick={signOut} className="text-sm font-semibold text-roast">
            Log out
          </button>
        </header>
        {children}
      </div>

      <nav aria-label="Staff portal" className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-line bg-paper md:hidden">
        {items.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={`flex h-16 min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active(n.href) ? "text-roast" : "text-muted"}`}>
            {n.icon}
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
