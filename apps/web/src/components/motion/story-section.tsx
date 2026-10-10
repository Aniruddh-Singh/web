"use client";

import Image from "next/image";
import { m, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { useCalm } from "./use-calm";

/*
 * Swish-style editorial paragraph whose words light up as you scroll, ringed by Zomato-style
 * floating food, here as stickers cut from the cafe's own photos.
 * Copy uses only facts from the data file and public reviews. Owner to approve.
 */
const story =
  "The Coffee Cat opened in 2022 on the ground floor of Antriksh Forest Market, Sector 77. Rattan swings by the window, a cake counter, plants on every wall and a cat on every cup. Reviewers keep coming back to the cold coffee, the momos and the pocket-friendly prices.";

const stickers = [
  { src: "/images/cafe/stickers/cold-coffee.png", alt: "", className: "left-[2%] top-[6%] w-40 xl:w-48", rotate: -10, speed: 1.2 },
  { src: "/images/cafe/stickers/chilli-cheese-toast.png", alt: "", className: "right-[3%] top-[2%] w-36 xl:w-44", rotate: 12, speed: 0.7 },
  { src: "/images/cafe/stickers/cappuccino.png", alt: "", className: "left-[6%] bottom-[4%] w-32 xl:w-40", rotate: 8, speed: 0.9 },
  { src: "/images/cafe/stickers/mint-lemonade.png", alt: "", className: "right-[6%] bottom-[8%] w-36 xl:w-44", rotate: -14, speed: 1.4 },
];

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <m.span style={{ opacity }} className="inline">
      {word}{" "}
    </m.span>
  );
}

function Sticker({ s, progress }: { s: (typeof stickers)[number]; progress: MotionValue<number> }) {
  const y = useTransform(progress, [0, 1], [90 * s.speed, -90 * s.speed]);
  const rotate = useTransform(progress, [0, 1], [s.rotate - 6, s.rotate + 6]);
  return (
    <m.div style={{ y, rotate }} className={`absolute drop-shadow-[0_14px_24px_rgba(43,26,18,0.22)] ${s.className}`}>
      <Image src={s.src} alt={s.alt} width={360} height={360} sizes="192px" className="h-auto w-full" />
    </m.div>
  );
}

export function StorySection() {
  const ref = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const reduce = useCalm();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const { scrollYProgress: textProgress } = useScroll({ target: textRef, offset: ["start 0.85", "end 0.5"] });
  const draw = useTransform(scrollYProgress, [0.15, 0.65], [0, 1]);
  const words = story.split(" ");

  return (
    <section ref={ref} aria-labelledby="story-heading" className="relative overflow-hidden py-24 sm:py-32">
      {/* Hand-drawn line that draws itself, like Zomato's swirls. */}
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" viewBox="0 0 1440 700" preserveAspectRatio="none" aria-hidden="true">
        <m.path
          d="M-20 120 C 220 40, 260 300, 120 360 S 60 620, 330 600 S 760 700, 900 560 S 1180 300, 1320 420 S 1500 640, 1460 680"
          fill="none"
          stroke="var(--roast)"
          strokeOpacity="0.25"
          strokeWidth="2"
          strokeLinecap="round"
          style={reduce ? undefined : { pathLength: draw }}
        />
      </svg>

      <div className="hidden lg:block" aria-hidden="true">
        {stickers.map((s) => (reduce ? null : <Sticker key={s.src} s={s} progress={scrollYProgress} />))}
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <svg viewBox="0 0 24 24" className="mx-auto h-7 w-7 text-roast" aria-hidden="true" fill="currentColor">
          <path d="M12 0c.8 6.4 4.8 10.4 12 12-7.2 1.6-11.2 5.6-12 12-.8-6.4-4.8-10.4-12-12C7.2 10.4 11.2 6.4 12 0z" />
        </svg>
        <h2 id="story-heading" className="sr-only">Our story</h2>
        <p ref={textRef} className="mt-6 font-display text-[clamp(1.5rem,3.2vw,2.4rem)] font-semibold leading-snug tracking-tight text-ink">
          {reduce ? story : words.map((w, i) => <Word key={i} word={w} progress={textProgress} range={[i / words.length, (i + 1) / words.length]} />)}
        </p>
        <p className="mt-8 font-script text-4xl text-roast sm:text-5xl">See you at the swings.</p>
      </div>

      {/* Phones: stickers sit in a row under the story instead of floating. */}
      <div className="mt-10 flex justify-center gap-3 px-4 lg:hidden" aria-hidden="true">
        {stickers.slice(0, 3).map((s) => (
          <Image key={s.src} src={s.src} alt="" width={360} height={360} sizes="96px" className="h-auto w-24" style={{ rotate: `${s.rotate}deg` }} />
        ))}
      </div>
    </section>
  );
}
