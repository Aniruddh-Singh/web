"use client";

import { formatTime, isOpenNow, useHydrated, useStore } from "@/lib/store";

export function OpenStatus({ tone = "light" }: { tone?: "light" | "dark" }) {
  const hydrated = useHydrated();
  const settings = useStore((s) => s.settings);
  if (!hydrated) return <p className="h-6" aria-hidden="true" />;

  const open = settings.accepting && isOpenNow(settings);
  const hours = `${formatTime(settings.opens)} to ${formatTime(settings.closes)}`;
  return (
    <p className="text-sm">
      <span className={`font-semibold ${tone === "dark" ? (open ? "text-[#7ee2a0]" : "text-[#ff9c95]") : open ? "text-ok" : "text-nonveg"}`}>
        {open ? "Open now" : settings.accepting ? "Closed now" : "Not taking orders"}
      </span>
      <span className={tone === "dark" ? "text-foam/80" : "text-muted"}> — {hours} today</span>
    </p>
  );
}
