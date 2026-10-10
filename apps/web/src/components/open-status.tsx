"use client";

import { formatTime } from "@coffeecat/shared";
import { useStoreStatus } from "@/lib/store-status";

/** "Open now — 10 am to 11 pm today", live from the API (India time). */
export function OpenStatus({ tone = "light" }: { tone?: "light" | "dark" }) {
  const status = useStoreStatus();
  if (!status) return <p className="h-6" aria-hidden="true" />;

  const open = status.openNow;
  const hours = `${formatTime(status.opens)} to ${formatTime(status.closes)}`;
  return (
    <p className="text-sm">
      <span className={`font-semibold ${tone === "dark" ? (open ? "text-[#7ee2a0]" : "text-[#ff9c95]") : open ? "text-ok" : "text-nonveg"}`}>
        {open ? "Open now" : status.acceptingOrders ? "Closed now" : "Not taking orders"}
      </span>
      <span className={tone === "dark" ? "text-foam/80" : "text-muted"}> — {hours} today</span>
    </p>
  );
}
