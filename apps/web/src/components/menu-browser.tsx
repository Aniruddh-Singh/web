"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { countItems, type MenuItem } from "@/lib/menu";
import { useHydrated, useStore } from "@/lib/store";
import { useStoreStatus } from "@/lib/store-status";
import { DishGrid } from "./dish-tile";
import { ChevronRight, CloseIcon, SearchIcon } from "./icons";
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

/** Full menu driven by the URL (/menu?category=coffee&sort=price-asc&veg=1), so back/forward and shared links restore the view. */
export function MenuBrowser() {
  return <MenuView search={useSearchParams().toString()} />;
}

/** The default full menu, prerendered as the Suspense fallback so the page's HTML always lists every dish. */
export function MenuStatic() {
  return <MenuView search="" />;
}

function MenuView({ search }: { search: string }) {
  const { categories } = useMenu();
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const savedIds = useStore((s) => s.saved);
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const categoryParam = params.get("category");
  const category = categories.some((c) => c.id === categoryParam) ? categoryParam! : "all";
  const sortParam = params.get("sort") as Sort | null;
  const sort: Sort = sortParam && sorts.includes(sortParam) ? sortParam : "popular";
  const vegOnly = params.get("veg") === "1";
  const bestsellers = params.get("bestsellers") === "1";
  // Saved ids live in this browser only; ignore the flag until they're read.
  const saved = params.get("saved") === "1" && hydrated;
  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferredQuery = useDeferredValue(query);
  const filters: Filters = { query: deferredQuery, vegOnly, bestsellers, saved };

  // Read the live URL rather than a render-time copy, so quick successive changes don't drop each other.
  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce search into the URL; filtering itself uses the local value.
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (query === urlQuery) return;
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => window.clearTimeout(t);
  }, [query, urlQuery, router, pathname]);

  const groups = useMemo<Group[]>(() => {
    const scoped = category === "all" ? categories : categories.filter((c) => c.id === category);
    const keep = (i: MenuItem) => matchesFilters(i, { query: deferredQuery, vegOnly, bestsellers, saved }, savedIds);
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
  }, [categories, category, sort, deferredQuery, vegOnly, bestsellers, saved, savedIds]);

  const total = groups.reduce((n, g) => n + g.sections.reduce((m, s) => m + s.items.length, 0), 0);
  const resultsRef = useRef<HTMLDivElement>(null);

  const bringResultsIntoView = () => {
    const top = resultsRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) scrollToElement(resultsRef.current, -140);
  };

  const pickCategory = (id: string) => {
    setParams({ category: id === "all" ? null : id });
    bringResultsIntoView();
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

      <div className="mt-2">
        <FilterBar
          sticky={false}
          showSearch={false}
          filters={{ ...filters, query }}
          onChange={(f) => setParams({ veg: f.vegOnly ? "1" : null, bestsellers: f.bestsellers ? "1" : null, saved: f.saved ? "1" : null })}
        >
          <SortSelect value={sort} onChange={(s) => setParams({ sort: s === "popular" ? null : s })} />
        </FilterBar>
      </div>

      <CategoryBar active={category} onPick={pickCategory} query={query} onQuery={setQuery} onSearchFocus={bringResultsIntoView} />

      <div ref={resultsRef} className="scroll-mt-36">
        <p className="mt-4 text-sm text-muted" aria-live="polite">
          {total} dish{total === 1 ? "" : "es"}
          {saved && " saved"}
          {deferredQuery.trim() && ` for “${deferredQuery.trim()}”`}
        </p>

        {total === 0 ? (
          <div className="animate-rise py-16 text-center">
            <p className="font-display text-xl font-bold">{saved && !savedIds.length ? "No saved dishes yet" : "No dishes match"}</p>
            <p className="mt-1 text-sm text-muted">{saved && !savedIds.length ? "Tap the heart on any dish to save it here." : "Try another search or category."}</p>
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
                    <Link href={g.href} className="flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-semibold text-roast hover:underline">
                      Category page <ChevronRight />
                    </Link>
                  )}
                </div>
              )}
              {g.sections.map((s) => (
                <div key={s.id} className="mt-3">
                  {s.name && <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{s.name}</h3>}
                  <DishGrid items={s.items} query={deferredQuery} label={s.name ?? g.title} />
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </section>
  );
}

/**
 * Sticky bar: search plus horizontally scrolling category tabs (active tab kept in view).
 * On phones search is an icon that expands over the tabs; from md it's always open.
 */
function CategoryBar({
  active,
  onPick,
  query,
  onQuery,
  onSearchFocus,
}: {
  active: string;
  onPick: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
  onSearchFocus: () => void;
}) {
  const { categories } = useMenu();
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const searching = expanded || query !== "";

  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !chip) return;
    list.scrollTo({ left: chip.offsetLeft - list.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active, searching]);

  const chips = [{ id: "all", name: "All", count: categories.reduce((n, c) => n + countItems(c), 0) }, ...categories.map((c) => ({ id: c.id, name: c.name, count: countItems(c) }))];

  return (
    <nav aria-label="Menu categories" className="sticky top-16 z-20 -mx-4 flex items-center gap-2 border-b border-line/60 bg-cream/60 px-4 py-2.5 backdrop-blur-xl backdrop-saturate-150">
      <div className={`relative shrink-0 ${searching ? "flex-1 md:flex-none" : ""}`}>
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          aria-label="Search the menu"
          className={`grid h-10 w-10 place-items-center rounded-full border border-line bg-paper text-coffee hover:border-mocha md:hidden ${searching ? "hidden" : ""}`}
        >
          <SearchIcon className="h-5 w-5" />
        </button>
        <label className={`relative md:block md:w-64 ${searching ? "block" : "hidden"}`}>
          <span className="sr-only">Search the menu</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onFocus={onSearchFocus}
            onKeyDown={(e) => e.key === "Escape" && (onQuery(""), setExpanded(false))}
            placeholder="Search dishes…"
            className="h-10 w-full rounded-full border border-line bg-paper pl-9 pr-10 text-[16px] placeholder:text-muted focus:border-roast focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              onQuery("");
              setExpanded(false);
            }}
            aria-label="Close search"
            className={`absolute right-0.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink ${query || expanded ? "" : "md:hidden"}`}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </label>
      </div>

      <ul ref={listRef} className={`no-scrollbar relative min-w-0 flex-1 gap-2 overflow-x-auto ${searching ? "hidden md:flex" : "flex"}`}>
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
