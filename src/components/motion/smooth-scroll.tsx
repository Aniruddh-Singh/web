"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/**
 * Smooth wheel scrolling (as on Swish and Ownly). Only for mouse/trackpad users who
 * haven't asked for reduced motion; touch keeps native momentum scrolling.
 */
export function SmoothScroll() {
  const path = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduce || !finePointer) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.12, anchors: { offset: -80 } });
    window.__lenis = lenis;
    return () => {
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  // Next.js resets scroll on navigation; keep Lenis' target in sync so it doesn't glide back.
  useEffect(() => {
    window.__lenis?.resize();
    window.__lenis?.scrollTo(window.scrollY, { immediate: true });
  }, [path]);

  return null;
}

/** Scroll an element into view through Lenis when running, natively otherwise. Both honour the target's CSS scroll-margin. */
export function scrollToElement(el: HTMLElement | null, offset = 0) {
  if (!el) return;
  if (window.__lenis) window.__lenis.scrollTo(el, { offset });
  else el.scrollIntoView();
}
