"use client";

import { flyToCart } from "@/lib/fly-to-cart";
import { actions, isSoldOut, useStore } from "@/lib/store";

type Props = { id: string; name: string; size?: "sm" | "md" | "lg" };

const sizes = {
  sm: "h-8 w-[84px] text-sm",
  md: "h-9 w-24",
  lg: "h-12 w-36 text-lg",
};

/** Swiggy-style ADD button that pops into a − / + stepper. */
export function QtyControl({ id, name, size = "md" }: Props) {
  const qty = useStore((s) => s.cart[id] ?? 0);
  const soldOut = useStore((s) => isSoldOut(s, id));
  const box = sizes[size];

  if (soldOut) {
    return (
      <span className={`${box} inline-flex items-center justify-center rounded-lg border border-line bg-surface text-xs font-semibold text-muted`}>
        Sold out
      </span>
    );
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          actions.setQty(id, 1);
          flyToCart(e.currentTarget);
        }}
        className={`${box} rounded-lg border border-line bg-paper font-bold text-roast shadow-[0_2px_8px_rgba(43,26,18,0.12)] transition-[background-color,transform] hover:bg-foam active:scale-95`}
        aria-label={`Add ${name}`}
      >
        ADD
      </button>
    );
  }

  return (
    <div
      className={`${box} animate-pop inline-flex items-center justify-between rounded-lg bg-roast font-bold text-paper shadow-[0_2px_8px_rgba(43,26,18,0.2)]`}
      role="group"
      aria-label={`${name} quantity`}
    >
      <button type="button" className="h-full w-1/3 rounded-l-lg transition-colors hover:bg-roast-hover active:bg-ink" onClick={() => actions.setQty(id, qty - 1)} aria-label={`Remove one ${name}`}>
        −
      </button>
      <span key={qty} className="animate-bump" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        className="h-full w-1/3 rounded-r-lg transition-colors hover:bg-roast-hover active:bg-ink"
        onClick={(e) => {
          actions.setQty(id, qty + 1);
          flyToCart(e.currentTarget);
        }}
        aria-label={`Add one more ${name}`}
      >
        +
      </button>
    </div>
  );
}
