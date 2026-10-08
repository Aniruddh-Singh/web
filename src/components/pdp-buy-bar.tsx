"use client";

import Link from "next/link";
import { formatINR } from "@/lib/menu";
import { cartCount, effectivePrice, useStore } from "@/lib/store";
import { QtyControl } from "./qty-control";

export function LivePrice({ id, className = "" }: { id: string; className?: string }) {
  const price = useStore((s) => effectivePrice(s, id));
  return <span className={className}>{formatINR(price)}</span>;
}

/** In-page add controls on the dish page, plus a link to the cart once something is in it. */
export function PdpActions({ id, name }: { id: string; name: string }) {
  const count = useStore(cartCount);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <QtyControl id={id} name={name} size="lg" />
      {count > 0 && (
        <Link href="/checkout" className="animate-rise flex h-12 items-center rounded-lg bg-roast px-5 font-semibold text-paper transition-colors hover:bg-roast-hover">
          View cart ({count})
        </Link>
      )}
    </div>
  );
}

/** Sticky add bar on phones, sitting above the bottom nav. */
export function PdpBuyBar({ id, name }: { id: string; name: string }) {
  const count = useStore(cartCount);
  return (
    <div className="fixed inset-x-0 z-30 border-t border-line bg-paper px-4 py-3 shadow-[0_-6px_20px_rgba(43,26,18,0.08)] md:hidden" style={{ bottom: "var(--bottom-nav)" }}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <LivePrice id={id} className="text-sm text-muted" />
        </div>
        <QtyControl id={id} name={name} />
        {count > 0 && (
          <Link href="/checkout" className="flex h-9 items-center rounded-lg bg-roast px-3 text-sm font-semibold text-paper">
            Cart ({count})
          </Link>
        )}
      </div>
    </div>
  );
}
