import type { INestApplication } from "@nestjs/common";
import { createOrderResult } from "@coffeecat/shared";
import { createHmac } from "node:crypto";
import request from "supertest";
import { setStore, sql, staffUser } from "./helpers.js";

process.env.NODE_ENV = "test";

const order = (paymentMethod = "upi") => ({
  lines: [{ itemId: "cold-coffee", qty: 3 }],
  mode: "takeaway",
  customer: { name: "Payer", phone: "9876543210" },
  paymentMethod,
});
const checkoutSig = (orderId: string, paymentId: string) => createHmac("sha256", "fake_key_secret").update(`${orderId}|${paymentId}`).digest("hex");
const webhook = (event: string, orderId: string, paymentId = "pay_W1") => {
  const body = JSON.stringify({ event, payload: { payment: { entity: { id: paymentId, order_id: orderId } } } });
  return { body, sig: createHmac("sha256", "fake_webhook_secret").update(body).digest("hex") };
};

describe("online payments (e2e)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;
  let kitchen: Awaited<ReturnType<typeof staffUser>>;

  beforeAll(async () => {
    await setStore({ accepting_orders: true, opens: "00:00", closes: "00:00" });
    const { createApp } = await import("../src/main.js");
    app = await createApp();
    await app.init();
    http = app.getHttpServer();
    kitchen = await staffUser("kitchen");
  });
  afterAll(async () => {
    await app.close();
  });

  const board = async () => (await request(http).get("/admin/orders").set("Authorization", kitchen.auth).expect(200)).body.map((o: { code: string }) => o.code);

  it("tells the site online payment is on", async () => {
    expect((await request(http).get("/store").expect(200)).body.onlinePayments).toBe(true);
  });

  it("starts a Razorpay checkout for the server-priced total, and keeps the order off the kitchen board until paid", async () => {
    const res = await request(http).post("/orders").send(order()).expect(201);
    const { order: o, payment } = createOrderResult.parse(res.body);
    expect(payment).toMatchObject({ provider: "razorpay", keyId: "rzp_test_fake", amount: o.bill.total, currency: "INR" });
    expect(payment!.razorpayOrderId).toMatch(/^order_TEST/);
    expect(o.paymentStatus).toBe("pending");
    expect(await board()).not.toContain(o.code);
    await request(http).patch(`/admin/orders/${o.code}/status`).set("Authorization", kitchen.auth).send({ status: "accepted" }).expect(409);
  });

  it("rejects a forged checkout callback, accepts a genuine one", async () => {
    const res = await request(http).post("/orders").send(order()).expect(201);
    const { order: o, trackingToken, payment } = createOrderResult.parse(res.body);
    const forged = { razorpay_order_id: payment!.razorpayOrderId, razorpay_payment_id: "pay_X", razorpay_signature: "deadbeef" };
    await request(http).post(`/orders/${o.code}/payment/confirm`).query({ t: trackingToken }).send(forged).expect(400);
    const genuine = { ...forged, razorpay_signature: checkoutSig(payment!.razorpayOrderId, "pay_X") };
    const paid = await request(http).post(`/orders/${o.code}/payment/confirm`).query({ t: trackingToken }).send(genuine).expect(200);
    expect(paid.body.paymentStatus).toBe("paid");
    expect(await board()).toContain(o.code);
    // Someone else's tracking token can't confirm it.
    await request(http).post(`/orders/${o.code}/payment/confirm`).query({ t: "nope" }).send(genuine).expect(404);
  });

  it("marks orders paid from Razorpay's webhook, exactly once", async () => {
    const { body } = await request(http).post("/orders").send(order()).expect(201);
    const rzpOrder = body.payment.razorpayOrderId;
    const bad = webhook("payment.captured", rzpOrder);
    await request(http).post("/payments/razorpay/webhook").set("content-type", "application/json").set("x-razorpay-signature", "0".repeat(64)).send(bad.body).expect(400);
    const good = webhook("payment.captured", rzpOrder);
    for (let i = 0; i < 2; i++) {
      await request(http).post("/payments/razorpay/webhook").set("content-type", "application/json").set("x-razorpay-signature", good.sig).send(good.body).expect(200);
    }
    const detail = await request(http).get(`/admin/orders/${body.order.code}`).set("Authorization", kitchen.auth).expect(200);
    expect(detail.body.paymentStatus).toBe("paid");
    expect(detail.body.events.filter((e: { note: string | null }) => e.note === "Paid online")).toHaveLength(1);
  });

  it("lets a customer retry after a failed payment", async () => {
    const { body } = await request(http).post("/orders").send(order()).expect(201);
    const failed = webhook("payment.failed", body.payment.razorpayOrderId, "pay_F");
    await request(http).post("/payments/razorpay/webhook").set("content-type", "application/json").set("x-razorpay-signature", failed.sig).send(failed.body).expect(200);
    const view = await request(http).get(`/orders/${body.order.code}`).query({ t: body.trackingToken }).expect(200);
    expect(view.body.paymentStatus).toBe("failed");
    const retry = await request(http).post(`/orders/${body.order.code}/payment`).query({ t: body.trackingToken }).expect(200);
    expect(retry.body.razorpayOrderId).toBe(body.payment.razorpayOrderId);
    const ok = webhook("payment.captured", body.payment.razorpayOrderId, "pay_OK");
    await request(http).post("/payments/razorpay/webhook").set("content-type", "application/json").set("x-razorpay-signature", ok.sig).send(ok.body).expect(200);
    expect((await request(http).get(`/orders/${body.order.code}`).query({ t: body.trackingToken })).body.paymentStatus).toBe("paid");
    await request(http).post(`/orders/${body.order.code}/payment`).query({ t: body.trackingToken }).expect(409);
  });

  it("cancels online orders left unpaid past the timeout, and flags late payments for refund", async () => {
    const { body } = await request(http).post("/orders").send(order("card")).expect(201);
    const db = sql();
    await db`update orders set created_at = now() - interval '2 hours' where public_code = ${body.order.code}`;
    await db.end();
    const { OrdersService } = await import("../src/orders/orders.service.js");
    expect(await app.get(OrdersService).expireUnpaid()).toBeGreaterThanOrEqual(1);
    const view = await request(http).get(`/orders/${body.order.code}`).query({ t: body.trackingToken }).expect(200);
    expect(view.body).toMatchObject({ status: "cancelled", cancelReason: "Payment wasn't completed" });

    const late = webhook("payment.captured", body.payment.razorpayOrderId, "pay_LATE");
    await request(http).post("/payments/razorpay/webhook").set("content-type", "application/json").set("x-razorpay-signature", late.sig).send(late.body).expect(200);
    const manager = await staffUser("manager");
    const detail = await request(http).get(`/admin/orders/${body.order.code}`).set("Authorization", manager.auth).expect(200);
    expect(detail.body.paymentStatus).toBe("paid");
    expect(detail.body.events.some((e: { note: string | null }) => e.note?.includes("refund needed"))).toBe(true);
  });

  it("still takes cash orders straight to the board", async () => {
    const { body } = await request(http).post("/orders").send(order("cod")).expect(201);
    expect(body.payment).toBeNull();
    expect(await board()).toContain(body.order.code);
  });
});
