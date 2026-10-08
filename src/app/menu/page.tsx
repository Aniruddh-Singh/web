import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu-browser";
import { CartBar } from "@/components/cart-bar";

export const metadata: Metadata = {
  title: "Full menu",
  description: "The Coffee Cat's full menu: coffee, frappes, momos, pizza, pasta, burgers, sandwiches and desserts. Order for delivery or takeaway in Sector 77, Noida.",
  alternates: { canonical: "/menu" },
};

export default function MenuPage() {
  return (
    <>
      <MenuBrowser />
      <CartBar />
    </>
  );
}
