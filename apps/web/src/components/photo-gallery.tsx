"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "./icons";
import { CloseButton, Overlay } from "./overlay";

export type GalleryPhoto = { src: StaticImageData; alt: string; span: string; position?: string };

/** Mosaic of cafe photos; tapping one opens a full-screen lightbox (buttons or arrow keys). */
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const step = (d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  const current = index === null ? null : photos[index];

  return (
    <>
      <ul className="mt-5 grid auto-rows-[150px] grid-cols-2 gap-2 sm:auto-rows-[190px] md:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.src.src} className={`relative overflow-hidden rounded-2xl bg-surface ${p.span}`}>
            <button type="button" onClick={() => setIndex(i)} className="group relative block h-full w-full" aria-label={`View photo: ${p.alt}`}>
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 25vw, 50vw" placeholder="blur" className={`object-cover transition-transform duration-700 group-hover:scale-105 ${p.position ?? ""}`} />
            </button>
          </li>
        ))}
      </ul>

      <Overlay open={open} onClose={() => setIndex(null)} label="Cafe photos" variant="lightbox">
        {current && (
          <>
            <div className="flex items-center justify-between pb-3 text-paper">
              <p className="text-sm" aria-live="polite">
                {index! + 1} / {photos.length}
              </p>
              <CloseButton onClick={() => setIndex(null)} label="Close photos" />
            </div>
            <div className="relative min-h-0 flex-1">
              <Image key={current.src.src} src={current.src} alt={current.alt} fill sizes="100vw" placeholder="blur" className="animate-fade-in object-contain" />
            </div>
            <p className="pt-3 text-center text-sm text-foam">{current.alt}</p>
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full bg-paper/90 text-ink shadow-lg hover:bg-paper">
                <ChevronLeft />
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full bg-paper/90 text-ink shadow-lg hover:bg-paper">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </Overlay>
    </>
  );
}
