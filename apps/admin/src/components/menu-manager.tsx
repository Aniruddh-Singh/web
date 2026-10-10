"use client";

import { can, formatINR, type AdminMenuCategory, type AdminMenuItem } from "@coffeecat/shared";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formError, useApi } from "@/lib/use-api";
import { useStaff } from "./auth-provider";
import { FoodMark } from "./food-mark";
import { ItemEditor } from "./item-editor";
import { Button, inputClass, Notice, PageHeader, photoSrc, Switch } from "./ui";

const move = <T,>(list: T[], i: number, by: number) => {
  const next = [...list];
  const [x] = next.splice(i, 1);
  next.splice(Math.max(0, Math.min(next.length, i + by)), 0, x);
  return next;
};

function ReorderButtons({ onUp, onDown, first, last, label }: { onUp: () => void; onDown: () => void; first: boolean; last: boolean; label: string }) {
  return (
    <span className="flex flex-col">
      <button type="button" onClick={onUp} disabled={first} aria-label={`Move ${label} up`} className="rounded px-1 text-muted hover:text-ink disabled:opacity-20">▲</button>
      <button type="button" onClick={onDown} disabled={last} aria-label={`Move ${label} down`} className="rounded px-1 text-muted hover:text-ink disabled:opacity-20">▼</button>
    </span>
  );
}

