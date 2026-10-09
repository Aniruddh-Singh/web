"use client";

import { useReducedMotion } from "motion/react";
import { useHydrated } from "@/lib/store";

/**
 * Reduced-motion flag that is safe for prerendered pages: false during hydration (matching the
 * server HTML), then the user's real preference. Using useReducedMotion directly in render
 * changes the markup on the first client render and breaks hydration.
 */
export function useCalm() {
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  return hydrated && Boolean(reduce);
}
