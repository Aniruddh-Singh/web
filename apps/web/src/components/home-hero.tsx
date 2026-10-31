import Image from "next/image";
import Link from "next/link";
import { headlineRating, mapsUrl } from "@/lib/cafe";
import { formatINR, pricing } from "@/lib/menu";
import coldCoffee from "../../public/images/cafe/cold-coffee.jpg";
import { ChevronRight, StarIcon } from "./icons";
import { OpenStatus } from "./open-status";

const pin = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
  </svg>
);

/** Split hero: the cafe's line and order CTAs, with its own cold coffee photo (first on phones). Server-rendered; CSS-only entrance. */
export function HomeHero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-ink text-paper">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-crema/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-7 px-4 pb-10 pt-5 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:pb-20 md:pt-16">
        <div className="relative md:order-2">
          <div className="relative aspect-[16/11] overflow-hidden rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.45)] md:aspect-[4/5] md:rounded-[28px]">
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
          <div className="absolute -bottom-4 left-3 rounded-2xl bg-cream px-3.5 py-2.5 text-ink shadow-xl md:-bottom-5 md:-left-8 md:px-4 md:py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-crema-ink">Free delivery</p>
            <p className="font-display text-base font-bold md:text-lg">On orders above {formatINR(pricing.freeDeliveryAbove)}</p>
          </div>
        </div>

        <div className="md:order-1">
          <p className="animate-rise mt-2 inline-flex items-center gap-1.5 rounded-full border border-crema/40 px-3 py-1.5 text-xs font-semibold text-crema md:mt-0">
            {pin} Delivering around Sector 77, Noida
          </p>
          <h1 id="hero-title" className="animate-rise mt-4 font-display text-[2.35rem] font-bold leading-[1.08] [animation-delay:80ms] sm:text-5xl lg:text-6xl">
            Cold coffee, warm swings and <span className="italic text-crema">a cat on every cup.</span>
          </h1>
          <p className="animate-rise mt-4 max-w-md text-base leading-relaxed text-foam/85 [animation-delay:160ms] sm:text-lg">
            Your favourite coffee corner, just a click away. Momos, pizzas and comfort food too, delivered or ready for pickup.
          </p>

          <div className="animate-rise mt-6 grid grid-cols-2 gap-3 [animation-delay:240ms] sm:flex">
            <Link href="/menu" className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-crema px-6 font-bold text-ink transition-colors hover:bg-[#c9a985] active:scale-[0.98]">
              Order now <ChevronRight className="h-4.5 w-4.5" />
            </Link>
            <Link href="#categories" className="flex h-12 items-center justify-center rounded-xl border border-crema/50 px-6 font-semibold text-paper transition-colors hover:bg-paper/10 active:scale-[0.98]">
              Explore menu
            </Link>
          </div>

          <div className="animate-rise mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 [animation-delay:320ms]">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 text-sm hover:underline">
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
      </div>
    </section>
  );
}
