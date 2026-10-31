"use client";

import { formatINR, type MenuItem } from "@/lib/menu";
import { DishImage } from "./dish-image";
import { DishLink } from "./dish-link";
import { FoodMark } from "./food-mark";
import { StarIcon } from "./icons";
import { useMenu } from "./menu-provider";
import { QtyControl } from "./qty-control";
import { SaveButton } from "./save-button";
import { Highlight } from "./dish-row";

/** Product card for menu grids: large photo, badges, short description, price and ADD. Photo and name open quick view. */
export function DishTile({ item, query, compact = false, className = "" }: { item: MenuItem; query?: string; compact?: boolean; className?: string }) {
  const menu = useMenu();
  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_1px_2px_rgba(34,24,19,0.04)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(34,24,19,0.12)] ${className}`}>
      <div className="relative">
        <DishLink id={item.id} tabIndex={-1} aria-hidden="true" className="block overflow-hidden">
          <DishImage
            id={item.id}
            name={item.name}
            photo={menu.photoFor(item.id)}
            sizes="(min-width: 1024px) 260px, (min-width: 640px) 33vw, 50vw"
            className={`${compact ? "aspect-square sm:aspect-[4/3]" : "aspect-[4/3]"} w-full [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105`}
          />
        </DishLink>
        {item.recommended && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-ink/90 px-2 py-1 text-[11px] font-bold text-paper">
            <StarIcon className="h-3 w-3" fill="var(--crema)" /> Bestseller
          </span>
        )}
        <SaveButton id={item.id} name={item.name} className="absolute right-0 top-0" />
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-start gap-1.5">
          <FoodMark type={item.type} className="mt-0.5 h-3.5 w-3.5" />
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-[15px]">
            <DishLink id={item.id} className="hover:text-roast">
              <Highlight text={item.name} query={query} />
            </DishLink>
          </h3>
        </div>
        {item.description && (
          // Compact (carousel) cards drop the description on phones to keep the card short.
          <div className={compact ? "hidden sm:block" : ""}>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted sm:text-[13px]">{item.description}</p>
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold">{formatINR(item.price)}</span>
          <QtyControl id={item.id} name={item.name} size="block" className="sm:h-10 sm:w-24" />
        </div>
      </div>
    </article>
  );
}

/** Dish tiles: a 2–4 column grid, or ("rail") a swipeable carousel on phones that becomes the grid from sm. */
export function DishGrid({ items, query, label, layout = "grid" }: { items: MenuItem[]; query?: string; label?: string; layout?: "grid" | "rail" }) {
  const rail = layout === "rail";
  return (
    <ul
      className={
        rail
          ? "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
      }
      aria-label={label}
    >
      {items.map((i) => (
        <li key={i.id} className={rail ? "w-[44%] shrink-0 snap-start sm:w-auto" : undefined}>
          <DishTile item={i} query={query} compact={rail} />
        </li>
      ))}
    </ul>
  );
}
