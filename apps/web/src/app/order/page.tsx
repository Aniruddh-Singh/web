import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderView } from "@/components/order-view";
import { PageSkeleton } from "@/components/empty-state";

export const metadata: Metadata = { title: "Your orders" };

export default function OrderPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderView />
    </Suspense>
  );
}
