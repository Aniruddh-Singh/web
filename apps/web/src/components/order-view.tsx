"use client";

import { formatINR, statusLabel, type OrderStatus, type OrderView as Order } from "@coffeecat/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch, subscribeStream, type LiveState } from "@/lib/api-client";
import { payWithRazorpay } from "@/lib/razorpay";
import type { PaymentSession } from "@coffeecat/shared";
import { business, type FoodType } from "@/lib/menu";
import { useHydrated, useStore } from "@/lib/store";
import { FoodMark } from "./food-mark";
import { EmptyState, PageSkeleton } from "./empty-state";
import { CheckIcon } from "./icons";

const toFoodMark = (t: Order["lines"][number]["foodType"]): FoodType => (t === "non_veg" ? "non-veg" : t);

function stepsFor(o: Order): OrderStatus[] {
  return ["placed", "accepted", "preparing", o.mode === "delivery" ? "out_for_delivery" : "ready", "completed"];
}

const time = (iso: string) => new Date(iso).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });

/** Online orders that aren't paid yet: explain, and let the customer try again. */
function PaymentPending({ o, token, onPaid, initial }: { o: Order; token: string | null; onPaid: (o: Order) => void; initial?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | undefined>(initial === "failed" ? "The payment didn't go through. No money was taken, or it will be refunded." : initial === "dismissed" ? "You closed the payment window before paying." : undefined);
  const retry = async () => {
    setBusy(true);
    setMsg(undefined);
    try {
      const session = await apiFetch<PaymentSession>(`/orders/${o.code}/payment${token ? `?t=${encodeURIComponent(token)}` : ""}`, { method: "POST" });
      const r = await payWithRazorpay(o.code, token, session, { name: o.customerName, contact: o.phone });
      if (r.outcome === "paid") onPaid(r.order);
      else setMsg(r.outcome === "failed" ? r.message : "You closed the payment window before paying.");
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Couldn't open the payment window.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-crema bg-[#fdf6e7] p-5">
      <p className="font-semibold">Payment not completed</p>
      <p className="mt-1 text-sm text-muted">The cafe starts preparing once it&apos;s paid. Unpaid orders are cancelled after 30 minutes.</p>
      {msg && <p role="alert" className="mt-2 text-sm text-nonveg">{msg}</p>}
      <button type="button" onClick={retry} disabled={busy} className="mt-3 h-11 rounded-xl bg-roast px-5 font-semibold text-paper hover:bg-roast-hover disabled:opacity-60">
        {busy ? "Opening…" : `Pay ${formatINR(o.bill.total)}`}
      </button>
    </div>
  );
}

function Tracker({ o }: { o: Order }) {
  if (o.status === "cancelled") {
    return (
      <p className="rounded-xl bg-[#fbeceb] px-4 py-3 text-nonveg">
        The cafe cancelled this order{o.cancelReason ? `: ${o.cancelReason}` : "."} {o.paymentStatus === "paid" ? "Your payment will be refunded in 5 to 7 days." : ""} Call{" "}
        <a className="underline" href={`tel:${business.phone.primary.replace(/\s/g, "")}`}>{business.phone.primary}</a> for help.
      </p>
    );
  }
  const steps = stepsFor(o);
  const current = Math.max(0, steps.indexOf(o.status));
  return (
    <div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 rounded-full bg-ok transition-[width] duration-700 ease-out" style={{ width: `${(current / (steps.length - 1)) * 100}%` }} />
      </div>
      <ol className="mt-3 grid grid-cols-5 gap-1" aria-label="Order progress">
        {steps.map((s, i) => {
          const done = i < current || o.status === "completed";
          const active = i === current && o.status !== "completed";
          return (
            <li key={s} aria-current={active ? "step" : undefined} className="flex flex-col items-start gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-paper transition-colors duration-500 ${done ? "bg-ok" : active ? "animate-pulse-ring bg-ok" : "bg-line"}`}>
                {done ? <CheckIcon /> : <span className="h-2 w-2 rounded-full bg-paper" />}
              </span>
              <span className={`text-[11px] leading-tight sm:text-sm ${i <= current ? "font-semibold text-ink" : "text-muted"}`}>{statusLabel(s, o.mode)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** This device's orders, fetched from the API, with the selected one followed live. */
export function OrderView() {
  const hydrated = useHydrated();
  const stored = useStore((s) => s.myOrders);
  const params = useSearchParams();
  const codeParam = params.get("code")?.toUpperCase();
  // Orders from this device, plus one opened from the account page (tracked through the login instead of a token).
  const mine = useMemo(() => (codeParam && !stored.some((m) => m.code === codeParam) ? [{ code: codeParam, token: null, at: 0 }, ...stored] : stored), [stored, codeParam]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [live, setLive] = useState<LiveState>("connecting");
  const selectedCode = (params.get("code") ?? mine[0]?.code ?? "").toUpperCase();
  const selected = mine.find((m) => m.code === selectedCode);
  const mineKey = mine.map((m) => m.code).join(",");

  // Load every remembered order once.
  useEffect(() => {
    if (!mineKey) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const results = await Promise.allSettled(mine.map((m) => apiFetch<Order>(`/orders/${m.code}${m.token ? `?t=${encodeURIComponent(m.token)}` : ""}`)));
      if (cancelled) return;
      const found: Record<string, Order> = {};
      const gone: string[] = [];
      results.forEach((r, i) => (r.status === "fulfilled" ? (found[r.value.code] = r.value) : r.reason instanceof ApiError && r.reason.status === 404 && gone.push(mine[i].code)));
      setOrders((prev) => ({ ...prev, ...found }));
      setMissing(gone);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the set of orders changes
  }, [mineKey]);

  // Follow the selected order live.
  useEffect(() => {
    if (!selected) return;
    return subscribeStream(`/orders/${selected.code}/events${selected.token ? `?t=${encodeURIComponent(selected.token)}` : ""}`, {
      onState: setLive,
      onEvent: (type, data) => {
        if (type === "order") setOrders((prev) => ({ ...prev, [(data as Order).code]: data as Order }));
      },
    });
  }, [selected]);

  if (!hydrated) return <PageSkeleton />;
  if (mine.length === 0) {
    return <EmptyState title="No orders yet" body="Orders you place on this device show up here." href="/menu" cta="Browse the menu" />;
  }

  const o = orders[selectedCode];
  const others = mine.filter((m) => m.code !== selectedCode);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {!o ? (
        missing.includes(selectedCode) ? (
          <p className="rounded-xl bg-surface px-4 py-3">We couldn&apos;t find order #{selectedCode}. It may have been placed on another device.</p>
        ) : (
          <PageSkeleton />
        )
      ) : (
        <>
          <p className="text-sm text-muted">Order #{o.code} placed {time(o.createdAt)}</p>
          <h1 key={o.status} className="animate-rise mt-1 font-display text-3xl font-bold" aria-live="polite">
            {statusLabel(o.status, o.mode)}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${live === "live" ? "bg-ok" : "bg-crema"}`} aria-hidden="true" />
            {live === "live" ? "Updates live" : "Reconnecting for live updates…"}
          </p>
          <div className="mt-6">
            {o.paymentMethod !== "cod" && o.paymentStatus !== "paid" && o.status !== "cancelled" ? (
              <PaymentPending o={o} token={mine.find((m) => m.code === o.code)?.token ?? null} initial={params.get("payment")} onPaid={(paid) => setOrders((prev) => ({ ...prev, [paid.code]: paid }))} />
            ) : (
              <Tracker o={o} />
            )}
          </div>

          <section className="mt-8 rounded-2xl border border-line p-5" aria-labelledby="bill">
            <h2 id="bill" className="font-semibold">
              {o.mode === "delivery" ? `Delivering to ${o.customerName}` : `Takeaway for ${o.customerName}`}
            </h2>
            {o.address && <p className="mt-1 text-sm text-muted">{o.address}</p>}
            <ul className="mt-4 divide-y divide-line">
              {o.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                  <FoodMark type={toFoodMark(l.foodType)} className="h-3.5 w-3.5" />
                  <span className="flex-1">
                    {l.name} × {l.qty}
                  </span>
                  <span>{formatINR(l.unitPricePaise * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              {o.bill.discount > 0 && <div className="flex justify-between text-ok"><dt>Coupon {o.couponCode}</dt><dd>−{formatINR(o.bill.discount)}</dd></div>}
              {o.bill.deliveryFee > 0 && <div className="flex justify-between"><dt>Delivery</dt><dd>{formatINR(o.bill.deliveryFee)}</dd></div>}
              <div className="flex justify-between"><dt>Packaging and GST</dt><dd>{formatINR(o.bill.packaging + o.bill.gst)}</dd></div>
              <div className="flex justify-between pt-1 text-base font-bold">
                <dt>{o.paymentStatus === "paid" ? (o.paymentMethod === "cod" ? "Paid" : "Paid online") : o.paymentMethod !== "cod" ? "To pay online" : o.mode === "delivery" ? "Pay on delivery" : "Pay at the counter"}</dt>
                <dd>{formatINR(o.bill.total)}</dd>
              </div>
            </dl>
          </section>
        </>
      )}

      {others.length > 0 && (
        <section className="mt-10" aria-labelledby="past">
          <h2 id="past" className="font-display text-xl font-bold">Earlier orders</h2>
          <ul className="mt-3 divide-y divide-line">
            {others.map((m) => {
              const x = orders[m.code];
              return (
                <li key={m.code}>
                  <Link href={`/order?code=${m.code}`} className="flex w-full justify-between gap-4 py-3 text-left hover:bg-surface">
                    <span>
                      <span className="block text-sm font-semibold">#{m.code}</span>
                      <span className="block text-sm text-muted">{x ? x.lines.map((l) => l.name).join(", ") : "Loading…"}</span>
                    </span>
                    {x && (
                      <span className="shrink-0 text-right text-sm">
                        <span className="block font-semibold">{formatINR(x.bill.total)}</span>
                        <span className="block text-muted">{statusLabel(x.status, x.mode)}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
