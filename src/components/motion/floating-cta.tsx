"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount, useStore } from "@/lib/store";
import { ChevronRight } from "../icons";

/** Swish-style pill that follows you down the home page until something is in the cart. */
export function FloatingCta() {
  const empty = useStore(cartCount) === 0;
  const [pastHero, setPastHero] = useState(false);
  const [blocked, setBlocked] = useState(false);
  // Step aside while something interactive needs the bottom of the screen (e.g. the coverflow's ADD).
  useEffect(() => {
    const targets = document.querySelectorAll("[data-no-float]");
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setBlocked(visible.size > 0);
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const onScroll = () => {
      const nearEnd = window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 420;
      setPastHero(window.scrollY > window.innerHeight * 0.7 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const show = empty && pastHero && !blocked;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-30 flex justify-center transition-all duration-300 ease-out ${show ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
      style={{ bottom: "calc(var(--bottom-nav) + 16px)" }}
    >
      <Link
        href="/menu"
        tabIndex={show ? 0 : -1}
        aria-hidden={!show}
        className={`flex items-center gap-3 rounded-full bg-roast py-2 pl-6 pr-2 font-semibold text-paper shadow-[0_10px_30px_rgba(122,34,41,0.45)] transition hover:bg-roast-hover active:scale-95 ${show ? "pointer-events-auto" : ""}`}
      >
        Order now
        <span className="grid h-9 w-9 place-items-center rounded-full bg-paper/15">
          <ChevronRight className="h-5 w-5" />
        </span>
      </Link>
    </div>
  );
}
