"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { countItems, type MenuCategory, type MenuItem } from "@/lib/menu";
import { useMenu } from "./menu-provider";
import { cartCount, useStore } from "@/lib/store";
import { useStoreStatus } from "@/lib/store-status";
import { DishRow } from "./dish-row";
import { ChevronRight } from "./icons";
import { FilterBar, noFilters, type Filters } from "./menu-filters";
import { scrollToElement } from "./motion/smooth-scroll";

function filterCategories(categories: MenuCategory[], filters: Filters): MenuCategory[] {
  const q = filters.query.trim().toLowerCase();
  const keep = (i: MenuItem) =>
    (!q || i.name.toLowerCase().includes(q)) &&
    (!filters.vegOnly || i.type === "veg") &&
    (!filters.bestsellers || i.recommended);
  return categories
    .map((c) => ({
      ...c,
      sections: c.sections.map((s) => ({ ...s, items: s.items.filter(keep) })).filter((s) => s.items.length),
    }))
    .filter((c) => c.sections.length);
}

export function ClosedNotice() {
  const status = useStoreStatus();
  if (!status || status.openNow) return null;
  return (
    <p role="status" className="animate-rise mt-4 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-nonveg">
      The cafe isn&apos;t taking orders right now. You can still browse the menu.
    </p>
  );
}

/** Full menu: every category in one scroll, with a sticky category index. */
export function MenuBrowser() {
  const { categories } = useMenu();
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [active, setActive] = useState(categories[0]?.id ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const visible = useMemo(() => filterCategories(categories, filters), [categories, filters]);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const hasCart = useStore(cartCount) > 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id.replace("cat-", ""));
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [visible]);

  const jumpTo = (id: string) => {
    setSheetOpen(false);
    scrollToElement(document.getElementById(`cat-${id}`));
  };

  return (
    <section aria-labelledby="menu-heading" className="mx-auto max-w-6xl px-4">
      <div className="mt-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 id="menu-heading" className="font-display text-3xl font-bold">
          Full menu
        </h1>
        <p className="text-sm text-muted">Menu prices exclude 5% GST, which is added at checkout.</p>
      </div>
      <ClosedNotice />

      <div className="mt-4">
        <FilterBar filters={filters} onChange={setFilters} placeholder="Search in menu" />
      </div>

      <div className="mt-2 grid gap-8 md:grid-cols-[200px_1fr]">
        <nav aria-label="Menu categories" className="hidden md:block">
          <ul className="sticky top-35 space-y-0.5 border-r border-line pr-2">
            {visible.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(c.id)}
                  aria-current={active === c.id ? "true" : undefined}
                  className={`flex w-full justify-between rounded-l-lg px-3 py-2 text-left text-sm transition-colors ${
                    active === c.id ? "bg-foam font-semibold text-ink shadow-[inset_-3px_0_0_var(--roast)]" : "text-muted hover:text-ink"
                  }`}
                >
                  <span>{c.name}</span>
                  <span>{countItems(c)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          {visible.length === 0 && (
            <div className="animate-rise py-16 text-center">
              <p className="font-semibold">No dishes match your filters.</p>
              <button type="button" onClick={() => setFilters(noFilters)} className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-surface">
                Clear filters
              </button>
            </div>
          )}
          {visible.map((c) => (
            <section
              key={c.id}
              id={`cat-${c.id}`}
              ref={(el) => {
                if (el) sectionRefs.current.set(c.id, el);
                else sectionRefs.current.delete(c.id);
              }}
              aria-labelledby={`h-${c.id}`}
              className="border-b-8 border-surface pt-6 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 id={`h-${c.id}`} className="font-display text-xl font-bold">
                  {c.name} <span className="font-sans text-base font-normal text-muted">({countItems(c)})</span>
                </h2>
                <Link href={`/menu/${c.id}`} className="flex items-center gap-0.5 text-sm font-semibold text-roast hover:underline">
                  Open category <ChevronRight />
                </Link>
              </div>
              {c.sections.map((s) => (
                <div key={s.id}>
                  {c.sections.length > 1 && <h3 className="mt-4 text-sm font-semibold text-muted">{s.name}</h3>}
                  <ul>
                    {s.items.map((i) => (
                      <DishRow key={i.id} item={i} query={filters.query} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>

      {/* Floating category picker on phones, like the food apps. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        style={{ bottom: `calc(var(--bottom-nav) + ${hasCart ? 88 : 16}px)` }}
        className="fixed right-4 z-30 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper shadow-lg transition-[bottom] duration-300 active:scale-95 md:hidden"
        aria-haspopup="dialog"
      >
        Browse menu
      </button>
      {sheetOpen && <CategorySheet items={visible} active={active} onPick={jumpTo} onClose={() => setSheetOpen(false)} />}
    </section>
  );
}

function CategorySheet({ items, active, onPick, onClose }: { items: MenuCategory[]; active: string; onPick: (id: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/40 p-4 md:hidden" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Menu categories"
        className="animate-rise w-72 rounded-2xl bg-ink p-3 text-paper shadow-xl"
        style={{ marginBottom: "var(--bottom-nav)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <ul>
          {items.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onPick(c.id)} className={`flex w-full justify-between rounded-lg px-3 py-2.5 text-left ${active === c.id ? "font-bold text-crema" : ""}`}>
                <span>{c.name}</span>
                <span>{countItems(c)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
