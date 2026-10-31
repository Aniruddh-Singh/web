"use client";

import { formatINR as formatPaise } from "@coffeecat/shared";
import Link from "next/link";
import { useCartSummary } from "@/lib/cart-summary";
import { formatINR } from "@/lib/menu";
import { ui, useUi } from "@/lib/ui-state";
import { DishImage } from "./dish-image";
import { FoodMark } from "./food-mark";
import { useMenu } from "./menu-provider";
import { CloseButton, Overlay } from "./overlay";
import { QtyControl } from "./qty-control";
import { FreeDeliveryProgress } from "./free-delivery-progress";
import { LogoMark } from "./logo";

/** Slide-in cart: lines with steppers, free-delivery progress, bill estimate and pairing suggestions. */
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

  return (
    <>
      <header className="flex items-center justify-between bg-ink px-5 py-4 text-paper">
        <div>
          <h2 className="font-display text-xl font-bold">Your cart</h2>
          <p className="text-xs text-foam/80">{count ? `${count} item${count === 1 ? "" : "s"}` : "Empty"}</p>
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
          <Link href="/menu" onClick={ui.closeCart} className="mt-5 rounded-xl bg-roast px-5 py-3 text-sm font-semibold text-paper hover:bg-roast-hover">
            Explore menu
          </Link>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="rounded-2xl bg-paper p-4">
              <FreeDeliveryProgress itemTotal={itemTotal} threshold={freeDeliveryAbove} />
            </div>

            <ul className="mt-3 space-y-2">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-paper p-3">
                  <DishImage id={l.id} name={l.name} photo={menu.photoFor(l.id)} sizes="56px" className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-start gap-1.5 text-sm font-semibold leading-snug">
                      <FoodMark type={l.type} className="mt-0.5 h-3.5 w-3.5" />
                      <span className="line-clamp-2">{l.name}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{formatINR(l.price * l.qty)}</p>
                  </div>
                  <QtyControl id={l.id} name={l.name} size="sm" />
                </li>
              ))}
            </ul>

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
            <dl className="space-y-1.5 text-sm">
              <Row label="Item total" value={formatINR(itemTotal)} />
              {estimate && (
                <>
                  <Row label="Delivery fee" value={estimate.deliveryFee ? formatPaise(estimate.deliveryFee) : "FREE"} accent={!estimate.deliveryFee} />
                  <Row label="Packaging" value={formatPaise(estimate.packaging)} />
                  <Row label="GST" value={formatPaise(estimate.gst)} />
                </>
              )}
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-line pt-3">
              <span className="font-semibold">{estimate ? "Estimated total" : "Subtotal"}</span>
              <span className="text-lg font-bold">{estimate ? formatPaise(estimate.total) : formatINR(itemTotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{estimate ? "For delivery. Takeaway skips the delivery fee; coupons apply at checkout." : "Taxes and fees are added at checkout."}</p>
            <Link href="/checkout" onClick={ui.closeCart} className="mt-4 flex h-12 items-center justify-center rounded-xl bg-roast font-semibold text-paper transition-colors hover:bg-roast-hover active:scale-[0.98]">
              Proceed to checkout
            </Link>
          </footer>
        </>
      )}
    </>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={accent ? "font-semibold text-ok" : ""}>{value}</dd>
    </div>
  );
}
