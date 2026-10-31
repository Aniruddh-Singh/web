"use client";

import { actions, useHydrated, useStore } from "@/lib/store";

/** Wishlist heart. Renders unsaved until the browser state is read, so server and client match. */
export function SaveButton({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const hydrated = useHydrated();
  const saved = useStore((s) => s.saved.includes(id)) && hydrated;
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={() => actions.toggleSaved(id)}
      className={`grid h-11 w-11 place-items-center rounded-full transition active:scale-90 ${className}`}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-paper/90 shadow-sm backdrop-blur">
        <svg viewBox="0 0 24 24" className={`h-4.5 w-4.5 ${saved ? "animate-pop" : ""}`} aria-hidden="true" fill={saved ? "var(--nonveg)" : "none"} stroke={saved ? "var(--nonveg)" : "var(--coffee)"} strokeWidth="1.9" strokeLinejoin="round">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </svg>
      </span>
    </button>
  );
}
