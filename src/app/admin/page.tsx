import type { Metadata } from "next";
import { AdminView } from "@/components/admin-view";

export const metadata: Metadata = { title: "Staff panel" };

export default function AdminPage() {
  return <AdminView />;
}
