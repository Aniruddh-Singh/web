import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * Every table has Row Level Security enabled and no policies: Supabase's auto-generated
 * public API (anon / authenticated keys) can read or write nothing. Only the NestJS API,
 * connecting as the database owner, touches data. Money is integer paise throughout.
 */

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

export const foodType = pgEnum("food_type", ["veg", "non_veg", "egg"]);
export const staffRole = pgEnum("staff_role", ["owner", "manager", "kitchen"]);
export const couponKind = pgEnum("coupon_kind", ["flat", "percent"]);
export const fulfilmentMode = pgEnum("fulfilment_mode", ["delivery", "takeaway"]);
export const paymentMethod = pgEnum("payment_method", ["upi", "card", "cod"]);
export const orderStatus = pgEnum("order_status", ["placed", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);

// ---------- people ----------

/** One row per Supabase Auth user (id = auth.users.id). */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  createdAt,
  updatedAt,
}).enableRLS();

export const staff = pgTable("staff", {
  userId: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  role: staffRole("role").notNull(),
  active: boolean("active").notNull().default(true),
  invitedBy: uuid("invited_by").references(() => profiles.id),
  createdAt,
  updatedAt,
}).enableRLS();

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    line: text("line").notNull(),
    landmark: text("landmark"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
).enableRLS();

// ---------- menu ----------

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  createdAt,
  updatedAt,
}).enableRLS();

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [index("sections_category_idx").on(t.categoryId)],
).enableRLS();

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id").notNull().references(() => sections.id, { onDelete: "restrict" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    foodType: foodType("food_type").notNull(),
    pricePaise: integer("price_paise").notNull(),
    quantityLabel: text("quantity_label"),
    note: text("note"),
    isBestseller: boolean("is_bestseller").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    imageUrl: text("image_url"),
    sort: integer("sort").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [index("menu_items_section_idx").on(t.sectionId), check("menu_items_price_positive", sql`${t.pricePaise} >= 0`)],
).enableRLS();

// ---------- store ----------

/** Exactly one row (id = 1). */
export const storeSettings = pgTable(
  "store_settings",
  {
    id: smallint("id").primaryKey().default(1),
    opens: text("opens").notNull(),
    closes: text("closes").notNull(),
    acceptingOrders: boolean("accepting_orders").notNull().default(true),
    deliveryFeePaise: integer("delivery_fee_paise").notNull(),
    freeDeliveryAbovePaise: integer("free_delivery_above_paise").notNull(),
    packagingFeePaise: integer("packaging_fee_paise").notNull(),
    gstBps: integer("gst_bps").notNull(),
    deliveryRadiusKm: real("delivery_radius_km").notNull(),
    updatedAt,
  },
  (t) => [check("store_settings_singleton", sql`${t.id} = 1`)],
).enableRLS();

// ---------- coupons ----------

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  kind: couponKind("kind").notNull(),
  value: integer("value").notNull(),
  minOrderPaise: integer("min_order_paise").notNull().default(0),
  maxDiscountPaise: integer("max_discount_paise"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  usageLimit: integer("usage_limit"),
  perUserLimit: integer("per_user_limit"),
  active: boolean("active").notNull().default(true),
  createdAt,
  updatedAt,
}).enableRLS();

// ---------- orders ----------

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicCode: text("public_code").notNull().unique(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    /** SHA-256 of the guest's tracking token; the token itself is never stored. */
    accessTokenHash: text("access_token_hash"),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    mode: fulfilmentMode("mode").notNull(),
    address: text("address").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: orderStatus("status").notNull().default("placed"),
    /** Shown to the customer when staff cancel. */
    cancelReason: text("cancel_reason"),
    paymentMethod: paymentMethod("payment_method").notNull(),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    itemTotalPaise: integer("item_total_paise").notNull(),
    discountPaise: integer("discount_paise").notNull().default(0),
    deliveryFeePaise: integer("delivery_fee_paise").notNull().default(0),
    packagingPaise: integer("packaging_paise").notNull().default(0),
    gstPaise: integer("gst_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),
    couponCode: text("coupon_code"),
    razorpayOrderId: text("razorpay_order_id").unique(),
    razorpayPaymentId: text("razorpay_payment_id"),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("orders_status_created_idx").on(t.status, t.createdAt),
    index("orders_user_idx").on(t.userId),
    index("orders_phone_idx").on(t.phone),
  ],
).enableRLS();

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    /** Snapshots: the order keeps what was bought even if the menu changes later. */
    itemSlug: text("item_slug"),
    name: text("name").notNull(),
    foodType: foodType("food_type").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), check("order_items_qty_positive", sql`${t.qty} > 0`)],
).enableRLS();

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatus("status").notNull(),
    actorUserId: uuid("actor_user_id").references(() => profiles.id, { onDelete: "set null" }),
    note: text("note"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
).enableRLS();

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    phone: text("phone").notNull(),
    createdAt,
  },
  (t) => [uniqueIndex("coupon_redemptions_order_uq").on(t.orderId), index("coupon_redemptions_coupon_idx").on(t.couponId)],
).enableRLS();

// ---------- audit ----------

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_at_idx").on(t.at)],
).enableRLS();
