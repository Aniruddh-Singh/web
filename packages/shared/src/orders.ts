import type { FulfilmentMode, OrderStatus, StaffRole } from "./schemas";

/** Allowed status moves. Anything else is rejected by the API. */
const next: Record<OrderStatus, OrderStatus[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "out_for_delivery", "cancelled"],
  ready: ["completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus, mode: FulfilmentMode): boolean {
  if (!next[from].includes(to)) return false;
  // Takeaway orders are collected, never sent out; delivery orders go out rather than wait at the counter.
  if (to === "out_for_delivery") return mode === "delivery";
  if (from === "preparing" && to === "ready") return mode === "takeaway";
  return true;
}

export const activeStatuses: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "out_for_delivery"];

export function statusLabel(status: OrderStatus, mode: FulfilmentMode): string {
  switch (status) {
    case "placed": return "Order placed";
    case "accepted": return "Accepted";
    case "preparing": return "Being prepared";
    case "ready": return "Ready for pickup";
    case "out_for_delivery": return "Out for delivery";
    case "completed": return mode === "delivery" ? "Delivered" : "Picked up";
    case "cancelled": return "Cancelled";
  }
}

// ---------- roles ----------

export type Permission =
  | "orders:view" | "orders:update" | "orders:cancel"
  | "menu:edit" | "menu:availability"
  | "store:edit" | "store:pause"
  | "coupons:manage"
  | "staff:manage" | "audit:view";

const grants: Record<StaffRole, Permission[]> = {
  owner: ["orders:view", "orders:update", "orders:cancel", "menu:edit", "menu:availability", "store:edit", "store:pause", "coupons:manage", "staff:manage", "audit:view"],
  manager: ["orders:view", "orders:update", "orders:cancel", "menu:edit", "menu:availability", "store:edit", "store:pause", "coupons:manage"],
  kitchen: ["orders:view", "orders:update", "menu:availability", "store:pause"],
};

export const can = (role: StaffRole, permission: Permission) => grants[role].includes(permission);
