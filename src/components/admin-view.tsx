"use client";

import { useState } from "react";
import { categories, formatINR, getItem } from "@/lib/menu";
import { actions, effectivePrice, isSoldOut, useHydrated, useStore, type Order, type OrderStatus } from "@/lib/store";
import { FoodMark } from "./food-mark";
import { statusLabel } from "./order-view";

type Tab = "orders" | "menu" | "store";

const nextStep = (o: Order): { to: OrderStatus; label: string } | undefined =>
  ({
    placed: { to: "preparing" as const, label: "Accept and start preparing" },
    preparing: { to: "ready" as const, label: o.mode === "delivery" ? "Send out for delivery" : "Mark ready for pickup" },
    ready: { to: "completed" as const, label: o.mode === "delivery" ? "Mark delivered" : "Mark picked up" },
  })[o.status as "placed" | "preparing" | "ready"];

export function AdminView() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("orders");
  const activeCount = useStore((s) => s.orders.filter((o) => ["placed", "preparing", "ready"].includes(o.status)).length);

  const tabs: { id: Tab; label: string }[] = [
    { id: "orders", label: activeCount ? `Orders (${activeCount})` : "Orders" },
    { id: "menu", label: "Menu" },
    { id: "store", label: "Hours and status" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Staff panel</h1>
      <p className="mt-1 text-sm text-muted">
        Demo panel with no login. Changes are saved in this browser and show on the customer site straight away.
      </p>
      <div role="tablist" aria-label="Staff panel sections" className="mt-6 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${
              tab === t.id ? "border-roast text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-6">
        {!hydrated ? null : tab === "orders" ? <OrdersPanel /> : tab === "menu" ? <MenuPanel /> : <StorePanel />}
      </div>
    </div>
  );
}

function OrdersPanel() {
  const orders = useStore((s) => s.orders);
  if (!orders.length) {
    return <p className="py-12 text-center text-muted">No orders yet. New orders from the website appear here automatically.</p>;
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {orders.map((o) => {
        const next = nextStep(o);
        const done = o.status === "completed" || o.status === "cancelled";
        return (
          <li key={o.id} className={`rounded-2xl border p-4 ${o.status === "placed" ? "border-crema bg-[#fdf6e7]" : "border-line"} ${done ? "opacity-70" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  #{o.id} <span className="font-normal text-muted">{o.mode === "delivery" ? "Delivery" : "Takeaway"}</span>
                </p>
                <p className="text-sm text-muted">{new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
              </div>
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{statusLabel(o)}</span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {o.lines.map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  <FoodMark type={l.type} className="h-3 w-3" />
                  <span className="font-semibold">{l.qty} ×</span> {l.name}
                </li>
              ))}
            </ul>
            {o.customer.notes && <p className="mt-2 rounded-lg bg-surface px-2 py-1 text-sm">Note: {o.customer.notes}</p>}
            <p className="mt-3 text-sm">
              {o.customer.name},{" "}
              <a className="underline" href={`tel:${o.customer.phone}`}>
                {o.customer.phone}
              </a>
            </p>
            {o.customer.address && <p className="text-sm text-muted">{o.customer.address}</p>}
            <p className="mt-2 text-sm font-semibold">
              {formatINR(o.bill.total)} {o.payment.paid ? `paid by ${o.payment.method.toUpperCase()}` : "to collect"}
            </p>
            {!done && (
              <div className="mt-4 flex gap-2">
                {next && (
                  <button type="button" onClick={() => actions.setOrderStatus(o.id, next.to)} className="flex-1 rounded-lg bg-roast px-3 py-2 text-sm font-semibold text-paper hover:bg-roast-hover">
                    {next.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.confirm(`Cancel order #${o.id}?`) && actions.setOrderStatus(o.id, "cancelled")}
                  className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-nonveg hover:bg-[#fbeceb]"
                >
                  Cancel order
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PriceInput({ id }: { id: string }) {
  const price = useStore((s) => effectivePrice(s, id));
  const [draft, setDraft] = useState<string>();
  const item = getItem(id)!;
  const commit = () => {
    const n = Number(draft);
    if (draft !== undefined && Number.isFinite(n) && n > 0) actions.setOverride(id, { price: Math.round(n) });
    setDraft(undefined);
  };
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="sr-only">Price of {item.name} in rupees</span>₹
      <input
        type="number"
        min={1}
        value={draft ?? price}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={`h-9 w-20 rounded-lg border px-2 text-[16px] ${price !== item.price ? "border-crema bg-[#fdf6e7]" : "border-line"}`}
      />
    </label>
  );
}

function MenuPanel() {
  const [q, setQ] = useState("");
  const state = useStore((s) => s);
  const soldOutCount = Object.values(state.overrides).filter((o) => o.soldOut).length;
  const query = q.trim().toLowerCase();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="w-full max-w-sm">
          <span className="sr-only">Search items</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="h-10 w-full rounded-lg border border-line px-3 text-[16px]" />
        </label>
        <p className="text-sm text-muted">{soldOutCount} item{soldOutCount === 1 ? "" : "s"} marked sold out</p>
      </div>
      {categories.map((c) => {
        const items = c.sections.flatMap((s) => s.items).filter((i) => !query || i.name.toLowerCase().includes(query));
        if (!items.length) return null;
        return (
          <section key={c.id} className="mt-6">
            <h2 className="font-display text-lg font-bold">{c.name}</h2>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {items.map((i) => {
                const soldOut = isSoldOut(state, i.id);
                return (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <FoodMark type={i.type} className="h-3.5 w-3.5" />
                    <span className={`min-w-0 flex-1 text-sm ${soldOut ? "text-muted line-through" : ""}`}>{i.name}</span>
                    <PriceInput id={i.id} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!soldOut} onChange={(e) => actions.setOverride(i.id, { soldOut: !e.target.checked })} className="h-4 w-4 accent-[var(--ok)]" />
                      In stock
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function StorePanel() {
  const settings = useStore((s) => s.settings);
  return (
    <div className="max-w-md space-y-6">
      <label className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
        <span>
          <span className="block font-semibold">Taking online orders</span>
          <span className="block text-sm text-muted">Turn off to pause orders, for example when the kitchen is busy.</span>
        </span>
        <input type="checkbox" checked={settings.accepting} onChange={(e) => actions.setSettings({ accepting: e.target.checked })} className="h-5 w-5 accent-[var(--ok)]" />
      </label>
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 font-semibold">Opening hours</legend>
        <p className="text-sm text-muted">Public listings disagree on the real hours. Set the ones the cafe actually keeps.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Opens
            <input type="time" value={settings.opens} onChange={(e) => e.target.value && actions.setSettings({ opens: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-2" />
          </label>
          <label className="text-sm font-medium">
            Closes
            <input type="time" value={settings.closes} onChange={(e) => e.target.value && actions.setSettings({ closes: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-2" />
          </label>
        </div>
      </fieldset>
      <button
        type="button"
        onClick={() => window.confirm("Clear all demo orders, cart, price changes and settings?") && actions.resetDemo()}
        className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-nonveg hover:bg-[#fbeceb]"
      >
        Reset demo data
      </button>
    </div>
  );
}
