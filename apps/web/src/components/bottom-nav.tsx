"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cartCount, useStore } from "@/lib/store";
import { BagIcon, HomeIcon, MenuIcon, ReceiptIcon, SearchIcon } from "./icons";

const tabs = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/menu", label: "Menu", Icon: MenuIcon, match: (p: string) => p.startsWith("/menu") || p.startsWith("/dish") },
  { href: "/search", label: "Search", Icon: SearchIcon, match: (p: string) => p.startsWith("/search") },
  { href: "/checkout", label: "Cart", Icon: BagIcon, match: (p: string) => p.startsWith("/checkout") },
  { href: "/order", label: "Orders", Icon: ReceiptIcon, match: (p: string) => p.startsWith("/order") },
];

/** App-style tab bar on phones. Hidden from md up, where the header carries navigation. */
export function BottomNav() {
  const path = usePathname();
  const count = useStore(cartCount);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid h-16 grid-cols-5 px-1">
        {tabs.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                {...(href === "/checkout" ? { "data-cart-target": true } : {})}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${active ? "font-bold text-ink" : "font-medium text-muted"}`}
              >
                <span className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 ${active ? "bg-foam" : ""}`}>
                  <Icon className="h-5.5 w-5.5" />
                  {href === "/checkout" && count > 0 && (
                    <span key={count} className="animate-bump absolute right-2 -top-1 min-w-4 rounded-full bg-roast px-1 text-center text-[10px] font-bold leading-4 text-paper">
                      {count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
