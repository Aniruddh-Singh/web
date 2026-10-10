"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { countItems, popularSearches } from "@/lib/menu";
import { useMenu } from "./menu-provider";
import { DishRow } from "./dish-row";
import { CloseIcon, SearchIcon } from "./icons";

// Recent searches: a per-device convenience, so plain localStorage is fine.
const RECENT_KEY = "coffee-cat-recent-searches";
const recentListeners = new Set<() => void>();
let recentCache: string[] | null = null;
function readRecent(): string[] {
  if (recentCache) return recentCache;
  try {
    recentCache = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    recentCache = [];
  }
  return recentCache!;
}
function writeRecent(list: string[]) {
  recentCache = list;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
  recentListeners.forEach((l) => l());
}
const emptyList: string[] = [];
function useRecent() {
  return useSyncExternalStore(
    (l) => {
      recentListeners.add(l);
      return () => recentListeners.delete(l);
    },
    readRecent,
    () => emptyList,
  );
}
function remember(q: string) {
  const t = q.trim();
  if (t.length < 2) return;
  writeRecent([t, ...readRecent().filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6));
}

export function SearchView() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferred = useDeferredValue(query);
  const { categories, imageForCategory, searchItems } = useMenu();
  const results = searchItems(deferred);
  const recent = useRecent();
  const input = useRef<HTMLInputElement>(null);
  const q = deferred.trim().toLowerCase();
  const categoryHits = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : [];

  // Keep the URL shareable without triggering navigations.
  useEffect(() => {
    const url = deferred.trim() ? `/search?q=${encodeURIComponent(deferred.trim())}` : "/search";
    window.history.replaceState(null, "", url);
  }, [deferred]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <h1 className="sr-only">Search the menu</h1>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          remember(query);
          input.current?.blur();
        }}
        className="sticky top-16 z-20 -mx-4 bg-paper px-4 py-3"
      >
        <label className="relative block">
          <span className="sr-only">Search for dishes, drinks or categories</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for cold coffee, momos, pizza…"
            enterKeyHint="search"
            className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-12 text-[17px] shadow-[0_2px_12px_rgba(43,26,18,0.06)] transition-colors placeholder:text-muted focus:border-roast focus:bg-paper focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-foam hover:text-ink"
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          )}
        </label>
      </form>

      {!q ? (
        <div className="animate-rise mt-4 space-y-8">
          {recent.length > 0 && (
            <section aria-labelledby="recent">
              <div className="flex items-center justify-between">
                <h2 id="recent" className="font-semibold">Recent searches</h2>
                <button type="button" onClick={() => writeRecent([])} className="text-sm font-semibold text-roast hover:underline">
                  Clear
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={r} type="button" onClick={() => setQuery(r)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-surface active:scale-95">
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section aria-labelledby="popular">
            <h2 id="popular" className="font-semibold">Popular at the cafe</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {popularSearches.map((p) => (
                <button key={p} type="button" onClick={() => setQuery(p)} className="rounded-full bg-surface px-3 py-1.5 text-sm font-medium hover:bg-foam active:scale-95">
                  {p}
                </button>
              ))}
            </div>
          </section>
          <section aria-labelledby="browse">
            <h2 id="browse" className="font-semibold">Browse categories</h2>
            <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/menu/${c.id}`} className="group block text-center">
                    <span className="relative mx-auto block aspect-square w-full max-w-24 overflow-hidden rounded-full ring-2 ring-transparent transition group-hover:ring-crema">
                      <Image src={imageForCategory(c.id) ?? "/images/cafe/interior.jpg"} alt="" fill sizes="96px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    </span>
                    <span className="mt-2 block text-sm font-medium">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="mt-2" aria-live="polite">
          {categoryHits.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2" aria-label="Matching categories">
              {categoryHits.map((c) => (
                <li key={c.id}>
                  <Link href={`/menu/${c.id}`} onClick={() => remember(query)} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm font-medium hover:bg-surface">
                    <span className="relative h-7 w-7 overflow-hidden rounded-full">
                      <Image src={imageForCategory(c.id) ?? "/images/cafe/interior.jpg"} alt="" fill sizes="28px" className="object-cover" />
                    </span>
                    {c.name} <span className="text-muted">{countItems(c)} dishes</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted">
            {results.length ? `${results.length} dish${results.length === 1 ? "" : "es"} for "${deferred.trim()}"` : ""}
          </p>
          {results.length === 0 ? (
            <div className="animate-rise py-14 text-center">
              <p className="font-semibold">No dishes match &ldquo;{deferred.trim()}&rdquo;.</p>
              <p className="mt-1 text-sm text-muted">Check the spelling, or try one of these.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {popularSearches.slice(0, 4).map((p) => (
                  <button key={p} type="button" onClick={() => setQuery(p)} className="rounded-full bg-surface px-3 py-1.5 text-sm font-medium hover:bg-foam">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul onClickCapture={() => remember(query)}>
              {results.slice(0, 40).map((r) => (
                <DishRow key={r.item.id} item={r.item} query={deferred} context={r.category.name} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-9" aria-busy="true">
      <div className="skeleton h-14 w-full" />
      <div className="skeleton mt-8 h-5 w-40" />
      <div className="mt-3 flex gap-2">
        {[64, 80, 56, 72].map((w) => (
          <div key={w} className="skeleton h-8" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}
