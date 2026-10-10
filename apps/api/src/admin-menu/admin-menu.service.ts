import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  slugify,
  type AdminMenuCategory,
  type CategoryInput,
  type CategoryPatch,
  type ItemInput,
  type ItemPatch,
  type SectionInput,
  type SectionPatch,
} from "@coffeecat/shared";
import { and, asc, eq, isNull, max, sql } from "drizzle-orm";
import type { AuthUser } from "../auth/auth.types.js";
import { AuditService } from "../audit/audit.service.js";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { categories, menuItems, sections } from "../db/schema.js";
import { MenuService } from "../menu/menu.service.js";
import { RevalidateService } from "../revalidate/revalidate.service.js";

type Table = typeof categories | typeof sections | typeof menuItems;

/** Staff edits to the menu. Every change is audited, clears the API cache and refreshes the site. */
@Injectable()
export class AdminMenuService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly menu: MenuService,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {}

  private changed() {
    this.menu.invalidate();
    this.revalidate.trigger(["menu"]);
  }

  /** A slug that isn't taken yet ("cold-coffee", "cold-coffee-2", …). */
  private async freeSlug(table: Table, wanted: string) {
    const base = slugify(wanted);
    for (let n = 1; n < 100; n++) {
      const candidate = n === 1 ? base : `${base}-${n}`;
      const [hit] = await this.db.select({ slug: table.slug }).from(table).where(eq(table.slug, candidate));
      if (!hit) return candidate;
    }
    throw new ConflictException("Couldn't make a unique web address for that name.");
  }

  private async category(slug: string) {
    const [c] = await this.db.select().from(categories).where(eq(categories.slug, slug));
    if (!c) throw new NotFoundException("That category doesn't exist.");
    return c;
  }

  private async section(slug: string) {
    const [s] = await this.db.select().from(sections).where(eq(sections.slug, slug));
    if (!s) throw new NotFoundException("That section doesn't exist.");
    return s;
  }

  private async item(slug: string) {
    const [i] = await this.db.select().from(menuItems).where(and(eq(menuItems.slug, slug), isNull(menuItems.archivedAt)));
    if (!i) throw new NotFoundException("That dish doesn't exist.");
    return i;
  }

  // ---------- read ----------

  async full(): Promise<AdminMenuCategory[]> {
    const [cats, secs, items] = await Promise.all([
      this.db.select().from(categories).orderBy(asc(categories.sort)),
      this.db.select().from(sections).orderBy(asc(sections.sort)),
      this.db.select().from(menuItems).where(isNull(menuItems.archivedAt)).orderBy(asc(menuItems.sort)),
    ]);
    return cats.map((c) => ({
      id: c.slug,
      name: c.name,
      sort: c.sort,
      active: c.active,
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
        })),
    }));
  }

  // ---------- categories ----------

  async createCategory(input: CategoryInput, actor: AuthUser) {
    const slug = await this.freeSlug(categories, input.slug ?? input.name);
    const [{ top }] = await this.db.select({ top: max(categories.sort) }).from(categories);
    const [row] = await this.db
      .insert(categories)
      .values({ slug, name: input.name, imageUrl: input.imageUrl ?? null, active: input.active ?? true, sort: (top ?? -1) + 1 })
      .returning();
    await this.audit.log(actor, "create", "category", slug, null, row);
    this.changed();
    return { id: slug };
  }

  async updateCategory(slug: string, patch: CategoryPatch, actor: AuthUser) {
    const before = await this.category(slug);
    const [after] = await this.db.update(categories).set(patch).where(eq(categories.id, before.id)).returning();
    await this.audit.log(actor, "update", "category", slug, before, after);
    this.changed();
    return { id: slug };
  }

  // ---------- sections ----------

  async createSection(input: SectionInput, actor: AuthUser) {
    const cat = await this.category(input.categoryId);
    const slug = await this.freeSlug(sections, input.slug ?? input.name);
    const [{ top }] = await this.db.select({ top: max(sections.sort) }).from(sections).where(eq(sections.categoryId, cat.id));
    const [row] = await this.db.insert(sections).values({ slug, name: input.name, categoryId: cat.id, sort: (top ?? -1) + 1 }).returning();
    await this.audit.log(actor, "create", "section", slug, null, row);
    this.changed();
    return { id: slug };
  }

  async updateSection(slug: string, patch: SectionPatch, actor: AuthUser) {
    const before = await this.section(slug);
    const set: Partial<typeof sections.$inferInsert> = {};
    if (patch.name) set.name = patch.name;
    if (patch.categoryId) set.categoryId = (await this.category(patch.categoryId)).id;
    const [after] = await this.db.update(sections).set(set).where(eq(sections.id, before.id)).returning();
    await this.audit.log(actor, "update", "section", slug, before, after);
    this.changed();
    return { id: slug };
  }

  // ---------- items ----------

  async createItem(input: ItemInput, actor: AuthUser) {
    const sec = await this.section(input.sectionId);
    const slug = await this.freeSlug(menuItems, input.slug ?? input.name);
    const [{ top }] = await this.db.select({ top: max(menuItems.sort) }).from(menuItems).where(eq(menuItems.sectionId, sec.id));
    const [row] = await this.db
      .insert(menuItems)
      .values({
        slug,
        sectionId: sec.id,
        name: input.name,
        description: input.description,
        foodType: input.foodType,
        pricePaise: input.pricePaise,
        quantityLabel: input.quantityLabel ?? null,
        note: input.note ?? null,
        isBestseller: input.isBestseller,
        isAvailable: input.isAvailable,
        imageUrl: input.imageUrl ?? null,
        sort: (top ?? -1) + 1,
      })
      .returning();
    await this.audit.log(actor, "create", "item", slug, null, row);
    this.changed();
    return { id: slug };
  }

  async updateItem(slug: string, patch: ItemPatch, actor: AuthUser) {
    const before = await this.item(slug);
    const { sectionId, ...rest } = patch;
    const set: Partial<typeof menuItems.$inferInsert> = { ...rest };
    if (sectionId) set.sectionId = (await this.section(sectionId)).id;
    const [after] = await this.db.update(menuItems).set(set).where(eq(menuItems.id, before.id)).returning();
    await this.audit.log(actor, before.pricePaise !== after.pricePaise ? "price-change" : "update", "item", slug, before, after);
    this.changed();
    return { id: slug };
  }

  async setAvailability(slug: string, isAvailable: boolean, actor: AuthUser) {
    const before = await this.item(slug);
    if (before.isAvailable === isAvailable) return { id: slug, isAvailable };
    await this.db.update(menuItems).set({ isAvailable }).where(eq(menuItems.id, before.id));
    await this.audit.log(actor, isAvailable ? "back-in-stock" : "sold-out", "item", slug, { isAvailable: before.isAvailable }, { isAvailable });
    this.changed();
    return { id: slug, isAvailable };
  }

  /** Removes a dish from the menu. Past orders keep their own copy of the name and price. */
  async archiveItem(slug: string, actor: AuthUser) {
    const before = await this.item(slug);
    await this.db.update(menuItems).set({ archivedAt: new Date() }).where(eq(menuItems.id, before.id));
    await this.audit.log(actor, "archive", "item", slug, before, null);
    this.changed();
    return { id: slug };
  }

  // ---------- ordering ----------

  async reorder(kind: "categories" | "sections" | "items", parent: string | null, ids: string[], actor: AuthUser) {
    const table = kind === "categories" ? categories : kind === "sections" ? sections : menuItems;
    if (new Set(ids).size !== ids.length) throw new BadRequestException("Each id may appear only once.");
    let scope = sql`true`;
    if (kind === "sections") scope = sql`${sections.categoryId} = ${(await this.category(parent!)).id}`;
    if (kind === "items") scope = sql`${menuItems.sectionId} = ${(await this.section(parent!)).id} and ${menuItems.archivedAt} is null`;
    const existing = await this.db.select({ slug: table.slug }).from(table).where(scope);
    const known = new Set(existing.map((r) => r.slug));
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw new BadRequestException("The list doesn't match what's there now. Refresh and try again.");
    }
    await this.db.transaction(async (tx) => {
      for (const [i, id] of ids.entries()) await tx.update(table).set({ sort: i }).where(eq(table.slug, id));
    });
    await this.audit.log(actor, "reorder", kind, parent, null, ids);
    this.changed();
    return { ids };
  }
}
