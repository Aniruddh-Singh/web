import Image from "next/image";
import { ViewTransition } from "react";
import type { DishPhoto } from "@/lib/menu";
import { LogoMark } from "./logo";

type Props = {
  id: string;
  name: string;
  photo?: DishPhoto;
  sizes: string;
  /** Give the image a view-transition name so it morphs into the dish page. Only one per dish per page. */
  morph?: boolean;
  priority?: boolean;
  className?: string;
};

/** Dish photo, or a branded tile when the cafe has no photo of it yet. */
export function DishImage({ id, name, photo, sizes, morph, priority, className = "" }: Props) {
  const inner = (
    <div className={`relative overflow-hidden bg-foam ${className}`}>
      {photo ? (
        <Image src={photo.src} alt={photo.real ? name : ""} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
          <LogoMark className="h-auto w-1/3 max-w-28 opacity-90" />
          <span className="sr-only">No photo yet</span>
        </div>
      )}
    </div>
  );
  return morph ? (
    <ViewTransition name={`dish-${id}`} share="morph" default="none">
      {inner}
    </ViewTransition>
  ) : (
    inner
  );
}
