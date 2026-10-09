"use client";

import Image from "next/image";
import { m, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { business } from "@/lib/menu";
import storefront from "../../../public/images/cafe/storefront-night.jpg";
import { OpenStatus } from "../open-status";
import { RevealHeading } from "./reveal";
import { useCalm } from "./use-calm";

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${business.geo.lat},${business.geo.lng}`;
const tel = `tel:${business.phone.primary.replace(/\s/g, "")}`;

// Coffee beans drifting at different speeds, in place of Zomato's gold coins.
const beans = [
  { className: "left-[4%] top-[18%] w-10", speed: 1.3, rotate: -20 },
  { className: "left-[44%] top-[10%] w-6", speed: 0.6, rotate: 30 },
  { className: "right-[6%] top-[22%] w-12", speed: 1.6, rotate: 15 },
  { className: "right-[30%] bottom-[12%] w-8", speed: 0.9, rotate: -40 },
  { className: "left-[12%] bottom-[8%] w-7", speed: 1.1, rotate: 60 },
];

function Bean({ b, progress }: { b: (typeof beans)[number]; progress: MotionValue<number> }) {
  const y = useTransform(progress, [0, 1], [120 * b.speed, -120 * b.speed]);
  const rotate = useTransform(progress, [0, 1], [b.rotate, b.rotate + 90 * b.speed]);
  return (
    <m.svg viewBox="0 0 40 56" style={{ y, rotate }} className={`absolute ${b.className}`}>
      <ellipse cx="20" cy="28" rx="18" ry="26" fill="#6b3a24" />
      <path d="M20 4c-7 10 7 20 0 48" stroke="#2b140b" strokeWidth="3" fill="none" strokeLinecap="round" />
    </m.svg>
  );
}

/** Dark "Visit us" section opened by a curved divider (after Zomato Gold). */
export function VisitNight() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useCalm();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section ref={ref} aria-labelledby="visit" className="relative overflow-hidden bg-[#1f0d0f] text-paper">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="block h-16 w-full sm:h-28" aria-hidden="true">
        <path d="M0 0h1440v20C1100 120 340 120 0 20z" fill="var(--paper)" />
      </svg>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {!reduce && beans.map((b, i) => <Bean key={i} b={b} progress={scrollYProgress} />)}
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-6 md:grid-cols-2">
        <m.div style={reduce ? undefined : { y: photoY }} className="relative aspect-[4/5] overflow-hidden rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.45)] md:aspect-[4/4.6]">
          <Image src={storefront} alt="The Coffee Cat's lit sign over the entrance at night" fill sizes="(min-width: 768px) 50vw, 100vw" placeholder="blur" className="object-cover object-top" />
        </m.div>
        <div>
          <RevealHeading id="visit" className="font-display text-4xl font-extrabold leading-tight sm:text-6xl">
            Come say hi
          </RevealHeading>
          <p className="mt-4 text-lg text-foam/85">{business.address}</p>
          <p className="mt-1 text-foam/70">{business.landmark}</p>
          <div className="mt-5 rounded-2xl border border-paper/15 bg-paper/5 px-4 py-3">
            <OpenStatus tone="dark" />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-crema px-6 py-3 font-semibold text-ink transition hover:brightness-105 active:scale-95">
              Get directions
            </a>
            <a href={tel} className="rounded-full border border-paper/30 px-6 py-3 font-semibold transition hover:bg-paper/10 active:scale-95">
              Call {business.phone.primary}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
