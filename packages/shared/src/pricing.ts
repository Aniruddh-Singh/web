import type { Paise } from "./money";
import type { Bill, CouponRule, FulfilmentMode, StoreSettings } from "./schemas";

export type PricedLine = { unitPricePaise: Paise; qty: number };

export type CouponCheck = { ok: true; discount: Paise } | { ok: false; reason: string };

/** Discount a coupon gives on an item total, or why it can't be used. */
export function applyCoupon(rule: CouponRule, itemTotal: Paise): CouponCheck {
  if (itemTotal < rule.minOrderPaise) {
    return { ok: false, reason: `Add ₹${Math.ceil((rule.minOrderPaise - itemTotal) / 100)} more to use ${rule.code}.` };
  }
  let discount = rule.kind === "flat" ? rule.value : Math.floor((itemTotal * rule.value) / 10_000);
  if (rule.maxDiscountPaise !== null) discount = Math.min(discount, rule.maxDiscountPaise);
  return { ok: true, discount: Math.min(discount, itemTotal) };
}

type FeeSettings = Pick<StoreSettings, "deliveryFeePaise" | "freeDeliveryAbovePaise" | "packagingFeePaise" | "gstBps">;

/**
 * The one bill calculation, shared by the API (authoritative) and the UI (preview).
 * GST is charged on food after discount; delivery and packaging are shown separately.
 */
export function computeBill(lines: PricedLine[], mode: FulfilmentMode, fees: FeeSettings, coupon?: CouponRule | null): Bill {
  const itemTotal = lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0);
  const couponResult = coupon ? applyCoupon(coupon, itemTotal) : null;
  const discount = couponResult?.ok ? couponResult.discount : 0;
  const deliveryFee = mode === "delivery" && itemTotal > 0 && itemTotal < fees.freeDeliveryAbovePaise ? fees.deliveryFeePaise : 0;
  const packaging = itemTotal > 0 ? fees.packagingFeePaise : 0;
  const gst = Math.round(((itemTotal - discount) * fees.gstBps) / 10_000);
  return { itemTotal, discount, deliveryFee, packaging, gst, total: itemTotal - discount + deliveryFee + packaging + gst };
}

// ---------- opening hours (Asia/Kolkata) ----------

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Minutes since midnight in India, regardless of where the code runs (servers are usually UTC). */
export function istMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** Handles hours that run past midnight, e.g. 11:00–01:45. */
export function isOpenAt(settings: Pick<StoreSettings, "opens" | "closes">, minuteOfDay: number): boolean {
  const open = minutes(settings.opens);
  const close = minutes(settings.closes);
  if (open === close) return true;
  return close > open ? minuteOfDay >= open && minuteOfDay < close : minuteOfDay >= open || minuteOfDay < close;
}

export function canTakeOrders(settings: Pick<StoreSettings, "opens" | "closes" | "acceptingOrders">, now: Date = new Date()) {
  return settings.acceptingOrders && isOpenAt(settings, istMinutes(now));
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}
