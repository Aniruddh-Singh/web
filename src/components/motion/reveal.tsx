"use client";

import { m, LazyMotion, domAnimation, useInView } from "motion/react";
import { useRef } from "react";
import { useCalm } from "./use-calm";

/** Motion features are loaded once, lazily; components below use the lightweight `m` element. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

/** Rises into place the first time it scrolls into view. Instant for reduced motion. */
export function Reveal({ children, delay = 0, className, y = 24 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useCalm();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

/**
 * Heading that slides up from behind a mask on first view. The heading itself is observed:
 * the masked span is clipped, so an observer on the span would never fire.
 */
export function RevealHeading({ children, className = "", as: Tag = "h2", id }: { children: React.ReactNode; className?: string; as?: "h1" | "h2" | "h3"; id?: string }) {
  const reduce = useCalm();
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  return (
    <Tag ref={ref} id={id} className={`overflow-hidden ${className}`}>
      {reduce ? (
        children
      ) : (
        <m.span
          className="block"
          initial={{ y: "105%" }}
          animate={inView ? { y: "0%" } : { y: "105%" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </m.span>
      )}
    </Tag>
  );
}
