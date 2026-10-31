"use client";

import { useSyncExternalStore } from "react";

/* Page-level UI state shared across components: which overlay is open and the dish just added. Not persisted. */

export type UiState = {
  quickView: string | null;
  cartOpen: boolean;
  /** Last dish added from zero, with a nonce so adding the same dish again re-triggers the suggestion. */
  lastAdded: { id: string; at: number } | null;
};

let state: UiState = { quickView: null, cartOpen: false, lastAdded: null };
const listeners = new Set<() => void>();
const initial = state;

function set(patch: Partial<UiState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useUi<T>(select: (s: UiState) => T): T {
  return select(useSyncExternalStore(subscribe, () => state, () => initial));
}

export const ui = {
  openDish: (id: string) => set({ quickView: id, cartOpen: false }),
  closeDish: () => set({ quickView: null }),
  openCart: () => set({ cartOpen: true, quickView: null }),
  closeCart: () => set({ cartOpen: false }),
  added: (id: string) => set({ lastAdded: { id, at: Date.now() } }),
  clearAdded: () => set({ lastAdded: null }),
};
