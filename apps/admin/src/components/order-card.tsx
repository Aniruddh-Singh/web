"use client";

import { can, statusLabel, type OrderStatus, type StaffOrderView } from "@coffeecat/shared";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { clock, formatINR, minutesAgo } from "@/lib/format";
import { useStaff } from "./auth-provider";
import { FoodMark } from "./food-mark";

/** The one obvious next step for each status. */
export function nextAction(o: StaffOrderView): { to: OrderStatus; label: string } | null {
  switch (o.status) {
    case "placed": return { to: "accepted", label: "Accept order" };
    case "accepted": return { to: "preparing", label: "Start preparing" };
    case "preparing": return o.mode === "delivery" ? { to: "out_for_delivery", label: "Send out for delivery" } : { to: "ready", label: "Mark ready for pickup" };
    case "ready":
    case "out_for_delivery": return { to: "completed", label: o.mode === "delivery" ? "Mark delivered" : "Mark picked up" };
    default: return null;
  }
}

export function OrderCard({ order, now, isNew, onOpen, onChanged }: { order: StaffOrderView; now: number; isNew: boolean; onOpen: () => void; onChanged: (o: StaffOrderView) => void }) {
  const staff = useStaff();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const next = nextAction(order);
  const waiting = Math.round((now - new Date(order.createdAt).getTime()) / 60_000);

  const advance = async () => {
    if (!next) return;
    setBusy(true);
    setError(undefined);
    try {
      onChanged(await api<StaffOrderView>(`/admin/orders/${order.code}/status`, { method: "PATCH", json: { status: next.to } }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update the order. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className={`rounded-2xl border bg-paper p-4 shadow-sm ${order.status === "placed" ? "border-crema" : "border-line"} ${isNew ? "animate-arrive" : ""}`}
      aria-label={`Order ${order.code}`}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-lg font-bold leading-none">#{order.code.slice(3)}</p>
            <p className="mt-1 text-xs text-muted">
              {clock(order.createdAt)} · {minutesAgo(order.createdAt, now)}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.mode === "delivery" ? "bg-foam text-roast" : "bg-surface text-ink"}`}>
            {order.mode === "delivery" ? "Delivery" : "Takeaway"}
          </span>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {order.lines.map((l, i) => (
            <li key={i} className="flex items-center gap-2">
              <FoodMark type={l.foodType} />
              <span className="font-bold">{l.qty}×</span>
              <span className="min-w-0 flex-1 truncate">{l.name}</span>
            </li>
          ))}
        </ul>
        {order.notes && <p className="mt-2 rounded-lg bg-warn-bg px-2 py-1 text-sm">Note: {order.notes}</p>}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="truncate text-muted">{order.customerName}</span>
          <span className="font-semibold">
            {formatINR(order.bill.total)}{" "}
            <span className={order.paymentStatus === "paid" ? "text-ok" : "text-crema-ink"}>{order.paymentStatus === "paid" ? "paid" : "to collect"}</span>
          </span>
        </div>
        {order.status === "placed" && waiting >= 5 && <p className="mt-2 text-xs font-semibold text-nonveg">Waiting {waiting} min for someone to accept</p>}
      </button>

      {error && <p role="alert" className="mt-2 text-sm text-nonveg">{error}</p>}
      {next && can(staff.role, "orders:update") && (
        <button
          type="button"
          onClick={advance}
          disabled={busy}
          className={`mt-3 h-11 w-full rounded-xl font-semibold transition disabled:opacity-60 ${order.status === "placed" ? "bg-roast text-paper hover:bg-roast-hover" : "border border-line bg-paper hover:bg-surface"}`}
        >
          {busy ? "Updating…" : next.label}
        </button>
      )}
      <span className="sr-only">Status: {statusLabel(order.status, order.mode)}</span>
    </article>
  );
}
