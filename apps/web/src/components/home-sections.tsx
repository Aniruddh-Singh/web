import Image from "next/image";
import Link from "next/link";
import { highlights, mapsUrl, offers, ratings } from "@/lib/cafe";
import { countItems, formatINR, type DishPhoto, type MenuItem } from "@/lib/menu";
import { getMenu } from "@/lib/menu-data";
import cappuccino from "../../public/images/cafe/cappuccino.jpg";
import { DishGrid } from "./dish-tile";
import { DishImage } from "./dish-image";
import { DishLink } from "./dish-link";
import { FoodMark } from "./food-mark";
import { ChevronRight, StarIcon } from "./icons";
import { Reveal, RevealHeading } from "./motion/reveal";
import { OffersRail } from "./offers-rail";
import { QtyControl } from "./qty-control";

function SectionHead({ id, eyebrow, title, sub, href, cta, tone = "light" }: { id: string; eyebrow?: string; title: string; sub?: string; href?: string; cta?: string; tone?: "light" | "dark" }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className={`text-xs font-bold uppercase tracking-[0.2em] ${tone === "dark" ? "text-crema" : "text-mocha"}`}>{eyebrow}</p>}
        <RevealHeading id={id} className="mt-1.5 font-display text-3xl font-bold sm:text-4xl">
          {title}
        </RevealHeading>
        {sub && <p className={`mt-1.5 ${tone === "dark" ? "text-foam/75" : "text-muted"}`}>{sub}</p>}
      </div>
      {href && (
        <Link
          href={href}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={`flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-semibold hover:underline ${tone === "dark" ? "text-crema" : "text-roast"}`}
        >
          {cta} <ChevronRight />
        </Link>
      )}
    </div>
  );
}

export function OffersSection() {
  if (!offers.length) return null;
  return (
    <section aria-labelledby="offers" className="mx-auto max-w-6xl px-4 pt-14">
      <SectionHead id="offers" eyebrow="A little treat" title="Offers for you" />
      <div className="mt-5">
        <OffersRail offers={offers} />
      </div>
    </section>
  );
}

export async function CategoryTiles() {
  const { categories, imageForCategory } = await getMenu();
  if (!categories.length) return null;
  return (
    <section aria-labelledby="cats" className="mx-auto max-w-6xl px-4">
      <SectionHead id="cats" eyebrow="Find your favourite" title="What are you craving?" href="/menu" cta="Full menu" />
      <ul className="no-scrollbar -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {categories.map((c, i) => (
          <li key={c.id} className="w-24 shrink-0 sm:w-auto">
            <Reveal delay={(i % 6) * 0.05} y={16}>
              <Link href={`/menu?category=${c.id}`} className="group block rounded-2xl border border-line bg-paper p-2 text-center transition hover:-translate-y-1 hover:border-crema hover:shadow-md">
                <span className="relative block aspect-square overflow-hidden rounded-xl">
                  <Image src={imageForCategory(c.id) ?? "/images/cafe/interior.jpg"} alt="" fill sizes="(min-width: 1024px) 160px, (min-width: 640px) 25vw, 96px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                </span>
                <span className="mt-2 block truncate text-sm font-semibold">{c.name}</span>
                <span className="block text-xs text-muted">{countItems(c)} dishes</span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function PopularPicks() {
  const { bestsellers, photoFor } = await getMenu();
  // One dish per photo first, so stock photos shared by a whole section don't repeat side by side.
  const withPhoto = bestsellers.filter((i) => i.available && photoFor(i.id));
  const seen = new Set<string>();
  const varied = withPhoto.filter((i) => !seen.has(photoFor(i.id)!.src) && seen.add(photoFor(i.id)!.src));
  const picks = [...varied, ...withPhoto.filter((i) => !varied.includes(i))].slice(0, 8);
  if (!picks.length) return null;
  return (
    <section id="popular" aria-labelledby="best" className="mx-auto max-w-6xl scroll-mt-24 px-4">
      <SectionHead id="best" eyebrow="Made with love" title="Popular picks" sub="Marked as bestsellers on the cafe's delivery menu." href="/menu?bestsellers=1" cta="See all" />
      <div className="mt-6">
        <DishGrid items={picks} label="Popular picks" />
      </div>
    </section>
  );
}

/** The coffee and drinks list, in the black-and-white style of the cafe's printed menu card. */
export async function CoffeeExperience() {
  const menu = await getMenu();
  const coffee = menu.getCategory("coffee");
  if (!coffee) return null;
  const all = coffee.sections.flatMap((s) => s.items).filter((i) => i.available);
  const ranked = [...all.filter((i) => i.imageUrl), ...all.filter((i) => !i.imageUrl && i.recommended), ...all.filter((i) => !i.imageUrl && !i.recommended)].slice(0, 6);
  if (!ranked.length) return null;

  return (
    <section aria-labelledby="coffee" className="bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[0.9fr_1.1fr] md:items-center md:py-20">
        <div>
          <SectionHead id="coffee" eyebrow="The coffee experience" title="Brewed for every mood" sub="Hot classics, cold coffees and frappes, served in the cat cup." tone="dark" />
          <div className="relative mt-8 hidden aspect-[4/5] max-w-sm overflow-hidden rounded-[28px] md:block">
            <Image src={cappuccino} alt="A cappuccino with latte art in a Coffee Cat cup" fill placeholder="blur" sizes="384px" className="object-cover" />
          </div>
        </div>
        <div>
          <ul className="divide-y divide-paper/10 rounded-3xl border border-paper/10 bg-coffee/60 px-4">
            {ranked.map((i) => (
              <CoffeeRow key={i.id} item={i} photo={menu.photoFor(i.id)} />
            ))}
          </ul>
          <Link href="/menu?category=coffee" className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-crema px-6 font-bold text-ink transition-colors hover:bg-[#c9a985]">
            See all {countItems(coffee)} coffees <ChevronRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CoffeeRow({ item, photo }: { item: MenuItem; photo?: DishPhoto }) {
  return (
    <li className="flex items-center gap-4 py-4">
      <DishLink id={item.id} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <DishImage id={item.id} name={item.name} photo={photo} sizes="64px" className="h-16 w-16 rounded-2xl" />
      </DishLink>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <FoodMark type={item.type} className="h-3.5 w-3.5" />
          <DishLink id={item.id} className="truncate font-semibold hover:text-crema">
            {item.name}
          </DishLink>
        </p>
        <p className="mt-0.5 text-sm text-foam/75">
          {formatINR(item.price)}
          {item.recommended && <span className="ml-2 text-crema">★ Bestseller</span>}
        </p>
      </div>
      <QtyControl id={item.id} name={item.name} size="sm" />
    </li>
  );
}

export function ReviewsSection() {
  if (!ratings.length) return null;
  return (
    <section aria-labelledby="reviews" className="mx-auto max-w-6xl px-4">
      <SectionHead id="reviews" eyebrow="Loved in Sector 77" title="What guests say" sub="Ratings from public listings." href={mapsUrl} cta="Read reviews" />
      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ratings.map((r) => (
          <li key={r.source} className="rounded-2xl border border-line bg-paper p-4">
            <p className="flex items-center gap-1.5 font-display text-3xl font-bold">
              {r.value}
              <StarIcon className="h-5 w-5" fill="var(--crema)" />
            </p>
            <p className="mt-1 text-sm font-semibold">{r.source}</p>
            <p className="text-xs text-muted">{r.count}</p>
          </li>
        ))}
      </ul>
      {highlights.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold">Reviewers keep mentioning</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {highlights.map((h) => (
              <li key={h} className="rounded-full bg-foam px-3 py-1.5 text-sm">
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
