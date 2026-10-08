import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchSkeleton, SearchView } from "@/components/search-view";
import { CartBar } from "@/components/cart-bar";

export const metadata: Metadata = { title: "Search the menu" };

export default function SearchPage() {
  return (
    <>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchView />
      </Suspense>
      <CartBar />
    </>
  );
}
