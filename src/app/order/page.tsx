import type { Metadata } from "next";
import { OrderView } from "@/components/order-view";

export const metadata: Metadata = { title: "Your orders" };

export default function OrderPage() {
  return <OrderView />;
}
