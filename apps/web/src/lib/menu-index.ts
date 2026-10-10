import type { MenuResponse } from "@coffeecat/shared";

/*
 * Menu helpers built from the API's /menu response. Works on the server and in the browser.
 * Items are mapped to the shape the site's components already use (rupee prices, "non-veg").
 */

export type FoodType = "veg" | "non-veg" | "egg";

export type MenuItem = {
  id: string;
  name: string;
  type: FoodType;
  /** Rupees, for display. Orders are priced in paise by the API. */
  price: number;
  recommended: boolean;
  quantity?: string;
  note?: string;
  description: string;
  /** The cafe's own photo of this dish, if any. */
  imageUrl: string | null;
  available: boolean;
};

export type MenuSection = { id: string; name: string; items: MenuItem[] };
export type MenuCategory = { id: string; name: string; imageUrl: string | null; sections: MenuSection[] };
export type ItemContext = { item: MenuItem; category: MenuCategory; section: MenuSection };
export type DishPhoto = { src: string; real: boolean };
export type SearchHit = { item: MenuItem; category: MenuCategory; score: number };

export const countItems = (c: MenuCategory) => c.sections.reduce((n, s) => n + s.items.length, 0);

/**
 * Stock photo per food section, labelled "representative" wherever it appears large. This is a
 * presentation choice, so it lives in the site, not the menu data. Drinks and Healthy Zone are
 * left out on purpose: a photo of one dish must not stand in for a different one.
 */
const sectionStockPhoto: Record<string, string> = {
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

const drinkCategories = new Set(["coffee", "drinks"]);
const preferredDrinks = ["cold-coffee", "cappuccino", "cafe-latte", "mint-lemonade", "choco-frappe", "devil-s-frappe"];

export class MenuIndex {
  readonly categories: MenuCategory[];
  readonly allItems: MenuItem[];
  readonly bestsellers: MenuItem[];
  /** Dishes the cafe has its own photo of. */
  readonly cafeFavourites: MenuItem[];
  private readonly byId: Map<string, ItemContext>;

  constructor(data: MenuResponse) {
    this.categories = data.categories.map((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: c.imageUrl,
      sections: c.sections.map((s) => ({
        id: s.id,
        name: s.name,
        items: s.items.map((i) => ({
          id: i.id,
          name: i.name,
          type: i.foodType === "non_veg" ? "non-veg" : i.foodType,
          price: i.pricePaise / 100,
          recommended: i.isBestseller,
          quantity: i.quantityLabel ?? undefined,
          note: i.note ?? undefined,
          description: i.description,
          imageUrl: i.imageUrl,
          available: i.isAvailable,
        })),
      })),
    }));
    this.byId = new Map(
      this.categories.flatMap((category) => category.sections.flatMap((section) => section.items.map((item) => [item.id, { item, category, section }] as const))),
    );
    this.allItems = [...this.byId.values()].map((c) => c.item);
    this.bestsellers = this.allItems.filter((i) => i.recommended);
    this.cafeFavourites = this.allItems.filter((i) => i.imageUrl);
  }

  getItem = (id: string) => this.byId.get(id)?.item;
  getItemContext = (id: string) => this.byId.get(id);
  getCategory = (id: string) => this.categories.find((c) => c.id === id);
  descriptionFor = (id: string) => this.byId.get(id)?.item.description ?? "";
  imageForCategory = (id: string) => this.getCategory(id)?.imageUrl ?? undefined;
  hasOwnPhoto = (id: string) => Boolean(this.byId.get(id)?.item.imageUrl);

  /** Best photo for a dish: its own photo, else a representative stock photo for its section. */
  photoFor = (id: string): DishPhoto | undefined => {
    const ctx = this.byId.get(id);
    if (!ctx) return undefined;
    if (ctx.item.imageUrl) return { src: ctx.item.imageUrl, real: true };
    const stock = sectionStockPhoto[ctx.section.id];
    return stock ? { src: stock, real: false } : undefined;
  };

  /** Thumbnail for list rows: own photo always, stock only for bestsellers (keeps lists scannable, like the food apps). */
  listPhotoFor = (item: MenuItem): DishPhoto | undefined => {
    if (item.imageUrl) return { src: item.imageUrl, real: true };
    return item.recommended ? this.photoFor(item.id) : undefined;
  };

  private isDrink = (id: string) => drinkCategories.has(this.byId.get(id)?.category.id ?? "");

  /** Pick one dish per category: one with a cafe photo first, then a bestseller, then the first item. */
  private pickFrom(categoryIds: string[], exclude: string): MenuItem[] {
    return categoryIds.flatMap((cid) => {
      const items = this.getCategory(cid)?.sections.flatMap((s) => s.items).filter((i) => i.id !== exclude) ?? [];
      const pick = items.find((i) => i.imageUrl) ?? items.find((i) => i.recommended) ?? items[0];
      return pick ? [pick] : [];
    });
  }

  /** "Goes well with": a drink suggests a spread of snacks; food suggests drinks, cafe-photographed ones first. */
  pairingsFor = (id: string, n = 4): MenuItem[] => {
    if (this.isDrink(id)) return this.pickFrom(["munchies", "momos", "burgers-sandwiches", "desserts", "pizza-pasta"], id).slice(0, n);
    return preferredDrinks
      .filter((d) => d !== id)
      .flatMap((d) => (this.getItem(d) ? [this.getItem(d)!] : []))
      .slice(0, n);
  };

  moreFromSection = (id: string, n = 6): MenuItem[] => {
    const ctx = this.byId.get(id);
    return ctx ? ctx.section.items.filter((i) => i.id !== id).slice(0, n) : [];
  };

  /** Simple ranked search: name prefix > word prefix > name contains > category or description match. */
  searchItems = (query: string): SearchHit[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: SearchHit[] = [];
    for (const { item, category, section } of this.byId.values()) {
      const name = item.name.toLowerCase();
      let score = 0;
      if (name.startsWith(q)) score = 100;
      else if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) score = 80;
      else if (name.includes(q)) score = 60;
      else if (`${category.name} ${section.name}`.toLowerCase().includes(q)) score = 40;
      else if (item.description.toLowerCase().includes(q)) score = 20;
      if (score) hits.push({ item, category, score: score + (item.recommended ? 5 : 0) });
    }
    return hits.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  };
}

const memo = new WeakMap<MenuResponse, MenuIndex>();
/** One index per menu payload. */
export function indexMenu(data: MenuResponse): MenuIndex {
  let idx = memo.get(data);
  if (!idx) memo.set(data, (idx = new MenuIndex(data)));
  return idx;
}
