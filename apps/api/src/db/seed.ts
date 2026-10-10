/*
 * Loads the cafe's current data into the database. Idempotent: rows are matched on slug/code
 * and updated in place, so it can be re-run safely. Sources (unverified public listings, see
 * PROJECT_PLAN.md) are the files the prototype site was built from.
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { createDb } from "./client.js";
import { categories, coupons, menuItems, sections, storeSettings } from "./schema.js";

type RawItem = { id: string; name: string; type: "veg" | "non-veg" | "egg"; price: number; recommended: boolean; quantity?: string; note?: string };
type RawData = { menu: { categories: { id: string; name: string; sections: { id: string; name: string; items: RawItem[] }[] }[] } };

const webData = (file: string) => new URL(`../../../web/src/data/${file}`, import.meta.url);
const data = JSON.parse(readFileSync(webData("coffee-cat.json"), "utf8")) as RawData;
const descriptions = (JSON.parse(readFileSync(webData("descriptions.json"), "utf8")) as { items: Record<string, string> }).items;

/** The cafe's own photos only. Stock "representative" photos are a site presentation choice, not menu data. */
const itemPhotos: Record<string, string> = {
  cappuccino: "/images/cafe/cappuccino-thumb.jpg",
  "cafe-latte": "/images/cafe/cafe-latte-thumb.jpg",
  "cold-coffee": "/images/cafe/cold-coffee-thumb.jpg",
  "mint-lemonade": "/images/cafe/mint-lemonade-thumb.jpg",
  "chilli-cheese-toast": "/images/cafe/chilli-cheese-toast.jpg",
};

const categoryPhotos: Record<string, string> = {
  "healthy-zone": "/images/healthy.jpg",
  "pizza-pasta": "/images/pizza.jpg",
  "burgers-sandwiches": "/images/burger.jpg",
  munchies: "/images/cafe/chilli-cheese-toast.jpg",
  starters: "/images/starters.jpg",
  momos: "/images/momos.jpg",
  noodles: "/images/noodles.jpg",
  soups: "/images/soups.jpg",
  coffee: "/images/cafe/cold-coffee-thumb.jpg",
  drinks: "/images/cafe/mint-lemonade-thumb.jpg",
  desserts: "/images/desserts.jpg",
};

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const { db, client } = createDb(url, 1);

let itemCount = 0;
await db.transaction(async (tx) => {
  for (const [ci, c] of data.menu.categories.entries()) {
    const [cat] = await tx
      .insert(categories)
      .values({ slug: c.id, name: c.name, sort: ci, imageUrl: categoryPhotos[c.id] ?? null })
      .onConflictDoUpdate({ target: categories.slug, set: { name: c.name, sort: ci, imageUrl: categoryPhotos[c.id] ?? null } })
      .returning({ id: categories.id });

    for (const [si, s] of c.sections.entries()) {
      const [sec] = await tx
        .insert(sections)
        .values({ categoryId: cat.id, slug: s.id, name: s.name, sort: si })
        .onConflictDoUpdate({ target: sections.slug, set: { categoryId: cat.id, name: s.name, sort: si } })
        .returning({ id: sections.id });

      for (const [ii, i] of s.items.entries()) {
        const row = {
          sectionId: sec.id,
          slug: i.id,
          name: i.name,
          description: descriptions[i.id] ?? "",
          foodType: i.type === "non-veg" ? ("non_veg" as const) : i.type,
          pricePaise: Math.round(i.price * 100),
          quantityLabel: i.quantity ?? null,
          note: i.note ?? null,
          isBestseller: i.recommended,
          imageUrl: itemPhotos[i.id] ?? null,
          sort: ii,
        };
        await tx.insert(menuItems).values(row).onConflictDoUpdate({ target: menuItems.slug, set: row });
        itemCount++;
      }
    }
  }

  // Placeholder hours (public listings disagree); fees from the prototype; free delivery from the menu card.
  await tx
    .insert(storeSettings)
    .values({
      id: 1,
      opens: "10:00",
      closes: "23:00",
      acceptingOrders: true,
      deliveryFeePaise: 3500,
      freeDeliveryAbovePaise: 30000,
      packagingFeePaise: 2000,
      gstBps: 500,
      deliveryRadiusKm: 5,
    })
    .onConflictDoNothing();

  await tx
    .insert(coupons)
    .values({ code: "PURR50", description: "₹50 off on orders above ₹399", kind: "flat", value: 5000, minOrderPaise: 39900 })
    .onConflictDoNothing();
});

const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(menuItems);
console.log(`Seeded ${data.menu.categories.length} categories, ${itemCount} items (${n} in table), store settings and PURR50.`);
await client.end();
