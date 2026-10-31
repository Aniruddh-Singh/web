"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { countItems, type MenuItem } from "@/lib/menu";
import { useHydrated, useStore } from "@/lib/store";
import { useStoreStatus } from "@/lib/store-status";
import { DishGrid } from "./dish-tile";
import { ChevronRight } from "./icons";
import { useMenu } from "./menu-provider";
import { FilterBar, matchesFilters, SortSelect, sortItems, sorts, type Filters, type Sort } from "./menu-filters";
import { scrollToElement } from "./motion/smooth-scroll";

export function ClosedNotice() {
  const status = useStoreStatus();
  if (!status || status.openNow) return null;
  return (
    <p role="status" className="animate-rise mt-4 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-nonveg">
      The cafe isn&apos;t taking orders right now. You can still browse the menu.
    </p>
  );
}

type Group = { id: string; title?: string; href?: string; sections: { id: string; name?: string; items: MenuItem[] }[] };

/**
 * Full menu with URL state (/menu?category=coffee&sort=price-asc&veg=1), so back/forward and shared
 * links restore the same view. Search filters instantly and reaches the URL after a short pause.
 */
export function MenuBrowser() {
  const { categories } = useMenu();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const savedIds = useStore((s) => s.saved);

  const categoryParam = params.get("category");
  const category = categories.some((c) => c.id === categoryParam) ? categoryParam! : "all";
  const sortParam = params.get("sort") as Sort | null;
  const sort: Sort = sortParam && sorts.includes(sortParam) ? sortParam : "popular";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferredQuery = useDeferredValue(query);
  const filters: Filters = {
    query: deferredQuery,
    vegOnly: params.get("veg") === "1",
    bestsellers: params.get("bestsellers") === "1",
    // Saved ids live in this browser only; ignore the flag until they're read.
    saved: params.get("saved") === "1" && hydrated,
  };

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce search into the URL; filtering itself uses the local value.
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (query === urlQuery) return;
    const t = window.setTimeout(() => setParams({ q: query.trim() || null }), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setParams reads the latest params each render
  }, [query, urlQuery]);

  const groups = useMemo<Group[]>(() => {
    const scoped = category === "all" ? categories : categories.filter((c) => c.id === category);
    const keep = (i: MenuItem) => matchesFilters(i, filters, savedIds);
    if (sort !== "popular") {
      const items = sortItems(scoped.flatMap((c) => c.sections.flatMap((s) => s.items)).filter(keep), sort);
      return items.length ? [{ id: "sorted", sections: [{ id: "sorted", items }] }] : [];
    }
    return scoped
      .map((c) => ({
        id: c.id,
        title: c.name,
        href: `/menu/${c.id}`,
        sections: c.sections
          .map((s) => ({ id: s.id, name: c.sections.length > 1 ? s.name : undefined, items: sortItems(s.items.filter(keep), sort) }))
          .filter((s) => s.items.length),
      }))
      .filter((g) => g.sections.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters is rebuilt each render from its primitive parts below
  }, [categories, category, sort, filters.query, filters.vegOnly, filters.bestsellers, filters.saved, savedIds]);

  const total = groups.reduce((n, g) => n + g.sections.reduce((m, s) => m + s.items.length, 0), 0);
  const resultsRef = useRef<HTMLDivElement>(null);

  const pickCategory = (id: string) => {
    setParams({ category: id === "all" ? null : id });
    // Bring the top of the list into view if we've scrolled past it.
    const top = resultsRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) scrollToElement(resultsRef.current, -140);
  };

  const clearAll = () => {
    setQuery("");
    router.replace(pathname, { scroll: false });
  };

  return (
    <section aria-labelledby="menu-heading" className="mx-auto max-w-6xl px-4 pb-10">
      <div className="mt-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mocha">Made fresh, always</p>
          <h1 id="menu-heading" className="mt-1.5 font-display text-4xl font-bold">
            Explore our menu
          </h1>
        </div>
        <p className="text-sm text-muted">Prices exclude 5% GST, added at checkout.</p>
      </div>
      <ClosedNotice />

      <div className="mt-3">
        <FilterBar
          sticky={false}
          filters={{ ...filters, query }}
          onChange={(f) => {
            if (f.query !== query) return setQuery(f.query);
            setParams({ veg: f.vegOnly ? "1" : null, bestsellers: f.bestsellers ? "1" : null, saved: f.saved ? "1" : null });
          }}
          placeholder="Search coffee, pizza, momos…"
        >
          <SortSelect value={sort} onChange={(s) => setParams({ sort: s === "popular" ? null : s })} />
        </FilterBar>
      </div>

      <CategoryChips active={category} onPick={pickCategory} />

      <div ref={resultsRef} className="scroll-mt-36">
        <p className="mt-4 text-sm text-muted" aria-live="polite">
          {total} dish{total === 1 ? "" : "es"}
          {filters.saved && " saved"}
        </p>

        {total === 0 ? (
          <div className="animate-rise py-16 text-center">
            <p className="font-display text-xl font-bold">{filters.saved && !savedIds.length ? "No saved dishes yet" : "No dishes match"}</p>
            <p className="mt-1 text-sm text-muted">{filters.saved && !savedIds.length ? "Tap the heart on any dish to save it here." : "Try another search or category."}</p>
            <button type="button" onClick={clearAll} className="mt-4 h-11 rounded-xl border border-line bg-paper px-5 text-sm font-semibold hover:bg-surface">
              Clear filters
            </button>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.id} aria-label={g.title ?? "Dishes"} className="pt-6">
              {g.title && (
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-display text-2xl font-bold">{g.title}</h2>
                  {g.href && (
                    <Link href={g.href} className="flex min-h-11 items-center gap-0.5 text-sm font-semibold text-roast hover:underline">
                      Category page <ChevronRight />
                    </Link>
                  )}
                </div>
              )}
              {g.sections.map((s) => (
                <div key={s.id} className="mt-3">
                  {s.name && <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{s.name}</h3>}
                  <DishGrid items={s.items} query={filters.query} label={s.name ?? g.title} />
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </section>
  );
}

/** Sticky, horizontally scrolling category tabs; the active tab is kept in view. */
function CategoryChips({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  const { categories } = useMenu();
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !chip) return;
    list.scrollTo({ left: chip.offsetLeft - list.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  const chips = [{ id: "all", name: "All", count: categories.reduce((n, c) => n + countItems(c), 0) }, ...categories.map((c) => ({ id: c.id, name: c.name, count: countItems(c) }))];
  return (
    <nav aria-label="Menu categories" className="sticky top-16 z-20 -mx-4 border-b border-line bg-cream/95 px-4 py-2.5 backdrop-blur">
      <ul ref={listRef} className="no-scrollbar relative flex gap-2 overflow-x-auto">
        {chips.map((c) => {
          const on = active === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onPick(c.id)}
                className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors active:scale-95 ${
                  on ? "bg-ink text-paper shadow-sm" : "border border-line bg-paper text-coffee hover:border-mocha"
                }`}
              >
                {c.name}
                <span className={`text-xs ${on ? "text-crema" : "text-muted"}`}>{c.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Same footprint as the menu while the URL state is read on the client. */
export function MenuSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10" aria-busy="true" aria-label="Loading menu">
      <div className="skeleton mt-8 h-4 w-32" />
      <div className="skeleton mt-3 h-10 w-64" />
      <div className="skeleton mt-6 h-11 w-full" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-line bg-paper">
            <div className="skeleton aspect-[4/3] rounded-none" />
            <div className="space-y-2 p-4">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
