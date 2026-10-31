"use client";

import type { MenuItem } from "@/lib/menu";
import { DishGrid } from "./dish-tile";

/** Horizontal rail of dish tiles (a grid from sm), e.g. "Goes well with" on the dish page. */
export function DishRail({ items, label }: { items: MenuItem[]; morph?: boolean; label: string }) {
  return <DishGrid items={items} label={label} layout="rail" />;
}
