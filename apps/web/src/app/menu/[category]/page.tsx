import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { countItems } from "@/lib/menu";
import { getMenu } from "@/lib/menu-data";
import { CategoryListing } from "@/components/category-listing";
import { ClosedNotice } from "@/components/menu-browser";
import { CartBar } from "@/components/cart-bar";
import { ChevronRight } from "@/components/icons";
import { ParallaxImage } from "@/components/motion/parallax-image";

export async function generateStaticParams() {
  const { categories } = await getMenu();
  return categories.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/menu/[category]">): Promise<Metadata> {
  const { category } = await params;
  const c = (await getMenu()).getCategory(category);
  if (!c) return {};
  return {
    title: `${c.name} menu`,
    description: `Order ${c.name.toLowerCase()} from The Coffee Cat, Sector 77 Noida. ${countItems(c)} dishes, delivery and takeaway.`,
    alternates: { canonical: `/menu/${c.id}` },
  };
}

// params sit behind Suspense so client navigations show the skeleton instantly; known categories still prerender in full.
export default function CategoryPage({ params }: PageProps<"/menu/[category]">) {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

function CategorySkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-8" aria-busy="true" aria-label="Loading category">
      <div className="skeleton mt-4 h-5 w-40" />
      <div className="skeleton mt-4 h-40 w-full rounded-2xl sm:h-48" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

async function CategoryContent({ params }: { params: PageProps<"/menu/[category]">["params"] }) {
  const { category: id } = await params;
  const { categories, getCategory, imageForCategory } = await getMenu();
  const category = getCategory(id);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8">
      <nav aria-label="Breadcrumb" className="mt-4 flex items-center gap-1 text-sm text-muted">
        <Link href="/" className="py-2 hover:text-ink">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/menu" className="py-2 hover:text-ink">Menu</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span aria-current="page" className="text-ink">{category.name}</span>
      </nav>

      <header className="relative mt-4 flex h-40 items-end overflow-hidden rounded-2xl sm:h-48">
        <ParallaxImage src={imageForCategory(category.id) ?? "/images/cafe/interior.jpg"} sizes="(min-width: 1152px) 1120px, 100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
        <div className="relative p-5 text-paper">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{category.name}</h1>
          <p className="mt-1 text-sm text-foam">{countItems(category)} dishes</p>
        </div>
      </header>

      <nav aria-label="Other categories" className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/menu/${c.id}`}
            aria-current={c.id === category.id ? "page" : undefined}
            className={`flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
              c.id === category.id ? "bg-ink text-paper" : "border border-line bg-paper text-coffee hover:border-mocha"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <ClosedNotice />
      <div className="mt-2">
        <CategoryListing categoryId={category.id} />
      </div>
      <CartBar />
    </div>
  );
}
