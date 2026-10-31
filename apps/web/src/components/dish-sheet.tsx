"use client";

import Link from "next/link";
import { formatINR, type MenuItem } from "@/lib/menu";
import { ui, useUi } from "@/lib/ui-state";
import { DishImage } from "./dish-image";
import { FoodMark } from "./food-mark";
import { ChevronRight, StarIcon } from "./icons";
import { useMenu } from "./menu-provider";
import { CloseButton, Overlay } from "./overlay";
import { QtyControl } from "./qty-control";
import { SaveButton } from "./save-button";

/** Quick view for a dish: bottom sheet on phones, two-column modal on desktop. Opened via `ui.openDish`. */
export function DishSheet() {
  const id = useUi((s) => s.quickView);
  const ctx = useMenu().getItemContext(id ?? "");
  return (
    <Overlay open={Boolean(ctx)} onClose={ui.closeDish} label={ctx?.item.name ?? "Dish details"} variant="sheet" contentScroll>
      {ctx && <QuickView key={ctx.item.id} item={ctx.item} sectionName={ctx.section.name} />}
    </Overlay>
  );
}

function QuickView({ item, sectionName }: { item: MenuItem; sectionName: string }) {
  const menu = useMenu();
  const photo = menu.photoFor(item.id);
  const pairings = menu.pairingsFor(item.id, 3);

  // Photo and its buttons stay put; only the details column scrolls.
  return (
    <div className="relative flex min-h-0 flex-1 flex-col md:grid md:grid-cols-2">
      <div className="relative shrink-0 md:p-5">
        <DishImage id={item.id} name={item.name} photo={photo} sizes="(min-width: 768px) 440px, 100vw" className="aspect-[16/11] w-full md:aspect-square md:rounded-2xl" />
        {photo && !photo.real && <span className="absolute bottom-3 left-3 rounded-md bg-ink/70 px-2 py-0.5 text-[11px] text-paper md:bottom-8 md:left-8">Representative photo</span>}
        <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-paper/80 md:hidden" aria-hidden="true" />
      </div>
      <div className="absolute right-3 top-3 z-10 flex gap-1">
        <SaveButton id={item.id} name={item.name} />
        <CloseButton />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-5 md:max-h-[88dvh] md:pl-1 md:pt-6">
        <div className="flex items-center gap-2 md:pr-24">
          <FoodMark type={item.type} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{sectionName}</span>
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">{item.name}</h2>
        {item.recommended && (
          <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-crema-ink">
            <StarIcon fill="var(--crema)" /> Bestseller
          </span>
        )}
        <p className="mt-3 text-xl font-bold">{formatINR(item.price)}</p>
        {item.description && <p className="mt-3 leading-relaxed text-muted">{item.description}</p>}
        {(item.quantity || item.note) && <p className="mt-2 text-sm text-muted">{[item.quantity, item.note && `Note: ${item.note}`].filter(Boolean).join(". ")}</p>}

        <div className="mt-5">
          <QtyControl id={item.id} name={item.name} size="block" className="text-base" />
        </div>

        {pairings.length > 0 && (
          <section aria-labelledby="qv-pairs" className="mt-6">
            <h3 id="qv-pairs" className="text-sm font-semibold">Goes well with</h3>
            <ul className="mt-2 divide-y divide-line">
              {pairings.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <button type="button" onClick={() => ui.openDish(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <DishImage id={p.id} name={p.name} photo={menu.photoFor(p.id)} sizes="48px" className="h-12 w-12 shrink-0 rounded-lg" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block text-sm text-muted">{formatINR(p.price)}</span>
                    </span>
                  </button>
                  <QtyControl id={p.id} name={p.name} size="sm" />
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link href={`/dish/${item.id}`} onClick={ui.closeDish} className="mt-4 flex items-center gap-1 self-start py-2 text-sm font-semibold text-roast hover:underline">
          View full details <ChevronRight />
        </Link>
      </div>
    </div>
  );
}
