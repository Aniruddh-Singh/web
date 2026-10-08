"use client";

import Link from "next/link";
import { formatINR, photoFor, type MenuItem } from "@/lib/menu";
import { effectivePrice, useStore } from "@/lib/store";
import { DishImage } from "./dish-image";
import { FoodMark } from "./food-mark";
import { QtyControl } from "./qty-control";

/** Vertical card for carousels and "goes well with" rails. */
export function DishCard({ item, morph = false }: { item: MenuItem; morph?: boolean }) {
  const price = useStore((s) => effectivePrice(s, item.id));
  return (
    <div className="group flex h-full w-44 shrink-0 snap-start flex-col sm:w-52">
      <div className="relative">
        <Link href={`/dish/${item.id}`} tabIndex={-1} aria-hidden="true" className="block">
          <DishImage
            id={item.id}
            name={item.name}
            photo={photoFor(item.id)}
            sizes="208px"
            morph={morph}
            className="aspect-square w-full rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>
        <div className="absolute -bottom-4 inset-x-0 flex justify-center">
          <QtyControl id={item.id} name={item.name} size="sm" />
        </div>
      </div>
      <div className="mt-6 flex items-start gap-2">
        <FoodMark type={item.type} className="mt-0.5 h-3.5 w-3.5" />
        <Link href={`/dish/${item.id}`} className="text-sm font-semibold leading-snug hover:text-roast">
          {item.name}
        </Link>
      </div>
      <p className="ml-5.5 mt-0.5 text-sm text-muted">{formatINR(price)}</p>
    </div>
  );
}

/** Horizontal, snap-scrolling rail of dish cards. */
export function DishRail({ items, morph = false, label }: { items: MenuItem[]; morph?: boolean; label: string }) {
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2" aria-label={label}>
      {items.map((i) => (
        <li key={i.id}>
          <DishCard item={i} morph={morph} />
        </li>
      ))}
    </ul>
  );
}
