/** Shown on every customer page until launch: the data is unverified and payments are simulated. */
export function PrototypeNotice() {
  return (
    <p className="bg-ink px-4 py-2 text-center text-xs text-foam">
      Demo site: menu and prices are from public listings and not yet confirmed by the cafe. Payments are simulated.
    </p>
  );
}
