import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import {
  activeStatuses,
  applyCoupon,
  canTakeOrders,
  canTransition,
  computeBill,
  type CouponRule,
  type CreateOrderInput,
  type CreateOrderResult,
  type FulfilmentMode,
  type OrderStatus,
  type OrderView,
  type PaymentSession,
  type QuoteInput,
  type QuoteResult,
  type StaffOrderView,
} from "@coffeecat/shared";
import { and, asc, count, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { AuthUser } from "../auth/auth.types.js";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { couponRedemptions, coupons, menuItems, orderEvents, orderItems, orders } from "../db/schema.js";
import { env } from "../config/env.js";
import { RazorpayService } from "../payments/razorpay.service.js";
import { StoreService } from "../store/store.service.js";
import { OrderEventsService } from "./order-events.service.js";

type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L: easy to read out over the phone

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function newPublicCode() {
  let s = "TCC";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

type PricedCart = {
  lines: { item: typeof menuItems.$inferSelect; qty: number }[];
  unavailable: string[];
};

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private expiryTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly store: StoreService,
    private readonly events: OrderEventsService,
    private readonly razorpay: RazorpayService,
  ) {}

  onModuleInit() {
    // Cancel online orders nobody paid for, so they never reach the kitchen.
    if (env().NODE_ENV !== "test") this.expiryTimer = setInterval(() => void this.expireUnpaid().catch((e) => this.logger.error("expireUnpaid failed", e)), 60_000);
  }

  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }

  // ---------- pricing ----------

  /** Loads cart items from the database. Prices always come from here, never from the browser. */
  private async priceCart(lines: { itemId: string; qty: number }[], db: Database = this.db): Promise<PricedCart> {
    const merged = new Map<string, number>();
    for (const l of lines) merged.set(l.itemId, Math.min(20, (merged.get(l.itemId) ?? 0) + l.qty));
    const slugs = [...merged.keys()];
    if (slugs.length === 0) return { lines: [], unavailable: [] };

    const rows = await db.select().from(menuItems).where(and(inArray(menuItems.slug, slugs), isNull(menuItems.archivedAt)));
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    const unavailable = slugs.filter((s) => !bySlug.get(s)?.isAvailable);
    return {
      lines: slugs.flatMap((s) => {
        const item = bySlug.get(s);
        return item && item.isAvailable ? [{ item, qty: merged.get(s)! }] : [];
      }),
      unavailable,
    };
  }

  /** Finds a usable coupon, or explains why it can't be used. */
  private async findCoupon(code: string, itemTotal: number, who: { userId?: string; phone?: string }, db: Database = this.db) {
    const now = new Date();
    const [c] = await db.select().from(coupons).where(eq(coupons.code, code));
    if (!c || !c.active) return { ok: false as const, message: `${code} isn't a valid code.` };
    if ((c.startsAt && c.startsAt > now) || (c.endsAt && c.endsAt <= now)) return { ok: false as const, message: `${code} isn't active right now.` };

    if (c.usageLimit !== null) {
      const [{ used }] = await db.select({ used: count() }).from(couponRedemptions).where(eq(couponRedemptions.couponId, c.id));
      if (used >= c.usageLimit) return { ok: false as const, message: `${code} has been fully used.` };
    }
    if (c.perUserLimit !== null && (who.userId || who.phone)) {
      const mine = [who.userId ? eq(couponRedemptions.userId, who.userId) : undefined, who.phone ? eq(couponRedemptions.phone, who.phone) : undefined].filter(Boolean);
      const [{ used }] = await db
        .select({ used: count() })
        .from(couponRedemptions)
        .where(and(eq(couponRedemptions.couponId, c.id), or(...(mine as NonNullable<(typeof mine)[number]>[]))));
      if (used >= c.perUserLimit) return { ok: false as const, message: `You've already used ${code}.` };
    }

    const rule: CouponRule = { code: c.code, kind: c.kind, value: c.value, minOrderPaise: c.minOrderPaise, maxDiscountPaise: c.maxDiscountPaise };
    const check = applyCoupon(rule, itemTotal);
    if (!check.ok) return { ok: false as const, message: check.reason };
    return { ok: true as const, coupon: c, rule, message: `${code} applied: ${c.description}.` };
  }

  async quote(input: QuoteInput, user?: AuthUser): Promise<QuoteResult> {
    const settings = await this.store.getSettings();
    const cart = await this.priceCart(input.lines);
    const priced = cart.lines.map((l) => ({ unitPricePaise: l.item.pricePaise, qty: l.qty }));
    const itemTotal = priced.reduce((s, l) => s + l.unitPricePaise * l.qty, 0);

    let coupon: QuoteResult["coupon"] = null;
    let rule: CouponRule | null = null;
    if (input.couponCode) {
      const found = await this.findCoupon(input.couponCode, itemTotal, { userId: user?.id });
      coupon = { code: input.couponCode, applied: found.ok, message: found.message };
      if (found.ok) rule = found.rule;
    }
    return {
      bill: computeBill(priced, input.mode, settings, rule),
      coupon,
      unavailable: cart.unavailable,
      canOrderNow: canTakeOrders(settings),
    };
  }

  // ---------- placing ----------

  async create(input: CreateOrderInput, user?: AuthUser): Promise<CreateOrderResult> {
    const online = input.paymentMethod !== "cod";
    if (online && !this.razorpay.enabled()) {
      throw new BadRequestException("Online payment is coming soon. Choose pay on delivery or at the counter for now.");
    }
    const settings = await this.store.getSettings();
    if (!canTakeOrders(settings)) throw new ConflictException("The cafe isn't taking orders right now.");

    const trackingToken = randomBytes(24).toString("base64url");

    const order = await this.db.transaction(async (tx) => {
      const cart = await this.priceCart(input.lines, tx as unknown as Database);
      if (cart.unavailable.length) {
        throw new ConflictException({ message: "Some items just sold out. Remove them to continue.", unavailable: cart.unavailable });
      }
      if (cart.lines.length === 0) throw new BadRequestException("Your cart is empty.");

      const priced = cart.lines.map((l) => ({ unitPricePaise: l.item.pricePaise, qty: l.qty }));
      const itemTotal = priced.reduce((s, l) => s + l.unitPricePaise * l.qty, 0);

      let rule: CouponRule | null = null;
      let couponId: string | null = null;
      if (input.couponCode) {
        const found = await this.findCoupon(input.couponCode, itemTotal, { userId: user?.id, phone: input.customer.phone }, tx as unknown as Database);
        if (!found.ok) throw new BadRequestException(found.message);
        rule = found.rule;
        couponId = found.coupon.id;
      }
      const bill = computeBill(priced, input.mode, settings, rule);

      let row: OrderRow | undefined;
      for (let attempt = 0; attempt < 5 && !row; attempt++) {
        [row] = await tx
          .insert(orders)
          .values({
            publicCode: newPublicCode(),
            userId: user?.id ?? null,
            accessTokenHash: hashToken(trackingToken),
            customerName: input.customer.name,
            phone: input.customer.phone,
            mode: input.mode,
            address: input.mode === "delivery" ? input.customer.address : "",
            notes: input.customer.notes,
            paymentMethod: input.paymentMethod,
            itemTotalPaise: bill.itemTotal,
            discountPaise: bill.discount,
            deliveryFeePaise: bill.deliveryFee,
            packagingPaise: bill.packaging,
            gstPaise: bill.gst,
            totalPaise: bill.total,
            couponCode: rule?.code ?? null,
          })
          .onConflictDoNothing({ target: orders.publicCode })
          .returning();
      }
      if (!row) throw new Error("Could not allocate an order code");

      await tx.insert(orderItems).values(
        cart.lines.map((l) => ({
          orderId: row!.id,
          menuItemId: l.item.id,
          itemSlug: l.item.slug,
          name: l.item.name,
          foodType: l.item.foodType,
          unitPricePaise: l.item.pricePaise,
          qty: l.qty,
        })),
      );
      await tx.insert(orderEvents).values({ orderId: row.id, status: "placed", actorUserId: user?.id ?? null });
      if (couponId) {
        await tx.insert(couponRedemptions).values({ couponId, orderId: row.id, userId: user?.id ?? null, phone: input.customer.phone });
      }
      return row;
    });

    if (!online) {
      const view = await this.view(order);
      this.events.publish(view);
      return { order: view, trackingToken, payment: null };
    }

    // Online: create the Razorpay order. The kitchen only sees this order once it's paid.
    try {
      const rp = await this.razorpay.createOrder(order.totalPaise, order.publicCode, { order_code: order.publicCode });
      const [withPayment] = await this.db.update(orders).set({ razorpayOrderId: rp.id }).where(eq(orders.id, order.id)).returning();
      return { order: await this.view(withPayment), trackingToken, payment: this.session(withPayment) };
    } catch (e) {
      await this.db.update(orders).set({ status: "cancelled", cancelReason: "Payment couldn't be started" }).where(eq(orders.id, order.id));
      throw e;
    }
  }

  // ---------- reading ----------

  private async rowByCode(code: string): Promise<OrderRow> {
    const [row] = await this.db.select().from(orders).where(eq(orders.publicCode, code.toUpperCase()));
    if (!row) throw new NotFoundException("We couldn't find that order.");
    return row;
  }

  private tokenMatches(row: OrderRow, token?: string) {
    if (!token || !row.accessTokenHash) return false;
    const a = Buffer.from(hashToken(token));
    const b = Buffer.from(row.accessTokenHash);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Customers see their own orders (by login or by the tracking token); staff see all. */
  async getForViewer(code: string, token: string | undefined, user?: AuthUser): Promise<OrderView> {
    const row = await this.rowByCode(code);
    const allowed = this.tokenMatches(row, token) || (user && (user.id === row.userId || user.role !== null));
    if (!allowed) throw new NotFoundException("We couldn't find that order.");
    return this.view(row);
  }

  /** For the live stream: checks access once, then returns the code to filter on. */
  async authoriseStream(code: string, token: string | undefined, user?: AuthUser) {
    await this.getForViewer(code, token, user);
    return code.toUpperCase();
  }

  async listMine(userId: string): Promise<OrderView[]> {
    const rows = await this.db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(50);
    return this.views(rows);
  }

  async listForStaff(scope: "active" | "today" | "recent"): Promise<StaffOrderView[]> {
    const startOfDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Online orders reach the board only once paid.
    const payable = or(eq(orders.paymentMethod, "cod"), eq(orders.paymentStatus, "paid"));
    const where =
      scope === "active" ? and(inArray(orders.status, activeStatuses), payable) : scope === "today" ? gte(orders.createdAt, startOfDay) : lt(orders.createdAt, new Date());
    const rows = await this.db.select().from(orders).where(where).orderBy(asc(orders.createdAt)).limit(scope === "recent" ? 200 : 500);
    return this.staffViews(rows);
  }

  async getForStaff(code: string): Promise<StaffOrderView> {
    const [v] = await this.staffViews([await this.rowByCode(code)]);
    return v;
  }

  // ---------- staff actions ----------

  async updateStatus(code: string, to: OrderStatus, actor: AuthUser, note?: string): Promise<StaffOrderView> {
    if (to === "cancelled") throw new BadRequestException("Use cancel to cancel an order.");
    return this.transition(code, to, actor, note ?? null);
  }

  async cancel(code: string, reason: string, actor: AuthUser): Promise<StaffOrderView> {
    return this.transition(code, "cancelled", actor, reason);
  }

  private async transition(code: string, to: OrderStatus, actor: AuthUser, note: string | null): Promise<StaffOrderView> {
    const row = await this.rowByCode(code);
    if (to !== "cancelled" && row.paymentMethod !== "cod" && row.paymentStatus !== "paid") {
      throw new ConflictException("This order is still waiting for online payment.");
    }
    if (!canTransition(row.status, to, row.mode as FulfilmentMode)) {
      throw new ConflictException(`Can't move an order from "${row.status}" to "${to}".`);
    }
    // Compare-and-set: if two staff tap at once, only the first wins.
    const [updated] = await this.db
      .update(orders)
      .set({ status: to, ...(to === "cancelled" ? { cancelReason: note } : {}) })
      .where(and(eq(orders.id, row.id), eq(orders.status, row.status)))
      .returning();
    if (!updated) throw new ConflictException("Someone else just updated this order. Refresh and try again.");
    await this.db.insert(orderEvents).values({ orderId: row.id, status: to, actorUserId: actor.id, note });

    const view = await this.getForStaff(code);
    this.events.publish(view);
    return view;
  }

  async markPaid(code: string, actor: AuthUser): Promise<StaffOrderView> {
    const row = await this.rowByCode(code);
    if (row.paymentMethod !== "cod") throw new BadRequestException("Only cash/pay-later orders can be marked paid by hand.");
    if (row.paymentStatus === "paid") return this.getForStaff(code);
    await this.db.update(orders).set({ paymentStatus: "paid" }).where(eq(orders.id, row.id));
    await this.db.insert(orderEvents).values({ orderId: row.id, status: row.status, actorUserId: actor.id, note: "Payment collected" });
    const view = await this.getForStaff(code);
    this.events.publish(view);
    return view;
  }

  // ---------- online payment ----------

  private session(row: OrderRow): PaymentSession {
    return { provider: "razorpay", keyId: this.razorpay.keyId(), razorpayOrderId: row.razorpayOrderId!, amount: row.totalPaise, currency: "INR" };
  }

  /** Lets the customer re-open checkout for an unpaid online order. */
  async paymentSessionFor(code: string, token: string | undefined, user?: AuthUser): Promise<PaymentSession> {
    await this.getForViewer(code, token, user);
    const row = await this.rowByCode(code);
    if (row.paymentMethod === "cod" || !row.razorpayOrderId) throw new BadRequestException("This order is paid on delivery or at the counter.");
    if (row.paymentStatus === "paid") throw new ConflictException("This order is already paid.");
    if (row.status === "cancelled") throw new ConflictException("This order was cancelled. Place a new one.");
    return this.session(row);
  }

  /**
   * Marks an online order paid. Idempotent: the browser callback and Razorpay's webhook can both
   * arrive, in any order, any number of times.
   */
  async markOnlinePaid(razorpayOrderId: string, paymentId: string | null, expectedCode?: string) {
    const [row] = await this.db.select().from(orders).where(eq(orders.razorpayOrderId, razorpayOrderId));
    if (!row || (expectedCode && row.publicCode !== expectedCode.toUpperCase())) throw new NotFoundException("We couldn't find that order.");
    const [updated] = await this.db
      .update(orders)
      .set({ paymentStatus: "paid", razorpayPaymentId: paymentId ?? row.razorpayPaymentId })
      .where(and(eq(orders.id, row.id), sql`${orders.paymentStatus} <> 'paid'`))
      .returning();
    if (updated) {
      if (row.status === "cancelled") {
        // Paid after we gave up on it: keep the record straight so staff can refund.
        await this.db.insert(orderEvents).values({ orderId: row.id, status: row.status, note: "Payment received after cancellation: refund needed" });
        this.logger.warn(`Order ${row.publicCode} paid after cancellation; needs refund`);
      } else {
        await this.db.insert(orderEvents).values({ orderId: row.id, status: row.status, note: "Paid online" });
      }
      const view = await this.view(updated);
      this.events.publish(view);
      return view;
    }
    return this.view(row);
  }

  async markOnlineFailed(razorpayOrderId: string) {
    await this.db
      .update(orders)
      .set({ paymentStatus: "failed" })
      .where(and(eq(orders.razorpayOrderId, razorpayOrderId), eq(orders.paymentStatus, "pending")));
  }

  /** Cancels online orders still unpaid after the timeout. Returns how many. */
  async expireUnpaid(): Promise<number> {
    const cutoff = new Date(Date.now() - env().PAYMENT_TIMEOUT_MINUTES * 60_000);
    const expired = await this.db
      .update(orders)
      .set({ status: "cancelled", cancelReason: "Payment wasn't completed" })
      .where(and(sql`${orders.paymentMethod} <> 'cod'`, inArray(orders.paymentStatus, ["pending", "failed"]), sql`${orders.status} <> 'cancelled'`, lt(orders.createdAt, cutoff)))
      .returning({ id: orders.id });
    if (expired.length) {
      await this.db.insert(orderEvents).values(expired.map((e) => ({ orderId: e.id, status: "cancelled" as const, note: "Payment wasn't completed" })));
    }
    return expired.length;
  }

  // ---------- views ----------

  private toView(row: OrderRow, items: ItemRow[]): OrderView {
    return {
      code: row.publicCode,
      status: row.status,
      cancelReason: row.cancelReason,
      mode: row.mode,
      customerName: row.customerName,
      phone: row.phone,
      address: row.address,
      notes: row.notes,
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      couponCode: row.couponCode,
      bill: {
        itemTotal: row.itemTotalPaise,
        discount: row.discountPaise,
        deliveryFee: row.deliveryFeePaise,
        packaging: row.packagingPaise,
        gst: row.gstPaise,
        total: row.totalPaise,
      },
      lines: items.map((i) => ({ itemId: i.itemSlug, name: i.name, foodType: i.foodType, unitPricePaise: i.unitPricePaise, qty: i.qty })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async view(row: OrderRow): Promise<OrderView> {
    const [v] = await this.views([row]);
    return v;
  }

  private async views(rows: OrderRow[]): Promise<OrderView[]> {
    if (rows.length === 0) return [];
    const items = await this.db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.id)));
    return rows.map((r) => this.toView(r, items.filter((i) => i.orderId === r.id)));
  }

  private async staffViews(rows: OrderRow[]): Promise<StaffOrderView[]> {
    const base = await this.views(rows);
    if (rows.length === 0) return [];
    const evs = await this.db
      .select()
      .from(orderEvents)
      .where(inArray(orderEvents.orderId, rows.map((r) => r.id)))
      .orderBy(asc(orderEvents.at));
    return base.map((v, i) => ({
      ...v,
      events: evs.filter((e) => e.orderId === rows[i].id).map((e) => ({ status: e.status, note: e.note, at: e.at.toISOString() })),
    }));
  }

  /** Used by tests and the admin board's sanity checks. */
  async countActive() {
    const [{ n }] = await this.db.select({ n: sql<number>`count(*)::int` }).from(orders).where(inArray(orders.status, activeStatuses));
    return n;
  }

  /** Throws for customers trying staff-only reads. */
  assertStaff(user?: AuthUser) {
    if (!user?.role) throw new ForbiddenException("Staff only.");
  }
}
