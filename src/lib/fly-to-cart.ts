/**
 * Signature moment: a small maroon dot arcs from the ADD button to whichever
 * cart icon is visible (header on desktop, bottom nav on mobile).
 * Skipped entirely for people who prefer reduced motion.
 */
export function flyToCart(from: HTMLElement) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  if (!target) return;

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  Object.assign(dot.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - 7}px`,
    top: `${a.top + a.height / 2 - 7}px`,
    width: "14px",
    height: "14px",
    borderRadius: "999px",
    background: "var(--roast)",
    boxShadow: "0 0 0 3px var(--paper)",
    zIndex: "60",
    pointerEvents: "none",
  });
  document.body.appendChild(dot);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const lift = Math.min(-60, dy / 2 - 80);
  dot
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${lift}px) scale(1.1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.6 },
      ],
      { duration: 620, easing: "cubic-bezier(0.5, 0, 0.3, 1)" },
    )
    .finished.finally(() => dot.remove());
}
