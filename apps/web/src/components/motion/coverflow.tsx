"use client";

import Link from "next/link";
import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatINR, type MenuItem } from "@/lib/menu";
import { useMenu } from "../menu-provider";
import { effectivePrice, useStore } from "@/lib/store";
import { DishImage } from "../dish-image";
import { FoodMark } from "../food-mark";
import { ChevronLeft, ChevronRight } from "../icons";
import { QtyControl } from "../qty-control";
import { useCalm } from "./use-calm";

function PriceChip({ id }: { id: string }) {
  const menu = useMenu();
  const price = useStore((s) => effectivePrice(s, id, menu));
  return (
    <span className="rounded-xl bg-paper/90 px-3 py-1.5 text-lg font-bold text-ink shadow-md backdrop-blur">{formatINR(price)}</span>
  );
}

/**
 * Ownly-style coverflow: the centre dish is large and in colour, its neighbours shrink,
 * tilt back and turn greyscale. Swipe, drag, arrow buttons, keyboard arrows, or tap a side card.
 */
export function Coverflow({ items, label }: { items: MenuItem[]; label: string }) {
  const [index, setIndex] = useState(Math.floor(items.length / 2));
  const [width, setWidth] = useState(1200);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; id: number } | null>(null);
  const dragged = useRef(false);
  const reduce = useCalm();
  const menu = useMenu();

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (i: number) => setIndex(Math.max(0, Math.min(items.length - 1, i)));
  const cardW = width < 640 ? 230 : 300;
  const gap = width < 640 ? width * 0.36 : Math.min(300, width * 0.24);
  const current = items[index];

  return (
    <div
      className="relative select-none"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div
        ref={box}
        className="relative h-[420px] touch-pan-y [perspective:1200px] sm:h-[480px]"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, id: e.pointerId };
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          const dx = e.clientX - d.x;
          dragged.current = Math.abs(dx) > 8;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
        onClickCapture={(e) => {
          // A swipe shouldn't also open the dish under the finger.
          if (dragged.current) {
            e.preventDefault();
            e.stopPropagation();
            dragged.current = false;
          }
        }}
        onPointerCancel={() => (drag.current = null)}
      >
        {items.map((item, i) => {
          const o = i - index;
          const abs = Math.abs(o);
          const isCenter = o === 0;
          return (
            <m.div
              key={item.id}
              className="absolute left-1/2 top-0"
              style={{ width: cardW, marginLeft: -cardW / 2, zIndex: 10 - abs }}
              initial={false}
              animate={{
                x: o * gap,
                scale: isCenter ? 1 : Math.max(0.7, 0.86 - (abs - 1) * 0.08),
                rotateY: reduce ? 0 : o * -14,
                opacity: abs > 2 ? 0 : 1,
                filter: isCenter ? "grayscale(0) brightness(1)" : "grayscale(1) brightness(0.92)",
              }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
              aria-hidden={!isCenter}
              onClick={() => !isCenter && go(i)}
            >
              <div className={`relative overflow-hidden rounded-[28px] bg-ink shadow-[0_24px_50px_rgba(43,26,18,0.28)] ${isCenter ? "" : "cursor-pointer"}`}>
                <Link href={`/dish/${item.id}`} tabIndex={isCenter ? 0 : -1} className={isCenter ? "" : "pointer-events-none"} draggable={false}>
                  <DishImage id={item.id} name={item.name} photo={menu.photoFor(item.id)} sizes="300px" morph className="aspect-[4/5] w-full" />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/30" aria-hidden="true" />
                  <span className="absolute inset-x-0 top-0 p-5 text-center text-paper">
                    <span className="block text-xs font-semibold opacity-80">The Coffee Cat</span>
                    <span className="mt-1 block font-display text-2xl font-bold leading-tight">{item.name}</span>
                  </span>
                </Link>
                <span className="absolute bottom-4 left-4">
                  <PriceChip id={item.id} />
                </span>
              </div>
            </m.div>
          );
        })}
      </div>

      <div data-no-float className="mx-auto mt-2 flex max-w-md flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2" aria-live="polite">
          <FoodMark type={current.type} />
          <p className="text-sm text-muted">{current.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="grid h-11 w-11 place-items-center rounded-full border border-line transition hover:bg-surface active:scale-95 disabled:opacity-30" aria-label="Previous dish">
            <ChevronLeft />
          </button>
          <QtyControl id={current.id} name={current.name} size="lg" />
          <button type="button" onClick={() => go(index + 1)} disabled={index === items.length - 1} className="grid h-11 w-11 place-items-center rounded-full border border-line transition hover:bg-surface active:scale-95 disabled:opacity-30" aria-label="Next dish">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {current.name}, {index + 1} of {items.length}
        </p>
      </div>
    </div>
  );
}
