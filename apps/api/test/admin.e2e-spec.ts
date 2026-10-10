import type { INestApplication } from "@nestjs/common";
import type { AdminCoupon, AdminMenuCategory, AuditEntry } from "@coffeecat/shared";
import request from "supertest";
import { setStore, sql, staffUser } from "./helpers.js";

process.env.NODE_ENV = "test";

describe("admin management (e2e)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;
  let owner: Awaited<ReturnType<typeof staffUser>>;
  let manager: Awaited<ReturnType<typeof staffUser>>;
  let kitchen: Awaited<ReturnType<typeof staffUser>>;

  beforeAll(async () => {
    await setStore({ accepting_orders: true, opens: "00:00", closes: "00:00" });
    const { createApp } = await import("../src/main.js");
    app = await createApp();
    await app.init();
    http = app.getHttpServer();
    [owner, manager, kitchen] = await Promise.all([staffUser("owner"), staffUser("manager"), staffUser("kitchen")]);
  });

  afterAll(async () => {
    // Leave the shared test menu as seeded for the other suites.
    await request(http).post("/admin/menu/items/hazelnut-latte/archive").set("Authorization", owner.auth);
    await app.close();
  });

  const publicItem = async (id: string) => {
    const menu = await request(http).get("/menu").expect(200);
    return menu.body.categories.flatMap((c: AdminMenuCategory) => c.sections.flatMap((s) => s.items)).find((i: { id: string }) => i.id === id);
  };

  describe("menu", () => {
    it("lets managers add a dish that appears on the public menu straight away", async () => {
      const res = await request(http)
        .post("/admin/menu/items")
        .set("Authorization", manager.auth)
        .send({ sectionId: "hot-coffee", name: "Hazelnut Latte", description: "Latte with hazelnut syrup.", foodType: "veg", pricePaise: 15000 })
        .expect(201);
      expect(res.body.id).toBe("hazelnut-latte");
      expect(await publicItem("hazelnut-latte")).toMatchObject({ name: "Hazelnut Latte", pricePaise: 15000, isAvailable: true });
    });

    it("gives duplicate names their own web address", async () => {
      const res = await request(http).post("/admin/menu/items").set("Authorization", manager.auth).send({ sectionId: "hot-coffee", name: "Hazelnut Latte", foodType: "veg", pricePaise: 16000 }).expect(201);
      expect(res.body.id).toBe("hazelnut-latte-2");
    });

    it("changes prices, and new orders use the new price", async () => {
      await request(http).patch("/admin/menu/items/hazelnut-latte").set("Authorization", manager.auth).send({ pricePaise: 17000 }).expect(200);
      const quote = await request(http).post("/orders/quote").send({ lines: [{ itemId: "hazelnut-latte", qty: 1 }], mode: "takeaway" }).expect(200);
      expect(quote.body.bill.itemTotal).toBe(17000);
    });

    it("lets kitchen staff mark dishes sold out but not change prices", async () => {
      await request(http).patch("/admin/menu/items/hazelnut-latte/availability").set("Authorization", kitchen.auth).send({ isAvailable: false }).expect(200);
      expect((await publicItem("hazelnut-latte")).isAvailable).toBe(false);
      await request(http).patch("/admin/menu/items/hazelnut-latte").set("Authorization", kitchen.auth).send({ pricePaise: 1 }).expect(403);
      await request(http).post("/admin/menu/items").set("Authorization", kitchen.auth).send({ sectionId: "hot-coffee", name: "X", foodType: "veg", pricePaise: 100 }).expect(403);
    });

    it("validates dish details", async () => {
      const res = await request(http).post("/admin/menu/items").set("Authorization", manager.auth).send({ sectionId: "hot-coffee", name: "", foodType: "veg", pricePaise: 5 }).expect(400);
      expect(res.body.issues.map((i: { path: string }) => i.path)).toEqual(expect.arrayContaining(["name", "pricePaise"]));
      await request(http).post("/admin/menu/items").set("Authorization", manager.auth).send({ sectionId: "nope", name: "Ghost", foodType: "veg", pricePaise: 1000 }).expect(404);
    });

    it("archives a dish without breaking past orders", async () => {
      await request(http).post("/admin/menu/items/hazelnut-latte-2/archive").set("Authorization", manager.auth).expect(201);
      expect(await publicItem("hazelnut-latte-2")).toBeUndefined();
      await request(http).post("/orders/quote").send({ lines: [{ itemId: "hazelnut-latte-2", qty: 1 }], mode: "takeaway" }).expect(200);
    });

    it("reorders dishes and rejects stale lists", async () => {
      const full = await request(http).get("/admin/menu").set("Authorization", manager.auth).expect(200);
      const desserts = (full.body as AdminMenuCategory[]).find((c) => c.id === "desserts")!.sections[0];
      const reversed = desserts.items.map((i) => i.id).reverse();
      await request(http).post(`/admin/menu/sections/${desserts.id}/items/order`).set("Authorization", manager.auth).send({ ids: reversed }).expect(201);
      const menu = await request(http).get("/menu").expect(200);
      expect(menu.body.categories.find((c: { id: string }) => c.id === "desserts").sections[0].items.map((i: { id: string }) => i.id)).toEqual(reversed);
      await request(http).post(`/admin/menu/sections/${desserts.id}/items/order`).set("Authorization", manager.auth).send({ ids: reversed.slice(1) }).expect(400);
    });

    it("hides a category from customers when deactivated", async () => {
      await request(http).patch("/admin/menu/categories/soups").set("Authorization", manager.auth).send({ active: false }).expect(200);
      const menu = await request(http).get("/menu").expect(200);
      expect(menu.body.categories.map((c: { id: string }) => c.id)).not.toContain("soups");
      await request(http).patch("/admin/menu/categories/soups").set("Authorization", manager.auth).send({ active: true }).expect(200);
    });
  });

  describe("store settings", () => {
    it("lets kitchen pause orders but not change hours", async () => {
      const paused = await request(http).patch("/admin/store").set("Authorization", kitchen.auth).send({ acceptingOrders: false }).expect(200);
      expect(paused.body.openNow).toBe(false);
      await request(http).patch("/admin/store").set("Authorization", kitchen.auth).send({ opens: "09:00" }).expect(403);
      await request(http).patch("/admin/store").set("Authorization", kitchen.auth).send({ acceptingOrders: true }).expect(200);
    });

    it("lets managers change fees, which the next quote uses", async () => {
      await request(http).patch("/admin/store").set("Authorization", manager.auth).send({ packagingFeePaise: 1000 }).expect(200);
      const quote = await request(http).post("/orders/quote").send({ lines: [{ itemId: "cold-coffee", qty: 1 }], mode: "takeaway" }).expect(200);
      expect(quote.body.bill.packaging).toBe(1000);
      await request(http).patch("/admin/store").set("Authorization", manager.auth).send({ packagingFeePaise: 2000 }).expect(200);
    });

    it("rejects invalid hours", async () => {
      await request(http).patch("/admin/store").set("Authorization", manager.auth).send({ opens: "25:00" }).expect(400);
    });
  });

  describe("coupons", () => {
    it("creates a coupon customers can use, with a usage count", async () => {
      await request(http)
        .post("/admin/coupons")
        .set("Authorization", manager.auth)
        .send({ code: "chai10", description: "10% off, up to ₹40", kind: "percent", value: 1000, maxDiscountPaise: 4000, usageLimit: 1 })
        .expect(201);
      const quote = await request(http).post("/orders/quote").send({ lines: [{ itemId: "cold-coffee", qty: 2 }], mode: "takeaway", couponCode: "CHAI10" }).expect(200);
      expect(quote.body.bill.discount).toBe(2600);
      await request(http)
        .post("/orders")
        .send({ lines: [{ itemId: "cold-coffee", qty: 2 }], mode: "takeaway", couponCode: "CHAI10", customer: { name: "A", phone: "9876543210" }, paymentMethod: "cod" })
        .expect(201);
      const list = await request(http).get("/admin/coupons").set("Authorization", manager.auth).expect(200);
      expect((list.body as AdminCoupon[]).find((c) => c.code === "CHAI10")?.used).toBe(1);
      // Usage limit of 1 is now reached.
      const again = await request(http).post("/orders/quote").send({ lines: [{ itemId: "cold-coffee", qty: 2 }], mode: "takeaway", couponCode: "CHAI10" }).expect(200);
      expect(again.body.coupon).toMatchObject({ applied: false, message: "CHAI10 has been fully used." });
    });

    it("refuses duplicates and bad percentages, and kitchen can't manage coupons", async () => {
      await request(http).post("/admin/coupons").set("Authorization", manager.auth).send({ code: "CHAI10", description: "dup", kind: "flat", value: 100 }).expect(409);
      await request(http).post("/admin/coupons").set("Authorization", manager.auth).send({ code: "HUGE", description: "too much", kind: "percent", value: 20000 }).expect(400);
      await request(http).get("/admin/coupons").set("Authorization", kitchen.auth).expect(403);
    });

    it("deactivates coupons", async () => {
      await request(http).patch("/admin/coupons/purr50").set("Authorization", manager.auth).send({ active: false }).expect(200);
      const quote = await request(http).post("/orders/quote").send({ lines: [{ itemId: "cold-coffee", qty: 4 }], mode: "takeaway", couponCode: "PURR50" }).expect(200);
      expect(quote.body.coupon.applied).toBe(false);
      await request(http).patch("/admin/coupons/purr50").set("Authorization", manager.auth).send({ active: true }).expect(200);
    });
  });

  describe("staff and audit", () => {
    it("only owners manage staff", async () => {
      await request(http).get("/admin/staff").set("Authorization", manager.auth).expect(403);
      const list = await request(http).get("/admin/staff").set("Authorization", owner.auth).expect(200);
      expect(list.body.length).toBeGreaterThanOrEqual(3);
    });

    it("changes roles, effective immediately", async () => {
      const temp = await staffUser("kitchen");
      await request(http).get("/admin/coupons").set("Authorization", temp.auth).expect(403);
      await request(http).patch(`/admin/staff/${temp.id}`).set("Authorization", owner.auth).send({ role: "manager" }).expect(200);
      await request(http).get("/admin/coupons").set("Authorization", temp.auth).expect(200);
      await request(http).patch(`/admin/staff/${temp.id}`).set("Authorization", owner.auth).send({ active: false }).expect(200);
      await request(http).get("/admin/orders").set("Authorization", temp.auth).expect(403);
    });

    it("never leaves the cafe without an owner, and owners can't demote themselves", async () => {
      await request(http).patch(`/admin/staff/${owner.id}`).set("Authorization", owner.auth).send({ role: "kitchen" }).expect(400);
      const db = sql();
      await db`update staff set active = false where role = 'owner' and user_id <> ${owner.id}`;
      await db.end();
      const other = await staffUser("owner");
      await request(http).patch(`/admin/staff/${owner.id}`).set("Authorization", other.auth).send({ active: false }).expect(200);
      await request(http).patch(`/admin/staff/${other.id}`).set("Authorization", other.auth).send({ active: false }).expect(400);
      await request(http).patch(`/admin/staff/${owner.id}`).set("Authorization", other.auth).send({ active: true }).expect(200);
    });

    it("records who changed what", async () => {
      await request(http).get("/admin/audit").set("Authorization", manager.auth).expect(403);
      const log = await request(http).get("/admin/audit").set("Authorization", owner.auth).expect(200);
      const actions = (log.body as AuditEntry[]).map((e) => `${e.action}:${e.entity}`);
      expect(actions).toEqual(expect.arrayContaining(["create:item", "price-change:item", "sold-out:item", "archive:item", "pause-orders:store", "create:coupon", "update:staff"]));
      const priceChange = (log.body as AuditEntry[]).find((e) => e.action === "price-change");
      expect(priceChange?.actorEmail).toBe("manager@test.local"); // synced from the login token
    });
  });
});
