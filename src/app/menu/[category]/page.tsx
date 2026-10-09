import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, countItems, getCategory, imageForCategory } from "@/lib/menu";
import { CategoryListing } from "@/components/category-listing";
import { ClosedNotice } from "@/components/menu-browser";
import { CartBar } from "@/components/cart-bar";
import { ChevronRight } from "@/components/icons";
import { ParallaxImage } from "@/components/motion/parallax-image";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/menu/[category]">): Promise<Metadata> {
  const { category } = await params;
  const c = getCategory(category);
  if (!c) return {};
  return {
    title: `${c.name} menu`,
    description: `Order ${c.name.toLowerCase()} from The Coffee Cat, Sector 77 Noida. ${countItems(c)} dishes, delivery and takeaway.`,
    alternates: { canonical: `/menu/${c.id}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/menu/[category]">) {
  const { category: id } = await params;
  const category = getCategory(id);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8">
      <nav aria-label="Breadcrumb" className="mt-4 flex items-center gap-1 text-sm text-muted">
        <Link href="/" className="hover:text-ink">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/menu" className="hover:text-ink">Menu</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span aria-current="page" className="text-ink">{category.name}</span>
      </nav>

      <header className="relative mt-4 flex h-40 items-end overflow-hidden rounded-2xl sm:h-48">
        <ParallaxImage src={imageForCategory(category.id)} sizes="(min-width: 1152px) 1120px, 100vw" />
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
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              c.id === category.id ? "bg-foam font-semibold text-roast" : "text-muted hover:bg-surface hover:text-ink"
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
