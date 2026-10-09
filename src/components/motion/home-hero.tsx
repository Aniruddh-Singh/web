"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { m, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { business, formatINR, pricing } from "@/lib/menu";
import interior from "../../../public/images/cafe/interior.jpg";
import swings from "../../../public/images/cafe/swing-chairs.jpg";
import coldCoffee from "../../../public/images/cafe/cold-coffee.jpg";
import storefront from "../../../public/images/cafe/storefront-night.jpg";
import { StarIcon } from "../icons";
import { useCalm } from "./use-calm";

/*
 * Cinematic hero (after Swish, Ownly and Zomato). The cafe has no video yet, so this is a slow
 * Ken Burns crossfade between its own photos. To use a clip later, drop a <video muted loop
 * playsInline poster> into <HeroMedia> — nothing else changes.
 */
const slides: { src: StaticImageData; alt: string; position?: string }[] = [
  { src: interior, alt: "Inside The Coffee Cat: swing chair, terrazzo tables and the cake counter" },
  { src: swings, alt: "Rattan swing chairs by the window in evening light", position: "50% 55%" },
  { src: coldCoffee, alt: "Cold coffee in a Coffee Cat cup", position: "50% 45%" },
  { src: storefront, alt: "The Coffee Cat's lit sign at night", position: "50% 20%" },
];

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${business.geo.lat},${business.geo.lng}`;

/**
 * Photos crossfade every few seconds. The slow zoom runs continuously on every slide and is only
 * paused (never removed) when the hero is off screen or motion is reduced, so it can't snap back.
 * Faded-out slides are hidden after their fade so the browser stops painting them.
 */
function HeroMedia({ still, playingRef }: { still: boolean; playingRef: React.RefObject<boolean> }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (still) return;
    const t = window.setInterval(() => {
      if (playingRef.current) setActive((i) => (i + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(t);
  }, [still, playingRef]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      {slides.map((s, i) => {
        const on = i === active;
        return (
          <div
            key={s.src.src}
            aria-hidden={!on}
            className="hero-slide absolute inset-0"
            style={{ opacity: on ? 1 : 0, visibility: on ? "visible" : "hidden", transitionDelay: on ? "0ms, 0ms" : "0ms, 1400ms" }}
          >
            <Image
              src={s.src}
              alt={i === 0 ? s.alt : ""}
              fill
              priority={i === 0}
              sizes="100vw"
              placeholder="blur"
              className={`object-cover ${still ? "" : "hero-kenburns"}`}
              style={{ objectPosition: s.position, animationDelay: `${-i * 3.5}s` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function HomeHero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useCalm();
  const playingRef = useRef(true);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Ownly-style shrink: the full-bleed media settles into an inset card as you scroll.
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.88]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  // Stop just short of 0/1 so the browser never drops the text's compositing layer mid-scroll
  // (a layer being dropped and recreated is what made the text flicker).
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [0.999, 0.001]);
  const shade = useTransform(scrollYProgress, [0, 1], [0.999, 0.55]);

  // Scroll state is written straight to the DOM (no React re-render per frame), and only on change.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const root = document.documentElement;
    const hero = v < 0.9 ? "over" : "past";
    if (root.dataset.hero !== hero) root.dataset.hero = hero;
    const section = ref.current;
    if (section) {
      const shrunk = v > 0.02 ? "true" : "false";
      if (section.dataset.shrunk !== shrunk) section.dataset.shrunk = shrunk;
      const playing = v < 1;
      if (playingRef.current !== playing) {
        playingRef.current = playing;
        section.dataset.playing = String(playing);
      }
    }
  });
  useEffect(() => {
    document.documentElement.dataset.hero = "over";
    return () => {
      delete document.documentElement.dataset.hero;
    };
  }, []);

  const still = Boolean(reduce);

  return (
    <section ref={ref} aria-labelledby="hero-title" data-playing="true" data-shrunk="false" className="hero relative -mt-16 h-[100svh] min-h-[600px]">
      <m.div className="hero-media absolute inset-0 overflow-hidden" style={still ? undefined : { scale }}>
        <HeroMedia still={still} playingRef={playingRef} />
        <m.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(43,26,18,0.55)_0%,rgba(43,26,18,0.35)_60%,rgba(43,26,18,0.2)_100%),linear-gradient(to_bottom,rgba(43,26,18,0.55),rgba(43,26,18,0.25)_40%,rgba(43,26,18,0.85))]"
          style={still ? undefined : { opacity: shade }}
          aria-hidden="true"
        />
      </m.div>

      <m.div
        className="hero-copy relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-4 pt-16 text-center text-paper [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]"
        style={still ? undefined : { y: textY, opacity: textOpacity }}
      >
        <h1 id="hero-title" className="font-display text-[clamp(3.2rem,11vw,8.5rem)] font-extrabold leading-[0.9] tracking-tight">
          <span className="block overflow-hidden pb-1">
            <span className="animate-line-up block">The Coffee</span>
          </span>
          <span className="block overflow-hidden pb-2">
            <span className="animate-line-up block [animation-delay:90ms]">Cat</span>
          </span>
        </h1>
        <p className="animate-rise mt-5 max-w-xl text-lg text-paper/90 [animation-delay:260ms] sm:text-2xl">
          Cold coffee, warm swings and a cat on every cup.
        </p>

        <ul className="animate-rise mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm [animation-delay:360ms]">
          <li className="flex flex-col items-center gap-1">
            <span className="flex items-center gap-1 text-xl font-bold">
              4.4 <StarIcon className="h-4 w-4" fill="var(--crema)" />
            </span>
            <span className="text-paper/80">Dining rating, Google</span>
          </li>
          <li className="flex flex-col items-center gap-1">
            <span className="text-xl font-bold">Since {business.established}</span>
            <span className="text-paper/80">Antriksh Forest Market</span>
          </li>
          <li className="flex flex-col items-center gap-1">
            <span className="text-xl font-bold">Free delivery</span>
            <span className="text-paper/80">On orders above {formatINR(pricing.freeDeliveryAbove)}</span>
          </li>
        </ul>

        <div className="animate-rise mt-9 flex flex-wrap justify-center gap-3 [animation-delay:460ms]">
          <Link href="/menu" className="rounded-full bg-roast px-7 py-3.5 font-semibold text-paper shadow-lg transition hover:bg-roast-hover active:scale-95">
            Order now
          </Link>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-paper/40 bg-paper/10 px-7 py-3.5 font-semibold text-paper backdrop-blur-md transition hover:bg-paper/20 active:scale-95"
          >
            Get directions
          </a>
        </div>
      </m.div>

      {/* Scroll cue: a mouse whose wheel keeps rolling down (Ownly / Zomato). */}
      <a
        href="#cafe-info"
        style={{ bottom: "calc(var(--bottom-nav) + 20px)" }}
        className="absolute left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-xs font-medium text-paper/80 hover:text-paper"
      >
        <span className="flex h-9 w-6 justify-center rounded-full border-2 border-current pt-1.5" aria-hidden="true">
          <span className="animate-wheel h-2 w-1 rounded-full bg-current" />
        </span>
        Scroll to explore
      </a>
    </section>
  );
}
