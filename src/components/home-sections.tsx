import Image from "next/image";
import Link from "next/link";
import { bestsellers, cafeFavourites, categories, countItems, imageForCategory, photoFor } from "@/lib/menu";
import { DishRail } from "./dish-card";
import { ChevronRight } from "./icons";
import { Coverflow } from "./motion/coverflow";
import { Reveal, RevealHeading } from "./motion/reveal";

function SectionHead({ id, title, sub, href, cta, center }: { id: string; title: string; sub?: string; href?: string; cta?: string; center?: boolean }) {
  return (
    <div className={`flex gap-4 ${center ? "flex-col items-center text-center" : "items-end justify-between"}`}>
      <div>
        <RevealHeading id={id} className="font-display text-3xl font-bold sm:text-4xl">
          {title}
        </RevealHeading>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-roast hover:underline">
          {cta} <ChevronRight />
        </Link>
      )}
    </div>
  );
}

export function FavouritesCoverflow() {
  return (
    <section aria-labelledby="favs" className="mx-auto max-w-6xl overflow-hidden px-4 pt-16">
      <SectionHead id="favs" title="Cafe favourites" sub="Shot at the cafe, served in the cat cup." center />
      <div className="mt-8">
        <Coverflow items={cafeFavourites} label="Cafe favourites" />
      </div>
    </section>
  );
}

export function CategoryTiles() {
  return (
    <section aria-labelledby="cats" className="mx-auto max-w-6xl px-4">
      <SectionHead id="cats" title="What are you craving?" href="/menu" cta="Full menu" />
      <ul className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        {categories.map((c, i) => (
          <li key={c.id}>
            <Reveal delay={(i % 6) * 0.05} y={16}>
              <Link href={`/menu/${c.id}`} className="group block text-center">
                <span className="relative mx-auto block aspect-square w-full max-w-28 overflow-hidden rounded-full ring-2 ring-transparent ring-offset-2 transition group-hover:ring-crema">
                  <Image src={imageForCategory(c.id)} alt="" fill sizes="112px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                </span>
                <span className="mt-2 block text-sm font-semibold">{c.name}</span>
                <span className="block text-xs text-muted">{countItems(c)} dishes</span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BestsellerRail() {
  const favouriteIds = new Set(cafeFavourites.map((i) => i.id));
  return (
    <section aria-labelledby="best" className="mx-auto max-w-6xl px-4">
      <SectionHead id="best" title="Bestsellers" sub="Marked as recommended on the cafe's delivery menu." href="/search" cta="Search the menu" />
      <div className="mt-6">
        <DishRail items={bestsellers.filter((i) => !favouriteIds.has(i.id) && photoFor(i.id))} morph label="Bestsellers" />
      </div>
    </section>
  );
}
