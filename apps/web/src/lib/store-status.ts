"use client";

import type { StoreSettings } from "@coffeecat/shared";
import { useSyncExternalStore } from "react";
import { apiFetch } from "./api-client";

export type StoreStatus = StoreSettings & { openNow: boolean; onlinePayments: boolean };

/*
 * Live store status (hours, paused, fees) from the API, shared by every component on the page.
 * Fetched once per page load and refreshed every two minutes.
 */
let current: StoreStatus | null = null;
let started = false;
const listeners = new Set<() => void>();

async function refresh() {
  try {
    current = await apiFetch<StoreStatus>("/store");
    listeners.forEach((l) => l());
  } catch {
    // Keep the last known status; components show nothing rather than a wrong answer.
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!started) {
    started = true;
    void refresh();
    setInterval(refresh, 120_000);
  }
  return () => listeners.delete(l);
}

export function useStoreStatus(): StoreStatus | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
