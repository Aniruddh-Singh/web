"use client";

import Link from "next/link";
import { cartCount, useStore } from "@/lib/store";
import { BagIcon } from "./icons";

export function HeaderCartLink() {
  const count = useStore(cartCount);
  return (
    <Link
      href="/checkout"
      data-cart-target
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-ink hover:bg-surface"
      aria-label={count ? `Cart, ${count} item${count > 1 ? "s" : ""}` : "Cart, empty"}
    >
      <BagIcon />
      <span>Cart</span>
      {count > 0 && (
        <span key={count} className="animate-bump min-w-5 rounded-full bg-roast px-1.5 text-center text-xs font-bold leading-5 text-paper">
          {count}
        </span>
      )}
    </Link>
  );
}
