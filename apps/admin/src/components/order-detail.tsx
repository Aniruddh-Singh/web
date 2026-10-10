"use client";

import { can, statusLabel, type StaffOrderView } from "@coffeecat/shared";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { clock, formatINR } from "@/lib/format";
import { useStaff } from "./auth-provider";
import { FoodMark } from "./food-mark";
import { nextAction } from "./order-card";

/** Slide-over with everything about one order: items, customer, bill, timeline and actions. */
export function OrderDetail({ order, onClose, onChanged }: { order: StaffOrderView; onClose: () => void; onChanged: (o: StaffOrderView) => void }) {
  const staff = useStaff();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const next = nextAction(order);
  const done = order.status === "completed" || order.status === "cancelled";

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (key: string, path: string, init: { method: string; json?: unknown }) => {
    setBusy(key);
    setError(undefined);
    try {
      onChanged(await api<StaffOrderView>(path, init));
      if (key === "cancel") setCancelling(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update the order. Check your connection.");
    } finally {
      setBusy(null);
    }
  };

  const b = order.bill;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/40" onClick={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.code}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-paper shadow-2xl outline-none"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-paper px-5 py-4">
          <div>
            <p className="font-display text-xl font-bold">#{order.code}</p>
            <p className="text-sm text-muted">
              {statusLabel(order.status, order.mode)} · {order.mode === "delivery" ? "Delivery" : "Takeaway"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface">
            Close
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section aria-label="Customer">
            <p className="font-semibold">{order.customerName}</p>
            <a href={`tel:+91${order.phone}`} className="text-roast underline">
              +91 {order.phone.slice(0, 5)} {order.phone.slice(5)}
            </a>
            {order.address && <p className="mt-1 text-sm text-muted">{order.address}</p>}
            {order.notes && <p className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-sm">Note: {order.notes}</p>}
          </section>

          <section aria-label="Items">
            <ul className="divide-y divide-line">
              {order.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-2 py-2 text-sm">
                  <FoodMark type={l.foodType} />
                  <span className="font-bold">{l.qty}×</span>
                  <span className="flex-1">{l.name}</span>
                  <span>{formatINR(l.unitPricePaise * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-dashed border-line pt-3 text-sm">
              <div className="flex justify-between"><dt>Items</dt><dd>{formatINR(b.itemTotal)}</dd></div>
              {b.discount > 0 && <div className="flex justify-between text-ok"><dt>Coupon {order.couponCode}</dt><dd>−{formatINR(b.discount)}</dd></div>}
              {b.deliveryFee > 0 && <div className="flex justify-between"><dt>Delivery</dt><dd>{formatINR(b.deliveryFee)}</dd></div>}
              <div className="flex justify-between"><dt>Packaging</dt><dd>{formatINR(b.packaging)}</dd></div>
              <div className="flex justify-between"><dt>GST</dt><dd>{formatINR(b.gst)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatINR(b.total)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Payment</dt>
                <dd className={order.paymentStatus === "paid" ? "font-semibold text-ok" : "font-semibold text-crema-ink"}>
                  {order.paymentMethod === "cod" ? "Cash / pay later" : order.paymentMethod.toUpperCase()}, {order.paymentStatus === "paid" ? "paid" : "not collected"}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-label="Timeline">
            <h2 className="text-sm font-semibold text-muted">Timeline</h2>
            <ol className="mt-2 space-y-2 border-l-2 border-line pl-4">
              {order.events.map((e, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold">{statusLabel(e.status, order.mode)}</span> <span className="text-muted">{clock(e.at)}</span>
                  {e.note && <p className="text-muted">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-nonveg">{error}</p>}

          {!done && (
            <section aria-label="Actions" className="space-y-2">
              {next && can(staff.role, "orders:update") && (
                <button type="button" disabled={!!busy} onClick={() => run("next", `/admin/orders/${order.code}/status`, { method: "PATCH", json: { status: next.to } })} className="h-12 w-full rounded-xl bg-roast font-semibold text-paper hover:bg-roast-hover disabled:opacity-60">
                  {busy === "next" ? "Updating…" : next.label}
                </button>
              )}
              {order.paymentMethod === "cod" && order.paymentStatus !== "paid" && can(staff.role, "orders:update") && (
                <button type="button" disabled={!!busy} onClick={() => run("paid", `/admin/orders/${order.code}/mark-paid`, { method: "POST" })} className="h-11 w-full rounded-xl border border-line font-semibold hover:bg-surface disabled:opacity-60">
                  {busy === "paid" ? "Saving…" : `Mark ${formatINR(b.total)} collected`}
                </button>
              )}
              {can(staff.role, "orders:cancel") &&
                (cancelling ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run("cancel", `/admin/orders/${order.code}/cancel`, { method: "POST", json: { reason } });
                    }}
                    className="space-y-2 rounded-xl border border-nonveg/30 p-3"
                  >
                    <label className="block text-sm font-medium">
                      Why is it cancelled? The customer will see this.
                      <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Out of milk" className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-[16px]" />
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" disabled={!!busy} className="h-10 flex-1 rounded-lg bg-nonveg font-semibold text-paper disabled:opacity-60">
                        {busy === "cancel" ? "Cancelling…" : "Cancel order"}
                      </button>
                      <button type="button" onClick={() => setCancelling(false)} className="h-10 rounded-lg border border-line px-4 font-semibold">
                        Keep it
                      </button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setCancelling(true)} className="h-11 w-full rounded-xl font-semibold text-nonveg hover:bg-danger-bg">
                    Cancel order…
                  </button>
                ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
