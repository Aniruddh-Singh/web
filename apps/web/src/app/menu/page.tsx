import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuBrowser, MenuStatic } from "@/components/menu-browser";
import { CartBar } from "@/components/cart-bar";

export const metadata: Metadata = {
  title: "Full menu",
  description: "The Coffee Cat's full menu: coffee, frappes, momos, pizza, pasta, burgers, sandwiches and desserts. Order for delivery or takeaway in Sector 77, Noida.",
  alternates: { canonical: "/menu" },
};

export default function MenuPage() {
  return (
    <>
      {/* Filters live in the URL, known only per request. The prerendered fallback is the full default menu, so the HTML always lists every dish. */}
      <Suspense fallback={<MenuStatic />}>
        <MenuBrowser />
      </Suspense>
      <CartBar />
    </>
  );
}
