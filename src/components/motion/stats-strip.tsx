"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { StarIcon } from "../icons";
import { useCalm } from "./use-calm";

type Stat = { value: number; decimals?: number; suffix?: string; label: string; count?: boolean; icon: React.ReactNode };

const iconProps = { className: "h-7 w-7", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, viewBox: "0 0 24 24" };

// Every number comes from coffee-cat.json (public listings), so the source line below stays.
const stats: Stat[] = [
  { value: 4.4, decimals: 1, label: "Dining rating on Google", icon: <StarIcon className="h-7 w-7" fill="var(--crema)" /> },
  { value: 1300, suffix: "+", label: "Delivery ratings on Zomato", icon: <svg {...iconProps}><path d="M3 7h11v9H3z M14 10h4l3 3v3h-7 M7.5 18.5a1.5 1.5 0 1 0 0-.01 M17.5 18.5a1.5 1.5 0 1 0 0-.01" /></svg> },
  { value: 144, label: "Dishes on the menu", icon: <svg {...iconProps}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M9 9h6 M9 13h6" /></svg> },
  { value: 2022, label: "Serving Sector 77 since", count: false, icon: <svg {...iconProps}><path d="M4 21V10l8-6 8 6v11 M9 21v-6h6v6" /></svg> },
];

function CountUp({ stat, start }: { stat: Stat; start: boolean }) {
  const reduce = useCalm();
  const [shown, setShown] = useState(stat.value);
  useEffect(() => {
    if (!start || reduce || stat.count === false) return;
    let frame = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(stat.value * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [start, reduce, stat]);
  const text = stat.count === false ? String(stat.value) : stat.decimals ? shown.toFixed(stat.decimals) : Math.round(shown).toLocaleString("en-IN");
  return (
    <span className="tabular-nums">
      {text}
      {stat.suffix}
    </span>
  );
}

/** Big numbers that count up once (Ownly / Zomato stats strip). */
export function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  return (
    <section aria-label="The Coffee Cat in numbers" className="mx-auto max-w-5xl px-4">
      <div ref={ref} className="grid grid-cols-2 overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_12px_40px_rgba(43,26,18,0.08)] md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex flex-col items-center gap-2 px-4 py-7 text-center ${i % 2 ? "border-l border-line" : ""} ${i > 1 ? "border-t border-line md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
            <span className="text-roast">{s.icon}</span>
            <span className="font-display text-4xl font-extrabold text-roast sm:text-5xl">
              <CountUp stat={s} start={inView} />
            </span>
            <span className="text-sm text-muted">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted">From public listings, October 2026.</p>
    </section>
  );
}
