import "server-only";
import { menuResponse, type MenuResponse } from "@coffeecat/shared";
import { cacheLife, cacheTag } from "next/cache";
import raw from "@/data/coffee-cat.json";
import descriptions from "@/data/descriptions.json";
import { indexMenu } from "./menu-index";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * The menu from the API, cached across requests and prerendered into pages. Staff edits
 * refresh it on demand through /api/revalidate (tag "menu"); otherwise it refreshes hourly.
 * Failures throw, and are never cached.
 */
async function fetchMenu(): Promise<MenuResponse> {
  "use cache";
  cacheTag("menu");
  cacheLife("hours");
  let res: Response;
  try {
    res = await fetch(`${API_URL}/menu`);
  } catch (e) {
    throw new Error(`Could not reach the API at ${API_URL} to load the menu. Is it running? (${(e as Error).message})`);
  }
  if (!res.ok) throw new Error(`The API returned ${res.status} for /menu.`);
  return menuResponse.parse(await res.json());
}

/** The original menu file the database was seeded from, shaped like the API's response. */
function bundledMenu(): MenuResponse {
  const own: Record<string, string> = {
    cappuccino: "/images/cafe/cappuccino-thumb.jpg",
    "cafe-latte": "/images/cafe/cafe-latte-thumb.jpg",
    "cold-coffee": "/images/cafe/cold-coffee-thumb.jpg",
    "mint-lemonade": "/images/cafe/mint-lemonade-thumb.jpg",
    "chilli-cheese-toast": "/images/cafe/chilli-cheese-toast.jpg",
  };
  const desc = descriptions.items as Record<string, string>;
  return {
    categories: raw.menu.categories.map((c, ci) => ({
      id: c.id,
      name: c.name,
      sort: ci,
      imageUrl: null,
      sections: c.sections.map((s, si) => ({
        id: s.id,
        name: s.name,
        sort: si,
        items: s.items.map((i, ii) => ({
          id: i.id,
          name: i.name,
          description: desc[i.id] ?? "",
          foodType: i.type === "non-veg" ? "non_veg" : (i.type as "veg" | "egg"),
          pricePaise: Math.round(i.price * 100),
          quantityLabel: (i as { quantity?: string }).quantity ?? null,
          note: (i as { note?: string }).note ?? null,
          isBestseller: i.recommended,
          isAvailable: true,
          imageUrl: own[i.id] ?? null,
          sort: ii,
        })),
      })),
    })),
  };
}

let warned = false;

/**
 * Production: the API is required (a failed refresh keeps serving the last good menu).
 * Development: if the API isn't running, fall back to the bundled menu so pages still load,
 * with a warning. The fallback isn't cached, so the real menu returns as soon as the API is up.
 */
export async function getMenuData(): Promise<MenuResponse> {
  try {
    return await fetchMenu();
  } catch (e) {
    if (process.env.NODE_ENV === "production") throw e;
    if (!warned) {
      warned = true;
      console.warn(`\n⚠ ${(e as Error).message}\n  Showing the bundled menu instead. Start the API with: pnpm --filter @coffeecat/api dev\n`);
    }
    return bundledMenu();
  }
}

export async function getMenu() {
  return indexMenu(await getMenuData());
}
