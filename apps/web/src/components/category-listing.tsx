"use client";

import { useMemo, useState } from "react";
import { useMenu } from "./menu-provider";
import { useStore } from "@/lib/store";
import { DishGrid } from "./dish-tile";
import { FilterBar, matchesFilters, noFilters, SortSelect, sortItems, type Filters, type Sort } from "./menu-filters";

/** Category page body: section chips, filters, sorting and the dish list. */
export function CategoryListing({ categoryId }: { categoryId: string }) {
  const category = useMenu().getCategory(categoryId)!;
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [section, setSection] = useState("all");
  const [sort, setSort] = useState<Sort>("popular");
  const savedIds = useStore((s) => s.saved);

  const groups = useMemo(() => {
    const sections = category.sections
      .filter((s) => section === "all" || s.id === section)
      .map((s) => ({ ...s, items: sortItems(s.items.filter((i) => matchesFilters(i, filters, savedIds)), sort) }))
      .filter((s) => s.items.length);
    if (sort === "popular") return sections;
    // Price sorts flatten the sections into one list.
    const flat = sortItems(sections.flatMap((s) => s.items), sort);
    return flat.length ? [{ id: "sorted", name: "", items: flat }] : [];
  }, [category, filters, section, sort, savedIds]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} placeholder={`Search in ${category.name}`}>
        <SortSelect value={sort} onChange={setSort} />
      </FilterBar>

      {category.sections.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Sections">
          {[{ id: "all", name: "All" }, ...category.sections].map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={section === s.id}
              onClick={() => setSection(s.id)}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors active:scale-95 ${
                section === s.id ? "bg-ink text-paper" : "border border-line bg-paper text-coffee hover:border-mocha"
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
            <div className="mt-3">
              <DishGrid items={g.items} query={filters.query} label={g.name || "Dishes"} />
            </div>
          </section>
        ))
      )}
    </div>
  );
}
