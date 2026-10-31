"use client";

import { cartCount, useStore } from "@/lib/store";
import { ui } from "@/lib/ui-state";
import { BagIcon } from "./icons";

/** Header cart button: opens the cart drawer. Also the fly-to-cart target on desktop. */
export function HeaderCartLink() {
  const count = useStore(cartCount);
  return (
    <button
      type="button"
      onClick={ui.openCart}
      data-cart-target
      aria-haspopup="dialog"
      className="ml-2 flex items-center gap-2 rounded-full bg-crema px-4 py-2 font-semibold text-ink transition-colors hover:bg-[#c9a985] active:scale-95"
      aria-label={count ? `Cart, ${count} item${count > 1 ? "s" : ""}` : "Cart, empty"}
    >
      <BagIcon />
      <span>Cart</span>
      {count > 0 && (
        <span key={count} className="animate-bump min-w-5 rounded-full bg-ink px-1.5 text-center text-xs font-bold leading-5 text-paper">
          {count}
        </span>
      )}
    </button>
  );
}
