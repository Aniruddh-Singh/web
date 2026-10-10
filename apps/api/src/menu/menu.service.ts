import { Inject, Injectable } from "@nestjs/common";
import type { MenuResponse } from "@coffeecat/shared";
import { asc, isNull } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { categories, menuItems, sections } from "../db/schema.js";

const CACHE_MS = 30_000;

@Injectable()
export class MenuService {
  private cache: { at: number; value: MenuResponse } | null = null;

  constructor(@Inject(DB) private readonly db: Database) {}

  /** Public menu: active categories, their sections and non-archived items, in display order. */
  async getMenu(): Promise<MenuResponse> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;

    const [cats, secs, items] = await Promise.all([
      this.db.select().from(categories).orderBy(asc(categories.sort)),
      this.db.select().from(sections).orderBy(asc(sections.sort)),
      this.db.select().from(menuItems).where(isNull(menuItems.archivedAt)).orderBy(asc(menuItems.sort)),
    ]);

    const value: MenuResponse = {
      categories: cats
        .filter((c) => c.active)
        .map((c) => ({
          id: c.slug,
          name: c.name,
          sort: c.sort,
          imageUrl: c.imageUrl,
          sections: secs
            .filter((s) => s.categoryId === c.id)
            .map((s) => ({
              id: s.slug,
              name: s.name,
              sort: s.sort,
              items: items
                .filter((i) => i.sectionId === s.id)
                .map((i) => ({
                  id: i.slug,
                  name: i.name,
                  description: i.description,
                  foodType: i.foodType,
                  pricePaise: i.pricePaise,
                  quantityLabel: i.quantityLabel,
                  note: i.note,
                  isBestseller: i.isBestseller,
                  isAvailable: i.isAvailable,
                  imageUrl: i.imageUrl,
                  sort: i.sort,
                })),
            }))
            .filter((s) => s.items.length > 0),
        }))
        .filter((c) => c.sections.length > 0),
    };

    this.cache = { at: Date.now(), value };
    return value;
  }

  /** Called after any staff edit so the next read is fresh. */
  invalidate() {
    this.cache = null;
  }
}
