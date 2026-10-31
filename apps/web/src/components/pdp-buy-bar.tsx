"use client";

import { formatINR } from "@/lib/menu";
import { useMenu } from "./menu-provider";
import { cartCount, effectivePrice, useStore } from "@/lib/store";
import { ui } from "@/lib/ui-state";
import { QtyControl } from "./qty-control";

export function LivePrice({ id, className = "" }: { id: string; className?: string }) {
  const menu = useMenu();
  const price = useStore((s) => effectivePrice(s, id, menu));
  return <span className={className}>{formatINR(price)}</span>;
}

/** In-page add controls on the dish page, plus a link to the cart once something is in it. */
export function PdpActions({ id, name }: { id: string; name: string }) {
  const count = useStore(cartCount);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <QtyControl id={id} name={name} size="lg" />
      {count > 0 && (
        <button type="button" onClick={ui.openCart} aria-haspopup="dialog" className="animate-rise flex h-12 items-center rounded-lg bg-roast px-5 font-semibold text-paper transition-colors hover:bg-roast-hover">
          View cart ({count})
        </button>
      )}
    </div>
  );
}

/** Sticky add bar on phones, sitting above the bottom nav. */
export function PdpBuyBar({ id, name }: { id: string; name: string }) {
  const count = useStore(cartCount);
  return (
    <div className="fixed inset-x-0 z-30 border-t border-line bg-paper px-4 py-3 shadow-[0_-6px_20px_rgba(34,24,19,0.08)] md:hidden" style={{ bottom: "var(--bottom-nav)" }}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <LivePrice id={id} className="text-sm text-muted" />
        </div>
        <QtyControl id={id} name={name} className="h-11" />
        {count > 0 && (
          <button type="button" onClick={ui.openCart} aria-haspopup="dialog" className="flex h-11 items-center rounded-lg bg-ink px-3 text-sm font-semibold text-paper">
            Cart ({count})
          </button>
        )}
      </div>
    </div>
  );
}
