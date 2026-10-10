import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginView } from "@/components/login-view";
import { PageSkeleton } from "@/components/empty-state";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LoginView />
    </Suspense>
  );
}
