/** Shown until launch: menu data is unverified and online payment isn't live yet. */
export function PrototypeNotice() {
  if (process.env.NEXT_PUBLIC_LAUNCHED === "true") return null;
  return (
    <p className="bg-ink px-4 py-2 text-center text-xs text-foam">
      Preview site: menu and prices are from public listings and not yet confirmed by the cafe. Online payment is coming soon; pay on delivery or at the counter.
    </p>
  );
}
