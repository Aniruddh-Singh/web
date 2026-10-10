"use client";

import { useSyncExternalStore } from "react";
import type { FoodType } from "./menu";
import type { MenuIndex } from "./menu-index";

/*
 * Browser-only state: the cart, and the orders placed from this device (code + private
 * tracking token, so guests can follow them). Prices, stock, hours and orders themselves
 * live in the API.
 */

export type CartLine = { id: string; name: string; type: FoodType; price: number; qty: number };
export type MyOrder = { code: string; token: string | null; at: number };

export type State = {
  cart: Record<string, number>;
  myOrders: MyOrder[];
};

const KEY = "coffee-cat-v2";
const initial: State = { cart: {}, myOrders: [] };

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

// ---------- derived ----------

/** Display price in rupees, straight from the menu. Orders are priced by the API. */
export function effectivePrice(_s: State, id: string, menu: MenuIndex) {
  return menu.getItem(id)?.price ?? 0;
}

/** Cart lines priced from the current menu. Items no longer on the menu drop out. */
export function cartLines(s: State, menu: MenuIndex): CartLine[] {
  return Object.entries(s.cart)
    .filter(([id, qty]) => qty > 0 && menu.getItem(id))
    .map(([id, qty]) => {
      const item = menu.getItem(id)!;
      return { id, name: item.name, type: item.type, price: item.price, qty };
    });
}

export function cartCount(s: State) {
  return Object.values(s.cart).reduce((a, b) => a + b, 0);
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
  removeItems(ids: string[]) {
    set((s) => {
      const cart = { ...s.cart };
      ids.forEach((id) => delete cart[id]);
      return { ...s, cart };
    });
  },
  clearCart() {
    set((s) => ({ ...s, cart: {} }));
  },
  /** Remember an order placed from this device (newest first, last 20). */
  rememberOrder(code: string, token: string | null) {
    set((s) => ({ ...s, cart: {}, myOrders: [{ code, token, at: Date.now() }, ...s.myOrders.filter((o) => o.code !== code)].slice(0, 20) }));
  },
};
