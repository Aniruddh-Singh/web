import "server-only";
import { menuResponse, type MenuResponse } from "@coffeecat/shared";
import { cacheLife, cacheTag } from "next/cache";
import raw from "@/data/coffee-cat.json";
import descriptions from "@/data/descriptions.json";
import { indexMenu } from "./menu-index";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Bundled-menu fallback: always in development; in production only with ALLOW_BUNDLED_MENU=true. */
const fallbackAllowed = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_BUNDLED_MENU === "true";

type MenuResult = { ok: true; menu: MenuResponse } | { ok: false; error: string };

/**
 * The menu from the API, cached across requests and prerendered into pages. Staff edits
 * refresh it on demand through /api/revalidate (tag "menu"); otherwise it refreshes hourly.
 *
 * Errors thrown inside a cached function abort prerendering even if caught later, so when a
 * fallback is allowed the failure is returned as a value and cached only briefly ("minutes":
 * short enough to recover quickly, long enough to stay part of the prerender). In strict
 * production it still throws, so a failed refresh keeps serving the last good menu.
 */
async function fetchMenu(): Promise<MenuResult> {
  "use cache";
  cacheTag("menu");
  let failure: string | null = null;
  let menu: MenuResponse | null = null;
  try {
    const res = await fetch(`${API_URL}/menu`);
    if (res.ok) menu = menuResponse.parse(await res.json());
    else failure = `The API returned ${res.status} for /menu.`;
  } catch (e) {
    failure = `Could not reach the API at ${API_URL} to load the menu. Is it running? (${(e as Error).message})`;
  }
  if (menu) {
    cacheLife("hours");
    return { ok: true, menu };
  }
  if (!fallbackAllowed()) throw new Error(failure!);
  cacheLife("minutes");
  return { ok: false, error: failure! };
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

export async function getMenuData(): Promise<MenuResponse> {
  const result = await fetchMenu();
  if (result.ok) return result.menu;
  if (!warned) {
    warned = true;
    console.warn(`\n⚠ ${result.error}\n  Showing the bundled menu instead. Start the API with: pnpm --filter @coffeecat/api dev\n`);
  }
  return bundledMenu();
}

export async function getMenu() {
  return indexMenu(await getMenuData());
}
