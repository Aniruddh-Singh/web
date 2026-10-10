import type { INestApplication } from "@nestjs/common";
import { menuResponse } from "@coffeecat/shared";
import request from "supertest";

process.env.NODE_ENV = "test";

describe("public menu and store (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { createApp } = await import("../src/main.js");
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports healthy with a live database", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body).toMatchObject({ status: "ok", db: "ok" });
  });

  it("serves the whole seeded menu in the shared shape", async () => {
    const res = await request(app.getHttpServer()).get("/menu").expect(200);
    const menu = menuResponse.parse(res.body);
    expect(menu.categories).toHaveLength(11);
    const items = menu.categories.flatMap((c) => c.sections.flatMap((s) => s.items));
    expect(items).toHaveLength(144);
    expect(items.find((i) => i.id === "cold-coffee")).toMatchObject({ pricePaise: 13000, foodType: "veg", isBestseller: true });
    expect(items.find((i) => i.id === "egg-burger")?.foodType).toBe("egg");
  });

  it("only gives dishes the cafe's own photos, never stock", async () => {
    const res = await request(app.getHttpServer()).get("/menu").expect(200);
    const items = menuResponse.parse(res.body).categories.flatMap((c) => c.sections.flatMap((s) => s.items));
    const withPhoto = items.filter((i) => i.imageUrl).map((i) => i.id).sort();
    expect(withPhoto).toEqual(["cafe-latte", "cappuccino", "chilli-cheese-toast", "cold-coffee", "mint-lemonade"]);
  });

  it("returns store settings with an India-time open flag", async () => {
    const res = await request(app.getHttpServer()).get("/store").expect(200);
    expect(res.body).toMatchObject({ freeDeliveryAbovePaise: 30000, gstBps: 500, acceptingOrders: true });
    expect(typeof res.body.openNow).toBe("boolean");
  });

  it("sends security headers", async () => {
    const res = await request(app.getHttpServer()).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    // Rate limiting is skipped under NODE_ENV=test (tests place many orders); see app.module.ts.
  });
});

describe("row level security", () => {
  it("is enabled on every table", async () => {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    const rows = await sql`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname not like '__drizzle%'`;
    await sql.end();
    expect(rows.length).toBe(13);
    expect(rows.filter((r) => !r.relrowsecurity).map((r) => r.relname)).toEqual([]);
  });
});
