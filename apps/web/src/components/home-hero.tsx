import Image from "next/image";
import Link from "next/link";
import { headlineRating, mapsUrl } from "@/lib/cafe";
import { formatINR, pricing } from "@/lib/menu";
import coldCoffee from "../../public/images/cafe/cold-coffee.jpg";
import { ChevronRight, StarIcon } from "./icons";
import { OpenStatus } from "./open-status";

/** Split hero: promise and CTAs on the left, the cafe's own cold coffee on the right. Server-rendered; CSS-only entrance. */
export function HomeHero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-ink text-paper">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-crema/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:pb-20 md:pt-16">
        <div>
          <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-crema/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-crema">
            Your neighbourhood cafe · Sector 77
          </p>
          <h1 id="hero-title" className="animate-rise mt-5 font-display text-[2.6rem] font-bold leading-[1.08] [animation-delay:80ms] sm:text-5xl lg:text-6xl">
            Your favourite coffee corner, <span className="italic text-crema">just a click away.</span>
          </h1>
          <p className="animate-rise mt-5 max-w-md text-base leading-relaxed text-foam/85 [animation-delay:160ms] sm:text-lg">
            Cold coffee, momos, pizzas and comfort food from The Coffee Cat, Antriksh Forest Market. Delivered, or ready for pickup.
          </p>

          <div className="animate-rise mt-7 flex flex-wrap gap-3 [animation-delay:240ms]">
            <Link href="/menu" className="flex h-12 items-center gap-2 rounded-xl bg-crema px-6 font-bold text-ink transition-colors hover:bg-[#c9a985] active:scale-[0.98]">
              Explore menu <ChevronRight className="h-4.5 w-4.5" />
            </Link>
            <Link href="/menu?sort=popular&bestsellers=1" className="flex h-12 items-center rounded-xl border border-crema/50 px-6 font-semibold text-paper transition-colors hover:bg-paper/10 active:scale-[0.98]">
              Order your favourites
            </Link>
          </div>

          <div className="animate-rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 [animation-delay:320ms]">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline">
              <span className="flex items-center gap-1 rounded-lg bg-ok px-2 py-1 font-bold text-paper">
                {headlineRating.value} <StarIcon className="h-3.5 w-3.5" />
              </span>
              <span className="text-foam/85">
                {headlineRating.count.replace(" ratings", "")} {headlineRating.source} ratings
              </span>
            </a>
            <span className="hidden h-6 w-px bg-paper/20 sm:block" aria-hidden="true" />
            <OpenStatus tone="dark" />
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,0.45)] md:aspect-[4/5]">
            <Image
              src={coldCoffee}
              alt="Cold coffee in a Coffee Cat cup"
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 1152px) 520px, (min-width: 768px) 45vw, 100vw"
              className="hero-photo object-cover object-[50%_45%]"
            />
          </div>
          <div className="absolute -bottom-5 left-4 rounded-2xl bg-cream px-4 py-3 text-ink shadow-xl md:-left-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-crema-ink">Free delivery</p>
            <p className="font-display text-lg font-bold">On orders above {formatINR(pricing.freeDeliveryAbove)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
