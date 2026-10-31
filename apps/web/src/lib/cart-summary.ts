"use client";

import { computeBill, type Bill } from "@coffeecat/shared";
import { useMenu } from "@/components/menu-provider";
import { pricing, type MenuItem } from "./menu";
import { cartCount, cartLines, useStore, type CartLine } from "./store";
import { useStoreStatus } from "./store-status";

export type CartSummary = {
  lines: CartLine[];
  count: number;
  /** Rupees. */
  itemTotal: number;
  freeDeliveryAbove: number;
  /** Rupees still needed for free delivery (0 once unlocked). */
  remaining: number;
  /** Delivery-order estimate in paise; null until store settings load. The API prices the real order. */
  estimate: Bill | null;
  suggestions: MenuItem[];
};

/** Cart totals, free-delivery progress and pairing suggestions, for the cart bar and drawer. */
export function useCartSummary(maxSuggestions = 4): CartSummary {
  const menu = useMenu();
  const status = useStoreStatus();
  const cart = useStore((s) => s.cart);
  const count = useStore(cartCount);
  const lines = cartLines({ cart, myOrders: [], saved: [] }, menu);
  const itemTotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const freeDeliveryAbove = status ? status.freeDeliveryAbovePaise / 100 : pricing.freeDeliveryAbove;
  const estimate = status
    ? computeBill(
        lines.map((l) => ({ unitPricePaise: Math.round(l.price * 100), qty: l.qty })),
        "delivery",
        status,
      )
    : null;
  const inCart = new Set(lines.map((l) => l.id));
  const seen = new Set<string>();
  const suggestions = lines
    .flatMap((l) => menu.pairingsFor(l.id, 4))
    .filter((i) => i.available && !inCart.has(i.id) && !seen.has(i.id) && seen.add(i.id))
    .slice(0, maxSuggestions);

  return { lines, count, itemTotal, freeDeliveryAbove, remaining: Math.max(0, freeDeliveryAbove - itemTotal), estimate, suggestions };
}
