"use client";

import type { MenuItem } from "@/lib/menu";
import { FoodMark } from "./food-mark";
import { SearchIcon, CloseIcon } from "./icons";

export type Filters = { query: string; vegOnly: boolean; bestsellers: boolean; saved: boolean };
export const noFilters: Filters = { query: "", vegOnly: false, bestsellers: false, saved: false };

/** Shared dish filter: name search, veg only, bestsellers, saved (wishlist ids). */
export function matchesFilters(i: MenuItem, f: Filters, savedIds: string[]) {
  const q = f.query.trim().toLowerCase();
  return (!q || i.name.toLowerCase().includes(q)) && (!f.vegOnly || i.type === "veg") && (!f.bestsellers || i.recommended) && (!f.saved || savedIds.includes(i.id));
}

export function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors active:scale-95 ${
        on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-muted hover:border-mocha hover:text-ink"
      }`}
    >
      {children}
      {on && <CloseIcon className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Search + toggles bar shared by the full menu and category pages. */
export function FilterBar({
  filters,
  onChange,
  placeholder = "Search in menu",
  sticky = true,
  children,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  placeholder?: string;
  sticky?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`-mx-4 bg-cream px-4 py-3 ${sticky ? "sticky top-16 z-20 border-b border-line" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">{placeholder}</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-[16px] transition-colors placeholder:text-muted focus:border-roast focus:bg-paper focus:outline-none"
          />
        </label>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <Toggle on={filters.vegOnly} onChange={(v) => onChange({ ...filters, vegOnly: v })}>
            <FoodMark type="veg" className="h-3.5 w-3.5" /> Veg only
          </Toggle>
          <Toggle on={filters.bestsellers} onChange={(v) => onChange({ ...filters, bestsellers: v })}>
            Bestsellers
          </Toggle>
          <Toggle on={filters.saved} onChange={(v) => onChange({ ...filters, saved: v })}>
            ♥ Saved
          </Toggle>
          {children}
        </div>
      </div>
    </div>
  );
}

export type Sort = "popular" | "price-asc" | "price-desc";
export const sorts: Sort[] = ["popular", "price-asc", "price-desc"];
const sortLabel: Record<Sort, string> = { popular: "Sort: Popular", "price-asc": "Price: low to high", "price-desc": "Price: high to low" };

export function SortSelect({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  return (
    <label className="flex shrink-0 items-center">
      <span className="sr-only">Sort dishes</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Sort)}
        className="h-10 rounded-full border border-line bg-paper px-3 text-sm font-medium text-ink focus:border-roast focus:outline-none"
      >
        {sorts.map((s) => (
          <option key={s} value={s}>
            {sortLabel[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** "Popular" keeps the cafe's menu order with bestsellers first; price sorts are plain. */
export function sortItems<T extends MenuItem>(items: T[], sort: Sort): T[] {
  if (sort === "popular") return [...items].sort((a, b) => Number(b.recommended) - Number(a.recommended));
  return [...items].sort((a, b) => (sort === "price-asc" ? a.price - b.price : b.price - a.price));
}
