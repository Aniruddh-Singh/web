import { describe, expect, it } from "vitest";
import { applyCoupon, canTransition, can, computeBill, createOrderInput, formatINR, isOpenAt, istMinutes } from "../src";

const fees = { deliveryFeePaise: 3500, freeDeliveryAbovePaise: 30000, packagingFeePaise: 2000, gstBps: 500 };
const purr50 = { code: "PURR50", kind: "flat" as const, value: 5000, minOrderPaise: 39900, maxDiscountPaise: null };

describe("computeBill", () => {
  it("adds delivery under the free threshold", () => {
    const b = computeBill([{ unitPricePaise: 13000, qty: 2 }], "delivery", fees);
    expect(b).toEqual({ itemTotal: 26000, discount: 0, deliveryFee: 3500, packaging: 2000, gst: 1300, total: 32800 });
  });
  it("makes delivery free at or above ₹300", () => {
    expect(computeBill([{ unitPricePaise: 30000, qty: 1 }], "delivery", fees).deliveryFee).toBe(0);
  });
  it("never charges delivery for takeaway", () => {
    expect(computeBill([{ unitPricePaise: 13000, qty: 1 }], "takeaway", fees).deliveryFee).toBe(0);
  });
  it("applies GST after the coupon discount", () => {
    const b = computeBill([{ unitPricePaise: 61000, qty: 1 }], "delivery", fees, purr50);
    expect(b.discount).toBe(5000);
    expect(b.gst).toBe(2800); // 5% of ₹560
    expect(b.total).toBe(61000 - 5000 + 0 + 2000 + 2800);
  });
  it("charges nothing for an empty cart", () => {
    expect(computeBill([], "delivery", fees).total).toBe(0);
  });
});

describe("applyCoupon", () => {
  it("rejects orders below the minimum with how much to add", () => {
    expect(applyCoupon(purr50, 30000)).toEqual({ ok: false, reason: "Add ₹99 more to use PURR50." });
  });
  it("caps percentage discounts", () => {
    const tenPc = { code: "TEN", kind: "percent" as const, value: 1000, minOrderPaise: 0, maxDiscountPaise: 7500 };
    expect(applyCoupon(tenPc, 50000)).toEqual({ ok: true, discount: 5000 });
    expect(applyCoupon(tenPc, 100000)).toEqual({ ok: true, discount: 7500 });
  });
  it("never discounts more than the item total", () => {
    expect(applyCoupon({ ...purr50, minOrderPaise: 0 }, 3000)).toEqual({ ok: true, discount: 3000 });
  });
});

describe("opening hours", () => {
  it("handles hours that cross midnight", () => {
    const late = { opens: "11:00", closes: "01:45" };
    expect(isOpenAt(late, 23 * 60)).toBe(true);
    expect(isOpenAt(late, 60)).toBe(true);
    expect(isOpenAt(late, 2 * 60)).toBe(false);
    expect(isOpenAt(late, 10 * 60)).toBe(false);
  });
  it("uses India time, not server time", () => {
    // 18:30 UTC is midnight in India.
    expect(istMinutes(new Date("2026-10-10T18:30:00Z"))).toBe(0);
  });
});

describe("order rules", () => {
  it("only allows sensible status moves", () => {
    expect(canTransition("placed", "accepted", "delivery")).toBe(true);
    expect(canTransition("placed", "completed", "delivery")).toBe(false);
    expect(canTransition("preparing", "out_for_delivery", "takeaway")).toBe(false);
    expect(canTransition("preparing", "ready", "delivery")).toBe(false);
    expect(canTransition("completed", "cancelled", "delivery")).toBe(false);
  });
  it("limits kitchen staff", () => {
    expect(can("kitchen", "orders:update")).toBe(true);
    expect(can("kitchen", "menu:edit")).toBe(false);
    expect(can("manager", "staff:manage")).toBe(false);
    expect(can("owner", "staff:manage")).toBe(true);
  });
});

describe("createOrderInput", () => {
  const base = { lines: [{ itemId: "x", qty: 1 }], mode: "takeaway", customer: { name: "Riya", phone: "+91 98765 43210" }, paymentMethod: "cod" };
  it("normalises Indian mobile numbers", () => {
    expect(createOrderInput.parse(base).customer.phone).toBe("9876543210");
  });
  it("requires an address for delivery", () => {
    expect(createOrderInput.safeParse({ ...base, mode: "delivery" }).success).toBe(false);
  });
  it("ignores any price a client tries to send", () => {
    const parsed = createOrderInput.parse({ ...base, lines: [{ itemId: "x", qty: 1, price: 1 }] });
    expect(parsed.lines[0]).toEqual({ itemId: "x", qty: 1 });
  });
});

describe("formatINR", () => {
  it("formats paise as rupees", () => {
    expect(formatINR(13000)).toBe("₹130");
    expect(formatINR(123456)).toBe("₹1,234.56");
  });
});
