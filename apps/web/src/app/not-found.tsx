import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return <EmptyState title="This page wandered off" body="Like a cat, it's not where you expected. The menu is still right here, though." href="/menu" cta="Browse the menu" />;
}
