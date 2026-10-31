import { formatINR } from "@/lib/menu";

/** "Add ₹80 more for free delivery" with a progress bar; turns green once unlocked. */
export function FreeDeliveryProgress({ itemTotal, threshold, tone = "light" }: { itemTotal: number; threshold: number; tone?: "light" | "dark" }) {
  if (threshold <= 0) return null;
  const remaining = Math.max(0, threshold - itemTotal);
  const pct = Math.min(100, Math.round((itemTotal / threshold) * 100));
  const unlocked = remaining === 0;
  return (
    <div>
      <p className={`text-sm ${tone === "dark" ? "text-foam" : "text-ink"}`} aria-live="polite">
        {unlocked ? (
          <span className="font-semibold text-ok">🎉 Free delivery unlocked</span>
        ) : (
          <>
            Add <strong>{formatINR(remaining)}</strong> more for free delivery
          </>
        )}
      </p>
      <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${tone === "dark" ? "bg-paper/20" : "bg-foam"}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to free delivery">
        <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${unlocked ? "bg-ok" : "bg-crema"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
