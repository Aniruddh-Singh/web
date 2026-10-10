import type { FoodType } from "@coffeecat/shared";

const label: Record<FoodType, string> = { veg: "Veg", non_veg: "Non-veg", egg: "Contains egg" };
const color: Record<FoodType, string> = { veg: "var(--veg)", non_veg: "var(--nonveg)", egg: "var(--egg)" };

export function FoodMark({ type, className = "h-3.5 w-3.5" }: { type: FoodType; className?: string }) {
  const c = color[type];
  return (
    <svg viewBox="0 0 16 16" className={`shrink-0 ${className}`} role="img" aria-label={label[type]}>
      <rect x="1" y="1" width="14" height="14" rx="2" fill="white" stroke={c} strokeWidth="1.6" />
      {type === "non_veg" ? <path d="M8 4.2 12 11.2H4z" fill={c} /> : <circle cx="8" cy="8" r="3.6" fill={c} />}
    </svg>
  );
}
