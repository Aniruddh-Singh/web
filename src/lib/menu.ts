import raw from "@/data/coffee-cat.json";
import descriptions from "@/data/descriptions.json";

export type FoodType = "veg" | "non-veg" | "egg";

export type MenuItem = {
  id: string;
  name: string;
  type: FoodType;
  price: number;
  recommended: boolean;
  quantity?: string;
  note?: string;
};

export type MenuSection = { id: string; name: string; items: MenuItem[] };
export type MenuCategory = { id: string; name: string; sections: MenuSection[] };

export const business = raw.business;
export const dataStatus = raw._meta.status;
export const categories = raw.menu.categories as MenuCategory[];

export const allItems: MenuItem[] = categories.flatMap((c) =>
  c.sections.flatMap((s) => s.items),
);

type ItemContext = { item: MenuItem; category: MenuCategory; section: MenuSection };

const itemIndex = new Map<string, ItemContext>(
  categories.flatMap((category) =>
    category.sections.flatMap((section) =>
      section.items.map((item) => [item.id, { item, category, section }] as const),
    ),
  ),
);

export const getItem = (id: string) => itemIndex.get(id)?.item;
export const getItemContext = (id: string) => itemIndex.get(id);
export const getCategory = (id: string) => categories.find((c) => c.id === id);
export const countItems = (c: MenuCategory) => c.sections.reduce((n, s) => n + s.items.length, 0);

/** Draft copy, see descriptions.json. The owner must approve before launch. */
export const descriptionFor = (id: string) =>
  (descriptions.items as Record<string, string>)[id] ?? "";

// ---------- photos ----------

/** The cafe's own dish photos, cropped square. Only ever shown on the dish they picture. */
const itemImage: Record<string, string> = {
  cappuccino: "/images/cafe/cappuccino-thumb.jpg",
  "cafe-latte": "/images/cafe/cafe-latte-thumb.jpg",
  "cold-coffee": "/images/cafe/cold-coffee-thumb.jpg",
  "mint-lemonade": "/images/cafe/mint-lemonade-thumb.jpg",
  "chilli-cheese-toast": "/images/cafe/chilli-cheese-toast.jpg",
};

/**
 * Stock photo per food section, labelled "representative" wherever it appears large.
 * Drinks sections are left out on purpose: a real photo of one drink must not stand in
 * for a different drink.
 */
const sectionImage: Record<string, string> = {
  // healthy-zone left out: it mixes steaks, sandwiches and eggs, so no single stock photo is honest.
  "veg-pizza-9": "/images/pizza.jpg",
  "non-veg-pizza-9": "/images/pizza.jpg",
  "veg-pasta": "/images/pasta.jpg",
  "non-veg-pasta": "/images/pasta.jpg",
  "veg-burgers": "/images/burger.jpg",
  "non-veg-burgers": "/images/burger.jpg",
  "veg-sandwiches": "/images/sandwich.jpg",
  "non-veg-sandwiches": "/images/sandwich.jpg",
  munchies: "/images/munchies.jpg",
  starters: "/images/starters.jpg",
  momos: "/images/momos.jpg",
  "veg-noodles": "/images/noodles.jpg",
  "non-veg-noodles": "/images/noodles.jpg",
  "veg-soups": "/images/soups.jpg",
  "non-veg-soups": "/images/soups.jpg",
  desserts: "/images/desserts.jpg",
};

const categoryImage: Record<string, string> = {
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

export type DishPhoto = { src: string; real: boolean };

/** Best photo for a dish: its own photo, else a representative stock photo for its section. */
export function photoFor(id: string): DishPhoto | undefined {
  if (itemImage[id]) return { src: itemImage[id], real: true };
  const ctx = itemIndex.get(id);
  const stock = ctx && sectionImage[ctx.section.id];
  return stock ? { src: stock, real: false } : undefined;
}

/** Thumbnail for list rows: own photo always, stock only for bestsellers (keeps lists scannable, like the food apps). */
export function listPhotoFor(item: MenuItem): DishPhoto | undefined {
  if (itemImage[item.id]) return { src: itemImage[item.id], real: true };
  return item.recommended ? photoFor(item.id) : undefined;
}

export const imageForCategory = (categoryId: string) => categoryImage[categoryId];
export const hasOwnPhoto = (id: string) => Boolean(itemImage[id]);
export const cafeFavourites = Object.keys(itemImage).map((id) => getItem(id)!);

// ---------- lists ----------

export const bestsellers = allItems.filter((i) => i.recommended);

const drinkCategories = new Set(["coffee", "drinks"]);
const isDrink = (id: string) => drinkCategories.has(itemIndex.get(id)?.category.id ?? "");

/** Pick one dish per category: one with a cafe photo first, then a bestseller, then the first item. */
function pickFrom(categoryIds: string[], exclude: string): MenuItem[] {
  return categoryIds.flatMap((cid) => {
    const items = getCategory(cid)?.sections.flatMap((s) => s.items).filter((i) => i.id !== exclude) ?? [];
    const pick = items.find((i) => itemImage[i.id]) ?? items.find((i) => i.recommended) ?? items[0];
    return pick ? [pick] : [];
  });
}

/** "Goes well with": a drink suggests a spread of snacks; food suggests drinks, cafe-photographed ones first. */
export function pairingsFor(id: string, n = 4): MenuItem[] {
  if (isDrink(id)) return pickFrom(["munchies", "momos", "burgers-sandwiches", "desserts", "pizza-pasta"], id).slice(0, n);
  const drinks = ["cold-coffee", "cappuccino", "cafe-latte", "mint-lemonade", "choco-frappe", "devil-s-frappe"];
  return drinks.filter((d) => d !== id).map((d) => getItem(d)!).slice(0, n);
}

export function moreFromSection(id: string, n = 6): MenuItem[] {
  const ctx = itemIndex.get(id);
  if (!ctx) return [];
  return ctx.section.items.filter((i) => i.id !== id).slice(0, n);
}

// ---------- search ----------

export type SearchHit = { item: MenuItem; category: MenuCategory; score: number };

/** Simple ranked search: name prefix > word prefix > name contains > category or description match. */
export function searchItems(query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const { item, category, section } of itemIndex.values()) {
    const name = item.name.toLowerCase();
    let score = 0;
    if (name.startsWith(q)) score = 100;
    else if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) score = 80;
    else if (name.includes(q)) score = 60;
    else if (`${category.name} ${section.name}`.toLowerCase().includes(q)) score = 40;
    else if (descriptionFor(item.id).toLowerCase().includes(q)) score = 20;
    if (score) hits.push({ item, category, score: score + (item.recommended ? 5 : 0) });
  }
  return hits.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
}

export const popularSearches = ["Cold coffee", "Momos", "Pizza", "Burger", "Pasta", "Frappe", "Brownie"];

// ---------- money ----------

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Bill rules for the prototype. Confirm real fees and GST treatment with the owner. */
export const pricing = {
  deliveryFee: 35,
  // From the cafe's printed menu card.
  freeDeliveryAbove: raw.business.free_delivery_above_inr,
  packagingPerOrder: 20,
  gstRate: 0.05,
  coupons: {
    PURR50: { label: "₹50 off on orders above ₹399", min: 399, off: 50 },
  } as Record<string, { label: string; min: number; off: number }>,
};
