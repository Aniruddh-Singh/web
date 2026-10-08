"use client";

import { formatTime, isOpenNow, useHydrated, useStore } from "@/lib/store";

export function OpenStatus() {
  const hydrated = useHydrated();
  const settings = useStore((s) => s.settings);
  if (!hydrated) return <p className="h-6" aria-hidden="true" />;

  const open = settings.accepting && isOpenNow(settings);
  const hours = `${formatTime(settings.opens)} to ${formatTime(settings.closes)}`;
  return (
    <p className="text-sm">
      <span className={`font-semibold ${open ? "text-ok" : "text-nonveg"}`}>
        {open ? "Open now" : settings.accepting ? "Closed now" : "Not taking orders"}
      </span>
      <span className="text-muted"> — {hours} today</span>
    </p>
  );
}
