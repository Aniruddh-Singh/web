import Image from "next/image";
import Link from "next/link";
import { bestsellers, business, cafeFavourites, categories, countItems, imageForCategory } from "@/lib/menu";
import { DishRail } from "./dish-card";
import { ChevronRight } from "./icons";

function SectionHead({ id, title, sub, href, cta }: { id: string; title: string; sub?: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
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

export function HomeSections() {
  const favouriteIds = new Set(cafeFavourites.map((i) => i.id));
  const moreBestsellers = bestsellers.filter((i) => !favouriteIds.has(i.id));

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 pt-12">
      <section aria-labelledby="favs">
        <SectionHead id="favs" title="Cafe favourites" sub="Shot at the cafe, served in the cat cup." href="/menu/coffee" cta="All coffee" />
        <div className="mt-5">
          <DishRail items={cafeFavourites} morph label="Cafe favourites" />
        </div>
      </section>

      <section aria-labelledby="cats">
        <SectionHead id="cats" title="What are you craving?" href="/menu" cta="Full menu" />
        <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/menu/${c.id}`} className="group block text-center">
                <span className="relative mx-auto block aspect-square w-full max-w-28 overflow-hidden rounded-full ring-2 ring-transparent ring-offset-2 transition group-hover:ring-crema">
                  <Image src={imageForCategory(c.id)} alt="" fill sizes="112px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                </span>
                <span className="mt-2 block text-sm font-semibold">{c.name}</span>
                <span className="block text-xs text-muted">{countItems(c)} dishes</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="best">
        <SectionHead id="best" title="Bestsellers" sub="Marked as recommended on the cafe's delivery menu." />
        <div className="mt-5">
          <DishRail items={moreBestsellers} morph label="Bestsellers" />
        </div>
      </section>

      <section aria-labelledby="said" className="rounded-3xl bg-ink px-6 py-8 text-paper sm:px-10">
        <h2 id="said" className="font-display text-2xl font-bold">What people mention in reviews</h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {business.reported_highlights.map((h) => (
            <li key={h} className="rounded-full border border-paper/25 px-4 py-2 text-sm">{h}</li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-foam/80">Themes from public reviews on Zomato, Swiggy Dineout, Justdial and Google.</p>
      </section>
    </div>
  );
}
