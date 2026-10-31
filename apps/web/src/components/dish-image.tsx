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

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

/** Our own files and Supabase Storage go through the image optimizer; links staff pasted from other sites load directly. */
const optimizable = (src: string) => src.startsWith("/") || (supabaseHost !== null && src.startsWith(`https://${supabaseHost}/`));

/** Dish photo, or a branded tile when the cafe has no photo of it yet. */
export function DishImage({ id, name, photo, sizes, morph, priority, className = "" }: Props) {
  const inner = (
    <div className={`relative overflow-hidden bg-foam ${className}`}>
      {photo ? (
        <Image src={photo.src} alt={photo.real ? name : ""} fill sizes={sizes} priority={priority} unoptimized={!optimizable(photo.src)} className="object-cover" />
      ) : (
        // Menu-card style tile; the name only shows when the tile is big enough to read it.
        <div className="@container flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(120%_90%_at_50%_0%,var(--paper)_0%,var(--foam)_70%)] p-3 text-center">
          <LogoMark className="h-auto w-1/4 max-w-20 opacity-90 @[10rem]:w-1/5" />
          <span className="hidden max-w-[90%] @[10rem]:block" aria-hidden="true">
            <span className="line-clamp-2 font-display text-[15px] font-bold leading-tight text-coffee @[16rem]:text-xl">{name}</span>
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-mocha @[10rem]:block">Photo coming soon</span>
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
