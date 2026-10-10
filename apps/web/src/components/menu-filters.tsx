"use client";

import { FoodMark } from "./food-mark";
import { SearchIcon, CloseIcon } from "./icons";

export type Filters = { query: string; vegOnly: boolean; bestsellers: boolean };
export const noFilters: Filters = { query: "", vegOnly: false, bestsellers: false };

export function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors active:scale-95 ${
        on ? "border-roast bg-foam text-ink" : "border-line bg-paper text-muted hover:text-ink"
      }`}
    >
      {children}
      {on && <CloseIcon className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Sticky search + toggles bar shared by the full menu and category pages. */
export function FilterBar({
  filters,
  onChange,
  placeholder = "Search in menu",
  children,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-line bg-paper px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">{placeholder}</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder={placeholder}
            className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[16px] transition-colors placeholder:text-muted focus:border-roast focus:bg-paper focus:outline-none"
          />
        </label>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <Toggle on={filters.vegOnly} onChange={(v) => onChange({ ...filters, vegOnly: v })}>
            <FoodMark type="veg" className="h-3.5 w-3.5" /> Veg only
          </Toggle>
          <Toggle on={filters.bestsellers} onChange={(v) => onChange({ ...filters, bestsellers: v })}>
            Bestsellers
          </Toggle>
          {children}
        </div>
      </div>
    </div>
  );
}
