"use client";

import { useSyncExternalStore } from "react";
import { allItems, getItem, pricing, type FoodType } from "./menu";

/*
 * Prototype-only state. Everything lives in this browser's localStorage, so the
 * customer site and the staff panel must be opened in the same browser. In
 * production this moves to a database behind authenticated APIs.
 */

export type OrderStatus = "placed" | "preparing" | "ready" | "completed" | "cancelled";
export type FulfilmentMode = "delivery" | "takeaway";
export type PaymentMethod = "upi" | "card" | "cod";

export type OrderLine = { id: string; name: string; type: FoodType; price: number; qty: number };

export type Bill = {
  itemTotal: number;
  delivery: number;
  packaging: number;
  discount: number;
  gst: number;
  total: number;
};

export type Order = {
  id: string;
  createdAt: number;
  lines: OrderLine[];
  mode: FulfilmentMode;
  customer: { name: string; phone: string; address: string; notes: string };
  coupon?: string;
  bill: Bill;
  payment: { method: PaymentMethod; paid: boolean };
  status: OrderStatus;
  updatedAt: number;
};

export type ItemOverride = { price?: number; soldOut?: boolean };

export type StoreSettings = { opens: string; closes: string; accepting: boolean };

export type State = {
  cart: Record<string, number>;
  overrides: Record<string, ItemOverride>;
  settings: StoreSettings;
  orders: Order[];
};

const KEY = "coffee-cat-demo-v1";

const initial: State = {
  cart: {},
  overrides: {},
  // Placeholder hours: public listings disagree. Confirm with the owner.
  settings: { opens: "10:00", closes: "23:00", accepting: true },
  orders: [],
};

let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved) state = { ...initial, ...JSON.parse(saved) };
  } catch {
    // Storage unavailable (private mode, blocked): run in memory.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function set(updater: (s: State) => State) {
  load();
  state = updater(state);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Ignore: state still works for this tab.
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    try {
      state = e.newValue ? { ...initial, ...JSON.parse(e.newValue) } : initial;
    } catch {
      return;
    }
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return state;
}

const getServerSnapshot = () => initial;

export function useStore<T>(select: (s: State) => T): T {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return select(s);
}

/** True once the browser state has been read; use to avoid flashing empty states. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ---------- derived helpers ----------

export function effectivePrice(s: State, id: string) {
  return s.overrides[id]?.price ?? getItem(id)?.price ?? 0;
}

export function isSoldOut(s: State, id: string) {
  return Boolean(s.overrides[id]?.soldOut);
}

export function cartLines(s: State): OrderLine[] {
  return Object.entries(s.cart)
    .filter(([id, qty]) => qty > 0 && getItem(id))
    .map(([id, qty]) => {
      const item = getItem(id)!;
      return { id, name: item.name, type: item.type, price: effectivePrice(s, id), qty };
    });
}

export function cartCount(s: State) {
  return Object.values(s.cart).reduce((a, b) => a + b, 0);
}

export function computeBill(lines: OrderLine[], mode: FulfilmentMode, coupon?: string): Bill {
  const itemTotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const delivery =
    mode === "delivery" && itemTotal > 0 && itemTotal < pricing.freeDeliveryAbove
      ? pricing.deliveryFee
      : 0;
  const packaging = itemTotal > 0 ? pricing.packagingPerOrder : 0;
  const c = coupon ? pricing.coupons[coupon] : undefined;
  const discount = c && itemTotal >= c.min ? c.off : 0;
  const gst = Math.round((itemTotal - discount) * pricing.gstRate);
  return { itemTotal, delivery, packaging, discount, gst, total: itemTotal - discount + delivery + packaging + gst };
}

export function isOpenNow(settings: StoreSettings, now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = settings.opens.split(":").map(Number);
  const [ch, cm] = settings.closes.split(":").map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  // Handles closing after midnight, e.g. 11:00–01:45.
  return close > open ? mins >= open && mins < close : mins >= open || mins < close;
}

export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

// ---------- actions ----------

export const actions = {
  setQty(id: string, qty: number) {
    set((s) => {
      const cart = { ...s.cart };
      if (qty <= 0) delete cart[id];
      else cart[id] = Math.min(qty, 20);
      return { ...s, cart };
    });
  },
  clearCart() {
    set((s) => ({ ...s, cart: {} }));
  },
  placeOrder(input: Omit<Order, "id" | "createdAt" | "updatedAt" | "status">) {
    const now = Date.now();
    const id = `TCC${String(now).slice(-6)}`;
    const order: Order = { ...input, id, createdAt: now, updatedAt: now, status: "placed" };
    set((s) => ({ ...s, cart: {}, orders: [order, ...s.orders] }));
    return id;
  },
  setOrderStatus(id: string, status: OrderStatus) {
    set((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === id ? { ...o, status, updatedAt: Date.now() } : o)),
    }));
  },
  setOverride(id: string, patch: ItemOverride) {
    set((s) => {
      const next = { ...s.overrides[id], ...patch };
      if (next.price === getItem(id)?.price) delete next.price;
      const overrides = { ...s.overrides, [id]: next };
      if (next.price === undefined && !next.soldOut) delete overrides[id];
      return { ...s, overrides };
    });
  },
  setSettings(patch: Partial<StoreSettings>) {
    set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
  resetDemo() {
    set(() => initial);
  },
};

export const menuSize = allItems.length;
