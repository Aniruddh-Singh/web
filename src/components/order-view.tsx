"use client";

import Link from "next/link";
import { useState } from "react";
import { business, formatINR } from "@/lib/menu";
import { useHydrated, useStore, type Order, type OrderStatus } from "@/lib/store";
import { FoodMark } from "./food-mark";
import { EmptyState, PageSkeleton } from "./empty-state";
import { CheckIcon } from "./icons";

const stepsFor = (o: Order): { status: OrderStatus; label: string }[] => [
  { status: "placed", label: "Order placed" },
  { status: "preparing", label: "Being prepared" },
  { status: "ready", label: o.mode === "delivery" ? "Out for delivery" : "Ready for pickup" },
  { status: "completed", label: o.mode === "delivery" ? "Delivered" : "Picked up" },
];

const order: OrderStatus[] = ["placed", "preparing", "ready", "completed"];

export const statusLabel = (o: Order) =>
  o.status === "cancelled" ? "Cancelled" : stepsFor(o).find((s) => s.status === o.status)!.label;

const time = (t: number) => new Date(t).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });

function Tracker({ o }: { o: Order }) {
  if (o.status === "cancelled") {
    return (
      <p className="rounded-xl bg-[#fbeceb] px-4 py-3 text-nonveg">
        The cafe cancelled this order. {o.payment.paid ? "Your payment will be refunded in 5 to 7 days." : ""} Call {business.phone.primary} for help.
      </p>
    );
  }
  const current = order.indexOf(o.status);
  const steps = stepsFor(o);
  return (
    <div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-ok transition-[width] duration-700 ease-out"
          style={{ width: `${(current / (steps.length - 1)) * 100}%` }}
        />
      </div>
      <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Order progress">
        {steps.map((s, i) => {
          const done = i < current || o.status === "completed";
          const active = i === current && o.status !== "completed";
          return (
            <li key={s.status} aria-current={active ? "step" : undefined} className="flex flex-col items-start gap-2">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-paper transition-colors duration-500 ${
                  done ? "bg-ok" : active ? "animate-pulse-ring bg-ok" : "bg-line"
                }`}
              >
                {done ? <CheckIcon /> : <span className="h-2 w-2 rounded-full bg-paper" />}
              </span>
              <span className={`text-xs sm:text-sm ${i <= current ? "font-semibold text-ink" : "text-muted"}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function OrderView() {
  const hydrated = useHydrated();
  const orders = useStore((s) => s.orders);
  const [selected, setSelected] = useState<string>();

  if (!hydrated) return <PageSkeleton />;

  if (orders.length === 0) {
    return <EmptyState title="No orders yet" body="Orders you place on this device show up here." href="/menu" cta="Browse the menu" />;
  }

  const o = orders.find((x) => x.id === selected) ?? orders[0];
  const others = orders.filter((x) => x.id !== o.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-muted">Order #{o.id} placed {time(o.createdAt)}</p>
      <h1 key={o.status} className="animate-rise mt-1 font-display text-3xl font-bold" aria-live="polite">
        {statusLabel(o)}
      </h1>
      <div className="mt-6">
        <Tracker o={o} />
      </div>
      <p className="mt-4 text-sm text-muted">
        This page updates on its own. In the demo, move the order along from the{" "}
        <Link href="/admin" target="_blank" className="font-semibold text-roast underline">
          staff panel
        </Link>{" "}
        in another tab.
      </p>

      <section className="mt-8 rounded-2xl border border-line p-5" aria-labelledby="bill">
        <h2 id="bill" className="font-semibold">
          {o.mode === "delivery" ? `Delivering to ${o.customer.name}` : `Takeaway for ${o.customer.name}`}
        </h2>
        {o.customer.address && <p className="mt-1 text-sm text-muted">{o.customer.address}</p>}
        <ul className="mt-4 divide-y divide-line">
          {o.lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
              <FoodMark type={l.type} className="h-3.5 w-3.5" />
              <span className="flex-1">
                {l.name} × {l.qty}
              </span>
              <span>{formatINR(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-bold">
          <span>{o.payment.paid ? "Paid" : o.mode === "delivery" ? "Pay on delivery" : "Pay at the counter"}</span>
          <span>{formatINR(o.bill.total)}</span>
        </div>
      </section>

      {others.length > 0 && (
        <section className="mt-10" aria-labelledby="past">
          <h2 id="past" className="font-display text-xl font-bold">
            Earlier orders
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {others.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => setSelected(x.id)} className="flex w-full justify-between gap-4 py-3 text-left hover:bg-surface">
                  <span>
                    <span className="block text-sm font-semibold">#{x.id}</span>
                    <span className="block text-sm text-muted">
                      {x.lines.map((l) => l.name).join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block font-semibold">{formatINR(x.bill.total)}</span>
                    <span className="block text-muted">{statusLabel(x)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
