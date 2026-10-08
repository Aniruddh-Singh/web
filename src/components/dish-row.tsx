"use client";

import Link from "next/link";
import { descriptionFor, formatINR, listPhotoFor, type MenuItem } from "@/lib/menu";
import { effectivePrice, useStore } from "@/lib/store";
import { DishImage } from "./dish-image";
import { FoodMark } from "./food-mark";
import { StarIcon } from "./icons";
import { QtyControl } from "./qty-control";

function Highlight({ text, query }: { text: string; query?: string }) {
  const q = query?.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-[#fdf0d2] text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Food-app menu row: details on the left, photo with ADD on the right. Name and photo open the dish page. */
export function DishRow({ item, query, morph = true, context }: { item: MenuItem; query?: string; morph?: boolean; context?: string }) {
  const price = useStore((s) => effectivePrice(s, item.id));
  const photo = listPhotoFor(item);
  const href = `/dish/${item.id}`;
  const description = descriptionFor(item.id);

  return (
    <li className="flex gap-4 border-b border-line py-5 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <FoodMark type={item.type} />
          {item.recommended && (
            <span className="flex items-center gap-1 text-xs font-semibold text-crema-ink">
              <StarIcon fill="var(--crema)" />
              Bestseller
            </span>
          )}
        </div>
        <h4 className="text-[17px] font-semibold leading-snug">
          <Link href={href} className="hover:text-roast hover:underline hover:decoration-1 hover:underline-offset-4">
            <Highlight text={item.name} query={query} />
          </Link>
        </h4>
        <p className="font-medium">{formatINR(price)}</p>
        {context && <p className="text-xs text-muted">{context}</p>}
        {description && <p className="line-clamp-2 max-w-prose text-sm text-muted">{description}</p>}
        {(item.quantity || item.note) && (
          <p className="text-xs text-muted">{[item.quantity, item.note && `Note: ${item.note}`].filter(Boolean).join(". ")}</p>
        )}
      </div>
      {photo ? (
        <div className="relative h-31 w-33 shrink-0">
          <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
            <DishImage id={item.id} name={item.name} photo={photo} sizes="132px" morph={morph} className="h-27.5 w-full rounded-xl" />
          </Link>
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <QtyControl id={item.id} name={item.name} />
          </div>
        </div>
      ) : (
        <div className="flex w-33 shrink-0 items-center justify-center">
          <QtyControl id={item.id} name={item.name} />
        </div>
      )}
    </li>
  );
}
