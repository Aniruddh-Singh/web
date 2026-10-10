/** All money is integer paise (₹1 = 100 paise) so totals never drift from floating-point maths. */
export type Paise = number;

export const toPaise = (rupees: number): Paise => Math.round(rupees * 100);

/** "₹1,234" or "₹1,234.50" — rupees, Indian digit grouping, paise only when present. */
export function formatINR(paise: Paise): string {
  const rupees = paise / 100;
  const hasPaise = paise % 100 !== 0;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2 })}`;
}
