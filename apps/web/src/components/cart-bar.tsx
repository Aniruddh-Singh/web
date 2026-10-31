"use client";

import { useEffect } from "react";
import { useCartSummary } from "@/lib/cart-summary";
import { formatINR } from "@/lib/menu";
import { ui, useUi } from "@/lib/ui-state";
import { DishImage } from "./dish-image";
import { ChevronRight } from "./icons";
import { useMenu } from "./menu-provider";
import { QtyControl } from "./qty-control";

/** Sticky cart bar above the bottom nav. Opens the cart drawer; briefly suggests a pairing after each new dish. */
export function CartBar() {
  const { count, itemTotal, remaining, lines } = useCartSummary(0);
  const visible = count > 0;

  return (
    <div
      style={{ bottom: "var(--bottom-nav)" }}
      className={`fixed inset-x-0 z-30 px-3 pb-3 transition-transform duration-300 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-[140%]"
      }`}
      aria-hidden={!visible}
    >
      <div className="relative mx-auto max-w-2xl">
        {visible && <PairingNudge inCart={new Set(lines.map((l) => l.id))} />}
        <div className="relative">
        <svg
          viewBox="0 0 64 22"
          className={`absolute -top-[18px] left-6 h-[22px] w-16 transition-transform delay-150 duration-300 motion-reduce:transition-none ${visible ? "translate-y-0" : "translate-y-5"}`}
          aria-hidden="true"
        >
          <path d="M4 22 12 2 24 22Z M40 22 52 2 60 22Z" fill="var(--ink)" />
          <path d="M10 22 13 12 18 22Z M46 22 51 12 54 22Z" fill="var(--crema)" />
        </svg>
        <button
          type="button"
          onClick={ui.openCart}
          tabIndex={visible ? 0 : -1}
          aria-haspopup="dialog"
          className="relative flex w-full items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-3 text-left text-paper shadow-[0_10px_30px_rgba(34,24,19,0.4)] transition active:scale-[0.99]"
        >
          <span className="min-w-0">
            <span key={count} className="animate-pop block text-sm font-semibold">
              {count} item{count === 1 ? "" : "s"} · {formatINR(itemTotal)}
            </span>
            <span className="block truncate text-xs text-foam/80">
              {remaining > 0 ? `Add ${formatINR(remaining)} more for free delivery` : "Free delivery unlocked"}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-xl bg-crema px-4 py-2.5 text-sm font-bold text-ink">
            View cart <ChevronRight />
          </span>
        </button>
        </div>
      </div>
    </div>
  );
}

/** "Goes well with" card that pops above the bar for a few seconds after a dish is added. */
function PairingNudge({ inCart }: { inCart: Set<string> }) {
  const menu = useMenu();
  const last = useUi((s) => s.lastAdded);
  const pick = last ? menu.pairingsFor(last.id, 6).find((i) => i.available && !inCart.has(i.id)) : undefined;

  useEffect(() => {
    if (!last) return;
    const t = window.setTimeout(ui.clearAdded, 6000);
    return () => window.clearTimeout(t);
  }, [last]);

  if (!last || !pick) return null;
  const addedName = menu.getItem(last.id)?.name;
  return (
    <div key={last.at} role="status" className="animate-rise mb-6 flex items-center gap-3 rounded-2xl border border-line bg-paper p-2.5 pr-3 shadow-[0_8px_24px_rgba(34,24,19,0.18)]">
      <button type="button" onClick={() => ui.openDish(pick.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <DishImage id={pick.id} name={pick.name} photo={menu.photoFor(pick.id)} sizes="48px" className="h-12 w-12 shrink-0 rounded-xl" />
        <span className="min-w-0">
          <span className="block truncate text-xs text-muted">Goes well with {addedName}</span>
          <span className="block truncate text-sm font-semibold">
            {pick.name} · {formatINR(pick.price)}
          </span>
        </span>
      </button>
      <QtyControl id={pick.id} name={pick.name} size="sm" />
      <button type="button" onClick={ui.clearAdded} aria-label="Dismiss suggestion" className="-mr-1 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface">
        ×
      </button>
    </div>
  );
}
