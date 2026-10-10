"use client";

import { useMemo, useState } from "react";
import type { MenuItem } from "@/lib/menu";
import { useMenu } from "./menu-provider";
import { DishRow } from "./dish-row";
import { FilterBar, noFilters, type Filters } from "./menu-filters";

type Sort = "popular" | "price-asc" | "price-desc";

/** Category page body: section chips, filters, sorting and the dish list. */
export function CategoryListing({ categoryId }: { categoryId: string }) {
  const category = useMenu().getCategory(categoryId)!;
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [section, setSection] = useState("all");
  const [sort, setSort] = useState<Sort>("popular");

  const groups = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const keep = (i: MenuItem) =>
      (!q || i.name.toLowerCase().includes(q)) && (!filters.vegOnly || i.type === "veg") && (!filters.bestsellers || i.recommended);
    const sections = category.sections
      .filter((s) => section === "all" || s.id === section)
      .map((s) => ({ ...s, items: s.items.filter(keep) }))
      .filter((s) => s.items.length);
    if (sort === "popular") return sections;
    // Price sorts flatten the sections into one list.
    const flat = sections.flatMap((s) => s.items).sort((a, b) => (sort === "price-asc" ? a.price - b.price : b.price - a.price));
    return flat.length ? [{ id: "sorted", name: "", items: flat }] : [];
  }, [category, filters, section, sort]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} placeholder={`Search in ${category.name}`}>
        <label className="flex shrink-0 items-center">
          <span className="sr-only">Sort dishes</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-full border border-line bg-paper px-3 text-sm font-medium text-ink focus:border-roast focus:outline-none"
          >
            <option value="popular">Sort: Popular</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </FilterBar>

      {category.sections.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Sections">
          {[{ id: "all", name: "All" }, ...category.sections].map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={section === s.id}
              onClick={() => setSection(s.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors active:scale-95 ${
                section === s.id ? "bg-ink text-paper" : "bg-surface text-ink hover:bg-foam"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {total} dish{total === 1 ? "" : "es"}
      </p>

      {total === 0 ? (
        <div className="animate-rise py-16 text-center">
          <p className="font-semibold">Nothing here matches your filters.</p>
          <button
            type="button"
            onClick={() => {
              setFilters(noFilters);
              setSection("all");
            }}
            className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-surface"
          >
            Clear filters
          </button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.id} aria-label={g.name || "Dishes"} className="mt-2">
            {g.name && category.sections.length > 1 && <h2 className="mt-6 font-display text-lg font-bold">{g.name}</h2>}
            <ul className="grid lg:grid-cols-2 lg:gap-x-12">
              {g.items.map((i) => (
                <DishRow key={i.id} item={i} query={filters.query} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
