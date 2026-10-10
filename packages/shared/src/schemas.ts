import { z } from "zod";

// ---------- menu ----------

export const foodType = z.enum(["veg", "non_veg", "egg"]);
export type FoodType = z.infer<typeof foodType>;

/** `id` is the stable public slug (e.g. "cold-coffee") used in URLs, carts and orders. */
export const menuItem = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  foodType,
  pricePaise: z.number().int().nonnegative(),
  quantityLabel: z.string().nullable(),
  note: z.string().nullable(),
  isBestseller: z.boolean(),
  isAvailable: z.boolean(),
  imageUrl: z.string().nullable(),
  sort: z.number().int(),
});
export type MenuItem = z.infer<typeof menuItem>;

export const menuSection = z.object({
  id: z.string(),
  name: z.string(),
  sort: z.number().int(),
  items: z.array(menuItem),
});
export type MenuSection = z.infer<typeof menuSection>;

export const menuCategory = z.object({
  id: z.string(),
  name: z.string(),
  sort: z.number().int(),
  imageUrl: z.string().nullable(),
  sections: z.array(menuSection),
});
export type MenuCategory = z.infer<typeof menuCategory>;

export const menuResponse = z.object({ categories: z.array(menuCategory) });
export type MenuResponse = z.infer<typeof menuResponse>;

// ---------- store ----------

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");

export const storeSettings = z.object({
  opens: hhmm,
  closes: hhmm,
  acceptingOrders: z.boolean(),
  deliveryFeePaise: z.number().int().nonnegative(),
  freeDeliveryAbovePaise: z.number().int().nonnegative(),
  packagingFeePaise: z.number().int().nonnegative(),
  /** Basis points: 500 = 5%. Integer so GST maths stays exact. */
  gstBps: z.number().int().min(0).max(2800),
  deliveryRadiusKm: z.number().positive(),
});
export type StoreSettings = z.infer<typeof storeSettings>;

export const updateStoreSettings = storeSettings.partial();
export type UpdateStoreSettings = z.infer<typeof updateStoreSettings>;

// ---------- coupons ----------

export const couponKind = z.enum(["flat", "percent"]);
export type CouponKind = z.infer<typeof couponKind>;

export const couponRule = z.object({
  code: z.string(),
  kind: couponKind,
  /** Paise for "flat", basis points for "percent" (1000 = 10%). */
  value: z.number().int().positive(),
  minOrderPaise: z.number().int().nonnegative(),
  maxDiscountPaise: z.number().int().positive().nullable(),
});
export type CouponRule = z.infer<typeof couponRule>;

// ---------- orders ----------

export const fulfilmentMode = z.enum(["delivery", "takeaway"]);
export type FulfilmentMode = z.infer<typeof fulfilmentMode>;

export const paymentMethod = z.enum(["upi", "card", "cod"]);
export type PaymentMethod = z.infer<typeof paymentMethod>;

export const orderStatus = z.enum(["placed", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]);
export type OrderStatus = z.infer<typeof orderStatus>;

export const paymentStatus = z.enum(["pending", "paid", "failed", "refunded"]);
export type PaymentStatus = z.infer<typeof paymentStatus>;

const indianMobile = z
  .string()
  .transform((s) => s.replace(/\D/g, "").slice(-10))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"));

/** What the browser sends. Note: no prices — the server prices every order from the database. */
export const createOrderInput = z
  .object({
    lines: z
      .array(z.object({ itemId: z.string().min(1).max(120), qty: z.number().int().min(1).max(20) }))
      .min(1, "Your cart is empty")
      .max(50),
    mode: fulfilmentMode,
    customer: z.object({
      name: z.string().trim().min(1, "Enter your name").max(80),
      phone: indianMobile,
      address: z.string().trim().max(300).default(""),
      notes: z.string().trim().max(300).default(""),
    }),
    couponCode: z.string().trim().toUpperCase().max(30).optional(),
    paymentMethod,
  })
  .refine((o) => o.mode !== "delivery" || o.customer.address.length >= 10, {
    message: "Enter your full address, including flat and tower",
    path: ["customer", "address"],
  });
export type CreateOrderInput = z.infer<typeof createOrderInput>;

export const bill = z.object({
  itemTotal: z.number().int(),
  discount: z.number().int(),
  deliveryFee: z.number().int(),
  packaging: z.number().int(),
  gst: z.number().int(),
  total: z.number().int(),
});
export type Bill = z.infer<typeof bill>;

export const orderLine = z.object({
  itemId: z.string().nullable(),
  name: z.string(),
  foodType,
  unitPricePaise: z.number().int(),
  qty: z.number().int(),
});
export type OrderLine = z.infer<typeof orderLine>;

export const orderView = z.object({
  code: z.string(),
  status: orderStatus,
  cancelReason: z.string().nullable(),
  mode: fulfilmentMode,
  customerName: z.string(),
  phone: z.string(),
  address: z.string(),
  notes: z.string(),
  paymentMethod,
  paymentStatus,
  couponCode: z.string().nullable(),
  bill,
  lines: z.array(orderLine),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OrderView = z.infer<typeof orderView>;

export const createOrderResult = z.object({
  order: orderView,
  /** Secret that lets this browser track the order. Shown once. */
  trackingToken: z.string().nullable(),
  /** Present for UPI/card orders: open Razorpay Checkout with it. */
  payment: z.lazy(() => paymentSession).nullable(),
});
export type CreateOrderResult = z.infer<typeof createOrderResult>;

// ---------- staff ----------

export const staffRole = z.enum(["owner", "manager", "kitchen"]);
export type StaffRole = z.infer<typeof staffRole>;

/** Price a cart without placing an order (checkout preview). */
export const quoteInput = z.object({
  lines: z.array(z.object({ itemId: z.string().min(1).max(120), qty: z.number().int().min(1).max(20) })).max(50),
  mode: fulfilmentMode,
  couponCode: z.string().trim().toUpperCase().max(30).optional(),
});
export type QuoteInput = z.infer<typeof quoteInput>;

export const quoteResult = z.object({
  bill,
  /** Coupon outcome, if a code was sent. */
  coupon: z.object({ code: z.string(), applied: z.boolean(), message: z.string() }).nullable(),
  /** Items that can't be ordered right now (sold out or removed). */
  unavailable: z.array(z.string()),
  canOrderNow: z.boolean(),
});
export type QuoteResult = z.infer<typeof quoteResult>;

export const updateOrderStatusInput = z.object({
  status: orderStatus,
  note: z.string().trim().max(300).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInput>;

export const cancelOrderInput = z.object({ reason: z.string().trim().min(3, "Say why the order is cancelled").max(300) });
export type CancelOrderInput = z.infer<typeof cancelOrderInput>;

export const orderEvent = z.object({ status: orderStatus, note: z.string().nullable(), at: z.string() });
export type OrderEvent = z.infer<typeof orderEvent>;

/** Staff view adds the timeline. */
export const staffOrderView = orderView.extend({ events: z.array(orderEvent) });
export type StaffOrderView = z.infer<typeof staffOrderView>;

// ---------- online payment (Razorpay) ----------

/** What the browser needs to open Razorpay Checkout for an order. */
export const paymentSession = z.object({
  provider: z.literal("razorpay"),
  keyId: z.string(),
  razorpayOrderId: z.string(),
  amount: z.number().int(),
  currency: z.literal("INR"),
});
export type PaymentSession = z.infer<typeof paymentSession>;

/** Razorpay Checkout's success callback, sent back for signature verification. */
export const razorpayConfirmInput = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
export type RazorpayConfirmInput = z.infer<typeof razorpayConfirmInput>;