/** Menu: categories on the left, their sections and dishes on the right. */
export function MenuManager() {
  const staff = useStaff();
  const canEdit = can(staff.role, "menu:edit");
  const { data: menu, setData, error, reload } = useApi<AdminMenuCategory[]>("/admin/menu");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ item: AdminMenuItem | null; sectionId: string } | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [adding, setAdding] = useState<{ kind: "category" | "section"; name: string } | null>(null);

  const category = menu?.find((c) => c.id === (selected ?? menu[0]?.id));
  const q = query.trim().toLowerCase();
  const searchHits = useMemo(
    () => (q && menu ? menu.flatMap((c) => c.sections.flatMap((s) => s.items.filter((i) => i.name.toLowerCase().includes(q)).map((i) => ({ i, s, c })))) : []),
    [q, menu],
  );

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(undefined);
    try {
      await fn();
    } catch (e) {
      setActionError(formError(e).message);
    }
    await reload();
  };

  /** Optimistic sold-out toggle: flips instantly, rolls back if the API refuses. */
  const toggleStock = async (item: AdminMenuItem, isAvailable: boolean) => {
    setData((m) => m && m.map((c) => ({ ...c, sections: c.sections.map((s) => ({ ...s, items: s.items.map((i) => (i.id === item.id ? { ...i, isAvailable } : i)) })) })));
    try {
      await api(`/admin/menu/items/${item.id}/availability`, { method: "PATCH", json: { isAvailable } });
    } catch (e) {
      setActionError(formError(e).message);
      await reload();
    }
  };

  const addThing = async () => {
    if (!adding?.name.trim() || !category) return;
    await run(async () => {
      if (adding.kind === "category") {
        const { id } = await api<{ id: string }>("/admin/menu/categories", { method: "POST", json: { name: adding.name } });
        setSelected(id);
      } else {
        await api("/admin/menu/sections", { method: "POST", json: { categoryId: category.id, name: adding.name } });
      }
      setAdding(null);
    });
  };

  const itemRow = (i: AdminMenuItem, sectionId: string, index: number, list: AdminMenuItem[], context?: string) => {
    const src = photoSrc(i.imageUrl);
    return (
      <li key={i.id} className={`flex items-center gap-3 px-3 py-2.5 ${i.isAvailable ? "" : "bg-surface"}`}>
        {canEdit && !context && (
          <ReorderButtons
            label={i.name}
            first={index === 0}
            last={index === list.length - 1}
            onUp={() => run(() => api(`/admin/menu/sections/${sectionId}/items/order`, { method: "POST", json: { ids: move(list, index, -1).map((x) => x.id) } }))}
            onDown={() => run(() => api(`/admin/menu/sections/${sectionId}/items/order`, { method: "POST", json: { ids: move(list, index, 1).map((x) => x.id) } }))}
          />
        )}
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <FoodMark type={i.foodType} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-1.5 font-semibold ${i.isAvailable ? "" : "text-muted line-through"}`}>
            <FoodMark type={i.foodType} className="h-3 w-3" />
            <span className="truncate">{i.name}</span>
            {i.isBestseller && <span className="rounded bg-warn-bg px-1.5 text-[11px] font-bold text-crema-ink">Bestseller</span>}
          </span>
          <span className="block text-sm text-muted">
            {formatINR(i.pricePaise)}
            {i.quantityLabel ? ` · ${i.quantityLabel}` : ""}
            {context ? ` · ${context}` : ""}
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="hidden sm:inline">{i.isAvailable ? "In stock" : "Sold out"}</span>
          <Switch checked={i.isAvailable} onChange={(v) => void toggleStock(i, v)} label={`${i.name} in stock`} />
        </span>
        {canEdit && (
          <Button variant="ghost" className="h-9 px-3" onClick={() => setEditing({ item: i, sectionId })}>
            Edit
          </Button>
        )}
      </li>
    );
  };

  return (
    <div className="px-4 py-5 md:px-8">
      <PageHeader
        title="Menu"
        description={canEdit ? "Changes show on the website within a few seconds." : "Switch dishes off when they run out; they come back when you switch them on."}
        actions={
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a dish" aria-label="Find a dish" className={`${inputClass} mt-0 w-64`} />
        }
      />
      <div className="mt-4 space-y-2">
        {error && <Notice tone="error">{error}</Notice>}
        {actionError && <Notice tone="error">{actionError}</Notice>}
      </div>

      {!menu ? (
        <p className="mt-10 text-muted">Loading menu…</p>
      ) : q ? (
        <section className="mt-6 rounded-2xl border border-line bg-paper" aria-label="Search results">
          <p className="border-b border-line px-4 py-3 text-sm text-muted">{searchHits.length} dishes match &ldquo;{query}&rdquo;</p>
          <ul className="divide-y divide-line">{searchHits.map(({ i, s, c }, idx, all) => itemRow(i, s.id, idx, all.map((h) => h.i), `${c.name} › ${s.name}`))}</ul>
        </section>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <nav aria-label="Categories" className="h-fit rounded-2xl border border-line bg-paper p-2">
            <ul>
              {menu.map((c, idx) => (
                <li key={c.id} className={`flex items-center gap-1 rounded-xl ${c.id === category?.id ? "bg-foam" : ""}`}>
                  {canEdit && (
                    <ReorderButtons
                      label={c.name}
                      first={idx === 0}
                      last={idx === menu.length - 1}
                      onUp={() => run(() => api("/admin/menu/categories/order", { method: "POST", json: { ids: move(menu, idx, -1).map((x) => x.id) } }))}
                      onDown={() => run(() => api("/admin/menu/categories/order", { method: "POST", json: { ids: move(menu, idx, 1).map((x) => x.id) } }))}
                    />
                  )}
                  <button type="button" onClick={() => setSelected(c.id)} aria-current={c.id === category?.id} className={`flex flex-1 justify-between px-2 py-2.5 text-left text-sm ${c.active ? "" : "text-muted"}`}>
                    <span className={c.id === category?.id ? "font-bold text-roast" : "font-medium"}>
                      {c.name}
                      {!c.active && " (hidden)"}
                    </span>
                    <span className="text-muted">{c.sections.reduce((n, s) => n + s.items.length, 0)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="border-t border-line p-2">
                {adding?.kind === "category" ? (
                  <form onSubmit={(e) => (e.preventDefault(), void addThing())} className="space-y-2">
                    <input autoFocus className={inputClass} value={adding.name} onChange={(e) => setAdding({ kind: "category", name: e.target.value })} placeholder="Category name" aria-label="New category name" />
                    <div className="flex gap-2">
                      <Button type="submit" className="h-9 flex-1">Add</Button>
                      <Button variant="secondary" className="h-9" onClick={() => setAdding(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <Button variant="ghost" className="w-full" onClick={() => setAdding({ kind: "category", name: "" })}>
                    + Add category
                  </Button>
                )}
              </div>
            )}
          </nav>

          {category && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-bold">{category.name}</h2>
                {canEdit && (
                  <span className="flex items-center gap-2 text-sm">
                    Shown on website
                    <Switch checked={category.active} onChange={(v) => run(() => api(`/admin/menu/categories/${category.id}`, { method: "PATCH", json: { active: v } }))} label={`Show ${category.name} on website`} />
                  </span>
                )}
              </div>
              {category.sections.map((s) => (
                <section key={s.id} aria-label={s.name} className="rounded-2xl border border-line bg-paper">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <h3 className="font-semibold">
                      {s.name} <span className="font-normal text-muted">{s.items.length}</span>
                    </h3>
                    {canEdit && (
                      <Button variant="ghost" className="h-9" onClick={() => setEditing({ item: null, sectionId: s.id })}>
                        + Add dish
                      </Button>
                    )}
                  </div>
                  <ul className="divide-y divide-line">{s.items.map((i, idx) => itemRow(i, s.id, idx, s.items))}</ul>
                  {s.items.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No dishes yet.</p>}
                </section>
              ))}
              {canEdit &&
                (adding?.kind === "section" ? (
                  <form onSubmit={(e) => (e.preventDefault(), void addThing())} className="flex gap-2">
                    <input autoFocus className={`${inputClass} mt-0`} value={adding.name} onChange={(e) => setAdding({ kind: "section", name: e.target.value })} placeholder="Section name, e.g. Iced Teas" aria-label="New section name" />
                    <Button type="submit">Add</Button>
                    <Button variant="secondary" onClick={() => setAdding(null)}>Cancel</Button>
                  </form>
                ) : (
                  <Button variant="secondary" onClick={() => setAdding({ kind: "section", name: "" })}>
                    + Add section to {category.name}
                  </Button>
                ))}
            </div>
          )}
        </div>
      )}

      {editing && menu && (
        <ItemEditor
          item={editing.item}
          sectionId={editing.sectionId}
          menu={menu}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}
