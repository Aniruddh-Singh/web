"use client";

import { CartDrawer } from "./cart-drawer";
import { DishSheet } from "./dish-sheet";

/** App-wide overlays, mounted once in the root layout. */
export function Overlays() {
  return (
    <>
      <DishSheet />
      <CartDrawer />
    </>
  );
}
