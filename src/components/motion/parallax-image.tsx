"use client";

import Image from "next/image";
import { m, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useCalm } from "./use-calm";

/** Background image that drifts slower than the page (category banners). */
export function ParallaxImage({ src, sizes }: { src: string; sizes: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useCalm();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <m.div className="absolute -inset-y-[12%] inset-x-0" style={reduce ? undefined : { y }}>
        <Image src={src} alt="" fill priority sizes={sizes} className="object-cover" />
      </m.div>
    </div>
  );
}
