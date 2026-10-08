import Image from "next/image";
import Link from "next/link";
import { business, formatINR, pricing } from "@/lib/menu";
import { OpenStatus } from "./open-status";
import interior from "../../public/images/cafe/interior.jpg";
import swings from "../../public/images/cafe/swing-chairs.jpg";
import storefront from "../../public/images/cafe/storefront-night.jpg";

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${business.geo.lat},${business.geo.lng}`;
const tel = `tel:${business.phone.primary.replace(/\s/g, "")}`;

function RatingBadge({ value, label, count }: { value: string; label: string; count: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 rounded-lg bg-ok px-2 py-1 text-sm font-bold text-paper">
        {value}
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true" fill="currentColor">
          <path d="M10 1.5l2.6 5.5 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L1.4 7.7l6-.7z" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">{count}</span>
        <span className="block text-xs text-muted">{label}</span>
      </span>
    </div>
  );
}

export function RestaurantHeader() {
  return (
    <section aria-labelledby="restaurant-name" className="mx-auto max-w-6xl px-4 pt-4">
      <div className="grid gap-2 overflow-hidden rounded-2xl sm:h-[340px] sm:grid-cols-[2fr_1fr]">
        <div className="relative h-52 sm:h-full">
          <Image
            src={interior}
            alt="Inside The Coffee Cat: hanging swing chair, terrazzo tables and the cake counter"
            fill
            priority
            sizes="(min-width: 640px) 66vw, 100vw"
            className="object-cover"
            placeholder="blur"
          />
          <a href="#photos" className="absolute bottom-3 right-3 rounded-lg bg-ink/75 px-3 py-1.5 text-sm font-semibold text-paper sm:hidden">
            See all photos
          </a>
        </div>
        <div className="hidden grid-rows-2 gap-2 sm:grid">
          <div className="relative">
            <Image src={swings} alt="Rattan swing chairs by the window" fill sizes="33vw" className="object-cover object-[50%_60%]" placeholder="blur" />
          </div>
          <a href="#photos" className="group relative block">
            <Image src={storefront} alt="The Coffee Cat's lit sign at night" fill sizes="33vw" className="object-cover object-top" placeholder="blur" />
            <span className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-ink/70 to-transparent p-3 text-sm font-semibold text-paper group-hover:from-ink/80">
              See all photos
            </span>
          </a>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 id="restaurant-name" className="animate-rise font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            {business.name}
          </h1>
          <p className="animate-rise text-muted [animation-delay:60ms]">{business.cuisines.join(", ")}</p>
          <p className="animate-rise text-muted [animation-delay:120ms]">Antriksh Forest Market, Sector 77, Noida</p>
          <div className="animate-rise [animation-delay:180ms]">
            <OpenStatus />
          </div>
        </div>
        <div className="animate-rise flex gap-6 [animation-delay:200ms] sm:flex-col sm:gap-3">
          <RatingBadge value="4.4" count="400+ ratings" label="Dining, Google" />
          <RatingBadge value="4.0" count="1,300+ ratings" label="Delivery, Zomato" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-surface px-3 py-1.5">₹600 for two</span>
        <span className="rounded-full bg-surface px-3 py-1.5">Delivery and takeaway</span>
        <span className="rounded-full bg-surface px-3 py-1.5">Eggless desserts</span>
        <span className="rounded-full bg-surface px-3 py-1.5">Wi-Fi</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/menu" className="rounded-lg bg-roast px-5 py-2 text-sm font-semibold text-paper transition-colors hover:bg-roast-hover active:scale-95">
          Order now
        </Link>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface"
        >
          Get directions
        </a>
        <a href={tel} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-surface">
          Call the cafe
        </a>
      </div>

      <ul className="no-scrollbar mt-6 flex gap-3 overflow-x-auto" aria-label="Offers">
        <li className="flex min-w-64 items-center gap-3 rounded-xl border border-dashed border-crema bg-[#fdf6e7] px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-crema font-display text-sm font-extrabold text-ink">%</span>
          <span>
          <p className="font-semibold">₹50 off on orders above ₹399</p>
          <p className="text-sm text-crema-ink">Use code PURR50 at checkout</p>
          </span>
        </li>
        <li className="flex min-w-64 items-center gap-3 rounded-xl border border-dashed border-line px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foam text-roast">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3z M14 10h4l3 3v3h-7 M7.5 18.5a1.5 1.5 0 1 0 0-.01 M17.5 18.5a1.5 1.5 0 1 0 0-.01" /></svg>
          </span>
          <span>
          <p className="font-semibold">Free delivery above {formatINR(pricing.freeDeliveryAbove)}</p>
          <p className="text-sm text-muted">No code needed</p>
          </span>
        </li>
      </ul>
    </section>
  );
}
