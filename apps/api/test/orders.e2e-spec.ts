import type { INestApplication } from "@nestjs/common";
import { createOrderResult, quoteResult, staffOrderView } from "@coffeecat/shared";
import { request as httpRequest } from "node:http";
import request from "supertest";
import { customerUser, setStore, staffUser } from "./helpers.js";

process.env.NODE_ENV = "test";

const guestOrder = (over: Record<string, unknown> = {}) => ({
  lines: [
    { itemId: "cold-coffee", qty: 2 },
    { itemId: "veg-kurkure-momos", qty: 1 },
  ],
  mode: "delivery",
  customer: { name: "Riya", phone: "+91 98765 43210", address: "Flat 1204, Tower B, Antriksh Forest, Sector 77", notes: "" },
  paymentMethod: "cod",
  ...over,
});

describe("orders (e2e)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;

  beforeAll(async () => {
    await setStore({ accepting_orders: true, opens: "00:00", closes: "00:00" }); // open around the clock for tests
    const { createApp } = await import("../src/main.js");
    app = await createApp();
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("pricing", () => {
    it("quotes from database prices", async () => {
      const res = await request(http).post("/orders/quote").send({ lines: [{ itemId: "cold-coffee", qty: 2 }], mode: "delivery" }).expect(200);
      const q = quoteResult.parse(res.body);
      // 2 × ₹130 = ₹260, under ₹300 so ₹35 delivery, ₹20 packaging, 5% GST on ₹260 = ₹13
      expect(q.bill).toEqual({ itemTotal: 26000, discount: 0, deliveryFee: 3500, packaging: 2000, gst: 1300, total: 32800 });
      expect(q.canOrderNow).toBe(true);
    });

    it("explains why a coupon can't be used yet", async () => {
      const res = await request(http).post("/orders/quote").send({ lines: [{ itemId: "cold-coffee", qty: 1 }], mode: "takeaway", couponCode: "purr50" }).expect(200);
      expect(res.body.coupon).toEqual({ code: "PURR50", applied: false, message: "Add ₹269 more to use PURR50." });
    });

    it("rejects unknown coupons", async () => {
      const res = await request(http).post("/orders/quote").send({ lines: [{ itemId: "cold-coffee", qty: 4 }], mode: "takeaway", couponCode: "FREEFOOD" }).expect(200);
      expect(res.body.coupon.applied).toBe(false);
    });

    it("ignores prices sent by the browser", async () => {
      const tampered = guestOrder({ lines: [{ itemId: "cold-coffee", qty: 1, price: 1, unitPricePaise: 1 }], total: 1 });
      const res = await request(http).post("/orders").send(tampered).expect(201);
      expect(res.body.order.bill.itemTotal).toBe(13000);
    });
  });

  describe("guest checkout", () => {
    let code: string;
    let token: string;

    it("places a cash-on-delivery order with a server-computed bill", async () => {
      const res = await request(http).post("/orders").send(guestOrder({ couponCode: "PURR50", lines: [{ itemId: "cold-coffee", qty: 4 }] })).expect(201);
      const { order, trackingToken } = createOrderResult.parse(res.body);
      expect(order.code).toMatch(/^TCC[2-9A-Z]{6}$/);
      expect(order.status).toBe("placed");
      expect(order.phone).toBe("9876543210");
      // ₹520 − ₹50 coupon, free delivery (≥ ₹300), ₹20 packaging, GST 5% of ₹470 = ₹23.50
      expect(order.bill).toEqual({ itemTotal: 52000, discount: 5000, deliveryFee: 0, packaging: 2000, gst: 2350, total: 52000 - 5000 + 2000 + 2350 });
      expect(trackingToken).toBeTruthy();
      code = order.code;
      token = trackingToken!;
    });

    it("lets the guest track it with the token only", async () => {
      await request(http).get(`/orders/${code}`).query({ t: token }).expect(200);
      await request(http).get(`/orders/${code}`).expect(404);
      await request(http).get(`/orders/${code}`).query({ t: "wrong-token" }).expect(404);
      const stranger = await customerUser();
      await request(http).get(`/orders/${code}`).set("Authorization", stranger.auth).expect(404);
    });


    it("validates details", async () => {
      const res = await request(http).post("/orders").send(guestOrder({ customer: { name: "", phone: "123", address: "" } })).expect(400);
      expect(res.body.issues.map((i: { path: string }) => i.path)).toEqual(expect.arrayContaining(["customer.name", "customer.phone"]));
    });

    it("refuses orders when the cafe is closed", async () => {
      await setStore({ accepting_orders: false });
      await request(http).post("/orders").send(guestOrder()).expect(409);
      await setStore({ accepting_orders: true });
    });

    it("refuses sold-out items", async () => {
      const { sql } = await import("./helpers.js");
      const db = sql();
      await db`update menu_items set is_available = false where slug = 'veg-kurkure-momos'`;
      const res = await request(http).post("/orders").send(guestOrder()).expect(409);
      expect(res.body.unavailable).toEqual(["veg-kurkure-momos"]);
      await db`update menu_items set is_available = true where slug = 'veg-kurkure-momos'`;
      await db.end();
    });
  });

  describe("logged-in customers", () => {
    it("see their own orders", async () => {
      const me = await customerUser();
      const placed = await request(http).post("/orders").set("Authorization", me.auth).send(guestOrder()).expect(201);
      const mine = await request(http).get("/me/orders").set("Authorization", me.auth).expect(200);
      expect(mine.body.map((o: { code: string }) => o.code)).toEqual([placed.body.order.code]);
      await request(http).get(`/orders/${placed.body.order.code}`).set("Authorization", me.auth).expect(200);
    });

    it("can't use staff endpoints", async () => {
      const me = await customerUser();
      await request(http).get("/admin/orders").set("Authorization", me.auth).expect(403);
      await request(http).get("/admin/orders").expect(401);
    });
  });

  describe("staff", () => {
    it("moves a delivery order through its steps", async () => {
      const kitchen = await staffUser("kitchen");
      const { body } = await request(http).post("/orders").send(guestOrder()).expect(201);
      const code = body.order.code;

      const board = await request(http).get("/admin/orders").set("Authorization", kitchen.auth).expect(200);
      expect(board.body.some((o: { code: string }) => o.code === code)).toBe(true);

      for (const status of ["accepted", "preparing", "out_for_delivery", "completed"]) {
        const res = await request(http).patch(`/admin/orders/${code}/status`).set("Authorization", kitchen.auth).send({ status }).expect(200);
        expect(res.body.status).toBe(status);
      }
      const final = staffOrderView.parse((await request(http).get(`/admin/orders/${code}`).set("Authorization", kitchen.auth)).body);
      expect(final.events.map((e) => e.status)).toEqual(["placed", "accepted", "preparing", "out_for_delivery", "completed"]);
    });

    it("blocks impossible moves", async () => {
      const kitchen = await staffUser("kitchen");
      const { body } = await request(http).post("/orders").send(guestOrder({ mode: "takeaway" })).expect(201);
      const code = body.order.code;
      await request(http).patch(`/admin/orders/${code}/status`).set("Authorization", kitchen.auth).send({ status: "completed" }).expect(409);
      await request(http).patch(`/admin/orders/${code}/status`).set("Authorization", kitchen.auth).send({ status: "accepted" }).expect(200);
      await request(http).patch(`/admin/orders/${code}/status`).set("Authorization", kitchen.auth).send({ status: "preparing" }).expect(200);
      // Takeaway orders are collected, never sent out.
      await request(http).patch(`/admin/orders/${code}/status`).set("Authorization", kitchen.auth).send({ status: "out_for_delivery" }).expect(409);
    });

    it("only lets managers and owners cancel, with a reason", async () => {
      const kitchen = await staffUser("kitchen");
      const manager = await staffUser("manager");
      const { body } = await request(http).post("/orders").send(guestOrder()).expect(201);
      const code = body.order.code;
      await request(http).post(`/admin/orders/${code}/cancel`).set("Authorization", kitchen.auth).send({ reason: "Out of milk" }).expect(403);
      await request(http).post(`/admin/orders/${code}/cancel`).set("Authorization", manager.auth).send({ reason: "" }).expect(400);
      const res = await request(http).post(`/admin/orders/${code}/cancel`).set("Authorization", manager.auth).send({ reason: "Out of milk" }).expect(201);
      expect(res.body.status).toBe("cancelled");
      expect(res.body.cancelReason).toBe("Out of milk");
    });

    it("marks cash orders paid", async () => {
      const manager = await staffUser("manager");
      const { body } = await request(http).post("/orders").send(guestOrder()).expect(201);
      const res = await request(http).post(`/admin/orders/${body.order.code}/mark-paid`).set("Authorization", manager.auth).expect(201);
      expect(res.body.paymentStatus).toBe("paid");
    });

    it("rejects forged or expired tokens", async () => {
      await request(http).get("/admin/orders").set("Authorization", "Bearer not-a-jwt").expect(401);
    });

    it("reports who is logged in", async () => {
      const owner = await staffUser("owner");
      const res = await request(http).get("/me").set("Authorization", owner.auth).expect(200);
      expect(res.body).toMatchObject({ id: owner.id, role: "owner" });
    });
  });

  describe("live tracking", () => {
    it("streams the current state, then each change", async () => {
      const kitchen = await staffUser("kitchen");
      const { body } = await request(http).post("/orders").send(guestOrder()).expect(201);
      const { order, trackingToken } = body;

      await app.listen(0);
      const port = (app.getHttpServer().address() as { port: number }).port;
      const received: string[] = [];

      await new Promise<void>((resolve, reject) => {
        const req = httpRequest({ port, path: `/orders/${order.code}/events?t=${trackingToken}`, headers: { accept: "text/event-stream" } }, (res) => {
          res.setEncoding("utf8");
          let buffer = "";
          res.on("data", (chunk: string) => {
            buffer += chunk;
            for (const block of buffer.split("\n\n").slice(0, -1)) {
              const data = block.split("\n").find((l) => l.startsWith("data: "));
              if (data && block.includes("event: order")) received.push(JSON.parse(data.slice(6)).status);
            }
            buffer = buffer.slice(buffer.lastIndexOf("\n\n") + 2);
            if (received.length === 1) {
              void request(http).patch(`/admin/orders/${order.code}/status`).set("Authorization", kitchen.auth).send({ status: "accepted" }).catch(reject);
            }
            if (received.length >= 2) {
              req.destroy();
              resolve();
            }
          });
        });
        req.on("error", (e) => (received.length >= 2 ? resolve() : reject(e)));
        req.end();
        setTimeout(() => reject(new Error(`timed out, got ${received.join(",")}`)), 8000);
      });

      expect(received).toEqual(["placed", "accepted"]);
    });
  });
});

describe("customer accounts (e2e)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;

  beforeAll(async () => {
    const { createApp } = await import("../src/main.js");
    app = await createApp();
    await app.init();
    http = app.getHttpServer();
  });
  afterAll(async () => {
    await app.close();
  });

  it("creates a profile on first login and lets the customer name it", async () => {
    const me = await customerUser();
    const first = await request(http).get("/me/profile").set("Authorization", me.auth).expect(200);
    expect(first.body).toMatchObject({ id: me.id, phone: "9876543210", name: null });
    const named = await request(http).patch("/me/profile").set("Authorization", me.auth).send({ name: "Riya" }).expect(200);
    expect(named.body.name).toBe("Riya");
    await request(http).get("/me/profile").expect(401);
  });

  it("keeps exactly one default address", async () => {
    const me = await customerUser();
    const a1 = await request(http).post("/me/addresses").set("Authorization", me.auth).send({ label: "Home", line: "Flat 1204, Tower B, Antriksh Forest" }).expect(201);
    expect(a1.body[0].isDefault).toBe(true);
    const a2 = await request(http).post("/me/addresses").set("Authorization", me.auth).send({ label: "Work", line: "Office 5, Sector 62 tech park", isDefault: true }).expect(201);
    expect(a2.body.filter((a: { isDefault: boolean }) => a.isDefault).map((a: { label: string }) => a.label)).toEqual(["Work"]);
    const work = a2.body.find((a: { label: string }) => a.label === "Work");
    const after = await request(http).delete(`/me/addresses/${work.id}`).set("Authorization", me.auth).expect(200);
    expect(after.body).toHaveLength(1);
    expect(after.body[0]).toMatchObject({ label: "Home", isDefault: true });
    await request(http).post("/me/addresses").set("Authorization", me.auth).send({ line: "short" }).expect(400);
  });

  it("never shows one customer another's addresses", async () => {
    const a = await customerUser();
    const b = await customerUser();
    const saved = await request(http).post("/me/addresses").set("Authorization", a.auth).send({ line: "Flat 9, Tower C, Antriksh Forest" }).expect(201);
    expect((await request(http).get("/me/addresses").set("Authorization", b.auth).expect(200)).body).toEqual([]);
    await request(http).delete(`/me/addresses/${saved.body[0].id}`).set("Authorization", b.auth).expect(404);
    await request(http).patch(`/me/addresses/${saved.body[0].id}`).set("Authorization", b.auth).send({ label: "Mine now" }).expect(404);
  });
});
