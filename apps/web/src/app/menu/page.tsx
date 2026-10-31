import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuBrowser, MenuSkeleton } from "@/components/menu-browser";
import { CartBar } from "@/components/cart-bar";

export const metadata: Metadata = {
  title: "Full menu",
  description: "The Coffee Cat's full menu: coffee, frappes, momos, pizza, pasta, burgers, sandwiches and desserts. Order for delivery or takeaway in Sector 77, Noida.",
  alternates: { canonical: "/menu" },
};

export default function MenuPage() {
  return (
    <>
      {/* Filters live in the URL, which is only known per request; the shell around it stays prerendered. */}
      <Suspense fallback={<MenuSkeleton />}>
        <MenuBrowser />
      </Suspense>
      <CartBar />
    </>
  );
}
