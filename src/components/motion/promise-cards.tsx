"use client";

import { useRef } from "react";
import { formatINR, pricing } from "@/lib/menu";
import { Reveal, RevealHeading } from "./reveal";

const cards = [
  {
    title: `Free delivery above ${formatINR(pricing.freeDeliveryAbove)}`,
    body: "Straight from the cafe's own menu card. No code needed.",
    icon: <path d="M3 7h11v9H3z M14 10h4l3 3v3h-7 M7.5 18.5a1.5 1.5 0 1 0 0-.01 M17.5 18.5a1.5 1.5 0 1 0 0-.01" />,
  },
  {
    title: "Pay your way",
    body: "UPI, card, or cash when your order arrives.",
    icon: <path d="M3 7h18v10H3z M3 11h18 M7 15h3" />,
  },
  {
    title: "Track it live",
    body: "Watch your order go from the kitchen to your door.",
    icon: <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
  },
];

/** Card that tilts slightly toward the pointer (desktop, motion allowed). */
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
    el.style.setProperty("--glare-x", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--glare-y", `${(y + 0.5) * 100}%`);
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className="promise-card h-full transition-transform duration-300 ease-out">
      {children}
    </div>
  );
}

/** Ownly-style promise cards, in the cafe's maroon. */
export function PromiseCards() {
  return (
    <section aria-labelledby="promise" className="mx-auto max-w-6xl px-4">
      <RevealHeading id="promise" className="font-display text-3xl font-bold sm:text-4xl">
        Why order direct
      </RevealHeading>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <li key={c.title}>
            <Reveal delay={i * 0.08} className="h-full">
              <TiltCard>
                <div className="relative flex h-full min-h-72 flex-col overflow-hidden rounded-3xl bg-[radial-gradient(120%_90%_at_10%_0%,#a33a42_0%,var(--roast)_45%,#3d0f13_100%)] p-7 text-paper">
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--glare-x,30%)_var(--glare-y,0%),rgba(255,255,255,0.18),transparent_45%)]" aria-hidden="true" />
                  <svg viewBox="0 0 120 40" className="pointer-events-none absolute -right-6 -top-2 w-40 opacity-15" aria-hidden="true">
                    <path d="M10 40 30 2 50 40Z M70 40 90 2 110 40Z" fill="currentColor" />
                  </svg>
                  <h3 className="relative font-display text-2xl font-bold leading-tight">{c.title}</h3>
                  <p className="relative mt-2 text-foam/90">{c.body}</p>
                  <span className="relative mt-auto grid h-20 w-20 place-items-center self-start rounded-2xl border border-paper/30 bg-paper/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {c.icon}
                    </svg>
                  </span>
                </div>
              </TiltCard>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
