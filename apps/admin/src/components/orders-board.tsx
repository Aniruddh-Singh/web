"use client";

import type { StaffOrderView } from "@coffeecat/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { chime, soundReady, unlockSound } from "@/lib/chime";
import { subscribe, type LiveState } from "@/lib/live";
import { OrderCard } from "./order-card";
import { OrderDetail } from "./order-detail";

type Column = { key: string; title: string; hint: string; match: (o: StaffOrderView) => boolean };

const columns: Column[] = [
  { key: "new", title: "New", hint: "Accept these first", match: (o) => o.status === "placed" },
  { key: "kitchen", title: "In the kitchen", hint: "Accepted and being prepared", match: (o) => o.status === "accepted" || o.status === "preparing" },
  { key: "out", title: "Ready / on the way", hint: "Waiting for pickup or out for delivery", match: (o) => o.status === "ready" || o.status === "out_for_delivery" },
];

const REMIND_MS = 20_000;

/** Live board of today's open orders. Rings for new orders until someone accepts them. */
export function OrdersBoard() {
  const [orders, setOrders] = useState<Map<string, StaffOrderView>>(new Map());
  const [live, setLive] = useState<LiveState>("connecting");
  const [loadError, setLoadError] = useState<string>();
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [sound, setSound] = useState(false);
  const [tab, setTab] = useState(columns[0].key);
  const [now, setNow] = useState(() => Date.now());
  const known = useRef<Set<string>>(new Set());

  const upsert = useCallback((o: StaffOrderView) => {
    setOrders((prev) => new Map(prev).set(o.code, o));
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await api<StaffOrderView[]>("/admin/orders?scope=active");
      list.forEach((o) => known.current.add(o.code));
      setOrders((prev) => {
        // Keep orders that just finished visible until the next reload, so they don't vanish mid-tap.
        const next = new Map(list.map((o) => [o.code, o]));
        prev.forEach((o, code) => !next.has(code) && (o.status === "completed" || o.status === "cancelled") && next.set(code, o));
        return next;
      });
      setLoadError(undefined);
    } catch {
      setLoadError("Couldn't load orders. Retrying…");
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const stop = subscribe("/admin/orders/stream", {
      onState: setLive,
      onReconnect: () => void load(),
      onEvent: (type, data) => {
        if (type !== "order") return;
        const o = data as StaffOrderView & { events?: StaffOrderView["events"] };
        const isNew = !known.current.has(o.code);
        known.current.add(o.code);
        // Stream events carry the customer view; keep any timeline we already have.
        setOrders((prev) => new Map(prev).set(o.code, { ...o, events: o.events ?? prev.get(o.code)?.events ?? [] }));
        if (isNew) {
          setFresh((f) => new Set(f).add(o.code));
          chime();
        }
      },
    });
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(first);
      stop();
      clearInterval(tick);
    };
  }, [load]);

  const visible = useMemo(() => [...orders.values()].filter((o) => o.status !== "completed" && o.status !== "cancelled").sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [orders]);
  const waiting = visible.filter((o) => o.status === "placed").length;

  // Keep reminding while new orders wait; show the count in the tab title.
  useEffect(() => {
    document.title = waiting ? `(${waiting}) New order${waiting > 1 ? "s" : ""} | The Coffee Cat staff` : "Orders | The Coffee Cat staff";
    if (!waiting) return;
    const t = setInterval(chime, REMIND_MS);
    return () => clearInterval(t);
  }, [waiting]);

  const opened = openCode ? orders.get(openCode) : undefined;
  const openOrder = async (code: string) => {
    setOpenCode(code);
    setFresh((f) => {
      const n = new Set(f);
      n.delete(code);
      return n;
    });
    try {
      upsert(await api<StaffOrderView>(`/admin/orders/${code}`));
    } catch {
      // The card already has the essentials; the timeline just won't refresh.
    }
  };

  return (
    <div className="px-4 py-5 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted" aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${live === "live" ? "bg-ok" : "bg-crema"}`} aria-hidden="true" />
            {live === "live" ? "Live: new orders appear here automatically" : live === "connecting" ? "Connecting…" : "Connection lost, reconnecting…"}
          </p>
        </div>
        {!sound && (
          <button type="button" onClick={async () => setSound(await unlockSound())} className="rounded-xl bg-crema px-4 py-2.5 text-sm font-bold text-ink shadow-sm hover:brightness-105">
            Turn on order alerts sound
          </button>
        )}
        {sound && soundReady() && <span className="rounded-xl bg-paper px-3 py-2 text-sm font-semibold text-ok">Sound on</span>}
      </div>

      {loadError && <p role="status" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-nonveg">{loadError}</p>}

      {/* Phones: one column at a time. */}
      <div role="tablist" aria-label="Order stages" className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-paper p-1 md:hidden">
        {columns.map((c) => {
          const n = visible.filter(c.match).length;
          return (
            <button key={c.key} role="tab" aria-selected={tab === c.key} onClick={() => setTab(c.key)} className={`rounded-lg px-2 py-2 text-sm font-semibold ${tab === c.key ? "bg-roast text-paper" : "text-muted"}`}>
              {c.title} {n > 0 && `(${n})`}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-5 md:mt-6 md:grid-cols-3">
        {columns.map((c) => {
          const list = visible.filter(c.match);
          return (
            <section key={c.key} aria-labelledby={`col-${c.key}`} className={`${tab === c.key ? "block" : "hidden"} md:block`}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 id={`col-${c.key}`} className="font-display text-lg font-bold">
                  {c.title} <span className="font-sans text-base font-normal text-muted">{list.length}</span>
                </h2>
                <span className="hidden text-xs text-muted lg:block">{c.hint}</span>
              </div>
              <div className="space-y-3">
                {list.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">Nothing here right now.</p>}
                {list.map((o) => (
                  <OrderCard key={o.code} order={o} now={now} isNew={fresh.has(o.code)} onOpen={() => void openOrder(o.code)} onChanged={upsert} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {opened && <OrderDetail order={opened} onClose={() => setOpenCode(null)} onChanged={upsert} />}
    </div>
  );
}
