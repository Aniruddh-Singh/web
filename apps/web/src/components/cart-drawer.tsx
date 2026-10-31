"use client";

import { formatINR as formatPaise, type Bill } from "@coffeecat/shared";
import Link from "next/link";
import { useState } from "react";
import { useCartSummary } from "@/lib/cart-summary";
import { formatINR } from "@/lib/menu";
import { actions, useStore } from "@/lib/store";
import { ui, useUi } from "@/lib/ui-state";
import { useQuote } from "@/lib/use-quote";
import { DishImage } from "./dish-image";
import { FoodMark } from "./food-mark";
import { ChevronRight } from "./icons";
import { useMenu } from "./menu-provider";
import { CloseButton, Overlay } from "./overlay";
import { QtyControl } from "./qty-control";
import { FreeDeliveryProgress } from "./free-delivery-progress";
import { LogoMark } from "./logo";

/** Slide-in cart: lines with steppers, free-delivery progress, coupon, server-priced bill and pairing suggestions. */
export function CartDrawer() {
  const open = useUi((s) => s.cartOpen);
  return (
    <Overlay open={open} onClose={ui.closeCart} label="Your cart" variant="drawer">
      {open && <CartContents />}
    </Overlay>
  );
}

function CartContents() {
  const menu = useMenu();
  const { lines, count, itemTotal, freeDeliveryAbove, estimate, suggestions } = useCartSummary(4);
  const coupon = useStore((s) => s.coupon);
  const cartKey = lines.map((l) => `${l.id}:${l.qty}`).join(",");
  // Delivery is the common case; checkout re-prices for takeaway.
  const { quote, fresh } = useQuote(cartKey, "delivery", coupon);
  const bill: Bill | null = quote?.bill ?? estimate;

  return (
    <>
      <header className="flex items-center justify-between gap-3 bg-ink px-5 py-4 text-paper">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold">Your cart</h2>
          {count > 0 && (
            <span key={count} className="animate-pop rounded-full bg-ok/25 px-3 py-1 text-sm font-semibold text-[#7ee2a0]">
              {count} item{count === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <CloseButton onClick={ui.closeCart} label="Close cart" tone="dark" />
      </header>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-foam">
            <LogoMark className="h-14 w-14" />
          </div>
          <p className="mt-4 font-display text-xl font-bold">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted">Add something delicious from the menu.</p>
          <Link href="/menu" onClick={ui.closeCart} className="mt-5 flex h-12 items-center rounded-xl bg-roast px-6 font-semibold text-paper hover:bg-roast-hover">
            Explore menu
          </Link>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <ul className="divide-y divide-line rounded-2xl bg-paper px-4">
              {lines.map((l) => (
                <li key={l.id} className="flex gap-3 py-4">
                  <button type="button" onClick={() => ui.openDish(l.id)} className="shrink-0" aria-label={`View ${l.name}`}>
                    <DishImage id={l.id} name={l.name} photo={menu.photoFor(l.id)} sizes="64px" className="h-16 w-16 rounded-2xl border border-line" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex min-w-0 items-start gap-1.5 font-semibold leading-snug">
                        <FoodMark type={l.type} className="mt-1 h-3.5 w-3.5" />
                        <span className="line-clamp-2">{l.name}</span>
                      </p>
                      <p className="shrink-0 font-bold">{formatINR(l.price * l.qty)}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {formatINR(l.price)} × {l.qty}
                    </p>
                    <QtyControl id={l.id} name={l.name} size="sm" className="mt-2" />
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 rounded-2xl bg-paper p-4">
              <FreeDeliveryProgress itemTotal={itemTotal} threshold={freeDeliveryAbove} />
            </div>

            <CouponField coupon={coupon} applied={fresh ? quote?.coupon : undefined} />

            {suggestions.length > 0 && (
              <section aria-labelledby="cart-suggest" className="mt-5">
                <h3 id="cart-suggest" className="font-display text-lg font-bold">Complete your meal</h3>
                <ul className="no-scrollbar -mx-4 mt-2 flex gap-3 overflow-x-auto px-4 pb-1">
                  {suggestions.map((s) => (
                    <li key={s.id} className="w-36 shrink-0 rounded-2xl bg-paper p-2">
                      <button type="button" onClick={() => ui.openDish(s.id)} className="block w-full text-left">
                        <DishImage id={s.id} name={s.name} photo={menu.photoFor(s.id)} sizes="128px" className="aspect-square w-full rounded-xl" />
                        <span className="mt-1.5 block truncate text-sm font-semibold">{s.name}</span>
                        <span className="block text-xs text-muted">{formatINR(s.price)}</span>
                      </button>
                      <QtyControl id={s.id} name={s.name} size="sm" className="mt-2 w-full" />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <footer className="border-t border-line bg-paper px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <dl className="space-y-1.5 text-sm" aria-busy={!fresh}>
              <Row label="Subtotal" value={formatINR(itemTotal)} />
              {bill ? (
                <>
                  {bill.discount > 0 && <Row label={`Coupon ${coupon}`} value={`−${formatPaise(bill.discount)}`} accent />}
                  <Row label="Delivery" value={bill.deliveryFee ? formatPaise(bill.deliveryFee) : "FREE"} accent={!bill.deliveryFee} />
                  <Row label="Packaging & GST" value={formatPaise(bill.packaging + bill.gst)} />
                </>
              ) : (
                <Row label="Delivery" value="Calculated at checkout" />
              )}
            </dl>
            {bill && (
              <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-line pt-3">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{formatPaise(bill.total)}</span>
              </div>
            )}
            <p className="mt-1 text-xs text-muted">{quote ? "For delivery. Takeaway skips the delivery fee." : "Final amount confirmed at checkout."}</p>
            <Link href="/checkout" onClick={ui.closeCart} className="mt-4 flex h-13 items-center justify-center gap-1.5 rounded-xl bg-roast text-lg font-semibold text-paper transition-colors hover:bg-roast-hover active:scale-[0.98]">
              Proceed to checkout <ChevronRight className="h-5 w-5" />
            </Link>
          </footer>
        </>
      )}
    </>
  );
}

/** Coupon entry. Whether it applies is the server's answer (`applied`), never assumed here. */
function CouponField({ coupon, applied }: { coupon: string | null; applied?: { applied: boolean; message: string } | null }) {
  const [input, setInput] = useState("");
  if (coupon) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-crema bg-paper px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold tracking-wider">{coupon}</p>
          <p className={`text-xs ${applied?.applied ? "text-ok" : "text-muted"}`} role="status">
            {applied ? applied.message : "Checking…"}
          </p>
        </div>
        <button type="button" onClick={() => actions.setCoupon(null)} className="h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-roast hover:bg-surface">
          Remove
        </button>
      </div>
    );
  }
  return (
    <form
      className="mt-3 flex gap-2 rounded-2xl bg-paper p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (input.trim()) actions.setCoupon(input);
      }}
    >
      <label htmlFor="drawer-coupon" className="sr-only">
        Coupon code
      </label>
      <input
        id="drawer-coupon"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Coupon code"
        className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-cream px-3 text-[16px] uppercase placeholder:normal-case focus:border-roast focus:outline-none"
      />
      <button type="submit" className="h-11 shrink-0 rounded-lg border border-roast px-4 text-sm font-semibold text-roast hover:bg-foam">
        Apply
      </button>
    </form>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={accent ? "font-semibold text-ok" : ""}>{value}</dd>
    </div>
  );
}
