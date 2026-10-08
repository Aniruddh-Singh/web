import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  allItems,
  business,
  descriptionFor,
  getItemContext,
  moreFromSection,
  pairingsFor,
  photoFor,
} from "@/lib/menu";
import { DishImage } from "@/components/dish-image";
import { DishRail } from "@/components/dish-card";
import { FoodMark } from "@/components/food-mark";
import { ChevronLeft, ChevronRight, StarIcon } from "@/components/icons";
import { LivePrice, PdpActions, PdpBuyBar } from "@/components/pdp-buy-bar";

export function generateStaticParams() {
  return allItems.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: PageProps<"/dish/[id]">): Promise<Metadata> {
  const { id } = await params;
  const ctx = getItemContext(id);
  if (!ctx) return {};
  const photo = photoFor(id);
  return {
    title: ctx.item.name,
    description: `${descriptionFor(id)} ₹${ctx.item.price} at The Coffee Cat, Sector 77 Noida.`,
    alternates: { canonical: `/dish/${id}` },
    openGraph: photo ? { images: [{ url: photo.src }] } : undefined,
  };
}

const typeLabel = { veg: "Vegetarian", "non-veg": "Non-vegetarian", egg: "Contains egg" } as const;

export default async function DishPage({ params }: PageProps<"/dish/[id]">) {
  const { id } = await params;
  const ctx = getItemContext(id);
  if (!ctx) notFound();
  const { item, category, section } = ctx;
  const photo = photoFor(id);
  const description = descriptionFor(id);
  const pairings = pairingsFor(id);
  const more = moreFromSection(id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: item.name,
    description,
    offers: { "@type": "Offer", price: item.price, priceCurrency: "INR" },
    suitableForDiet: item.type === "veg" ? "https://schema.org/VegetarianDiet" : undefined,
    image: photo?.src,
    provider: { "@type": "CafeOrCoffeeShop", name: business.name },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 md:pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="mt-4 flex items-center gap-1 text-sm text-muted">
        <Link href={`/menu/${category.id}`} className="mr-1 flex items-center rounded-lg p-1 hover:bg-surface hover:text-ink md:hidden" aria-label={`Back to ${category.name}`}>
          <ChevronLeft />
        </Link>
        <Link href="/menu" className="hidden hover:text-ink md:inline">Menu</Link>
        <ChevronRight className="hidden h-3.5 w-3.5 md:block" />
        <Link href={`/menu/${category.id}`} className="hover:text-ink">{category.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span aria-current="page" className="truncate text-ink">{item.name}</span>
      </nav>

      <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-10">
        <figure>
          <DishImage
            id={id}
            name={item.name}
            photo={photo}
            sizes="(min-width: 768px) 50vw, 100vw"
            morph
            priority
            className="aspect-square w-full rounded-3xl"
          />
          {photo && !photo.real && (
            <figcaption className="mt-2 text-xs text-muted">Representative photo. The cafe&apos;s own photo of this dish is coming soon.</figcaption>
          )}
          {!photo && <figcaption className="mt-2 text-xs text-muted">Photo coming soon.</figcaption>}
        </figure>

        <div className="md:pt-4">
          <div className="flex items-center gap-3">
            <FoodMark type={item.type} className="h-5 w-5" />
            <span className="text-sm text-muted">{typeLabel[item.type]}</span>
            {item.recommended && (
              <span className="flex items-center gap-1 rounded-full bg-[#fdf6e7] px-2.5 py-1 text-xs font-semibold text-crema-ink">
                <StarIcon fill="var(--crema)" /> Bestseller
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{item.name}</h1>
          <p className="mt-3 text-2xl font-semibold">
            <LivePrice id={id} />
            {item.quantity && <span className="ml-2 text-base font-normal text-muted">{item.quantity}</span>}
          </p>
          {description && <p className="mt-4 max-w-prose text-lg leading-relaxed text-muted">{description}</p>}
          {item.note && <p className="mt-2 text-sm text-muted">Note: {item.note}</p>}

          <div className="mt-6 hidden md:block">
            <PdpActions id={id} name={item.name} />
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-surface p-3">
              <dt className="text-muted">Section</dt>
              <dd className="font-semibold">{section.name}</dd>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <dt className="text-muted">Category</dt>
              <dd className="font-semibold">
                <Link href={`/menu/${category.id}`} className="hover:text-roast hover:underline">{category.name}</Link>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {pairings.length > 0 && (
        <section aria-labelledby="pairs" className="mt-12">
          <h2 id="pairs" className="font-display text-2xl font-bold">Goes well with</h2>
          <div className="mt-4">
            <DishRail items={pairings} label="Goes well with" />
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more" className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="more" className="font-display text-2xl font-bold">More from {section.name}</h2>
            <Link href={`/menu/${category.id}`} className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-roast hover:underline">
              See all <ChevronRight />
            </Link>
          </div>
          <div className="mt-4">
            <DishRail items={more} label={`More from ${section.name}`} />
          </div>
        </section>
      )}

      <PdpBuyBar id={id} name={item.name} />
    </div>
  );
}
