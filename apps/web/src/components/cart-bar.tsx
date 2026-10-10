"use client";

import Link from "next/link";
import { formatINR } from "@/lib/menu";
import { cartCount, cartLines, useStore } from "@/lib/store";
import { useMenu } from "./menu-provider";

/** Sticky "View cart" bar. The cat ears pop up over it when the first item lands in the cart. */
export function CartBar() {
  const count = useStore(cartCount);
  const menu = useMenu();
  const total = useStore((s) => cartLines(s, menu).reduce((sum, l) => sum + l.price * l.qty, 0));
  const visible = count > 0;

  return (
    <div
      style={{ bottom: "var(--bottom-nav)" }}
      className={`fixed inset-x-0 z-30 px-4 pb-3 transition-transform duration-300 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-[140%]"
      }`}
      aria-hidden={!visible}
    >
      <div className="relative mx-auto max-w-2xl">
        <svg
          viewBox="0 0 64 22"
          className={`absolute -top-[18px] left-6 h-[22px] w-16 transition-transform delay-150 duration-300 motion-reduce:transition-none ${
            visible ? "translate-y-0" : "translate-y-5"
          }`}
          aria-hidden="true"
        >
          <path d="M4 22 12 2 24 22Z M40 22 52 2 60 22Z" fill="var(--roast)" />
          <path d="M10 22 13 12 18 22Z M46 22 51 12 54 22Z" fill="var(--crema)" />
        </svg>
        <Link
          href="/checkout"
          tabIndex={visible ? 0 : -1}
          className="relative flex items-center justify-between rounded-2xl bg-roast px-5 py-3.5 text-paper shadow-[0_8px_24px_rgba(43,26,18,0.35)] hover:bg-roast-hover"
        >
          <span>
            <span key={count} className="animate-pop block text-sm font-semibold">
              {count} item{count === 1 ? "" : "s"} added
            </span>
            <span className="block text-xs text-foam">{formatINR(total)} plus taxes</span>
          </span>
          <span className="font-semibold">View cart</span>
        </Link>
      </div>
    </div>
  );
}
