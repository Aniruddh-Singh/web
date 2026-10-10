import Link from "next/link";
import { business } from "@/lib/menu";
import { LogoMark } from "./logo";

/** Swish-style footer: brand colour, giant watermark, tilted stickers and a script sign-off. */
export function SiteFooter() {
  return (
    <footer className="relative mt-0 overflow-hidden rounded-t-[40px] bg-roast text-foam">
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 pb-48 pt-14 sm:grid-cols-[1.3fr_1fr_1fr] sm:pb-56">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-paper">
            <LogoMark className="h-12 w-12 ring-4 ring-paper" />
            <span className="font-display text-2xl font-bold">The Coffee Cat</span>
          </div>
          <p className="max-w-xs text-foam/85">A small cafe in Antriksh Forest Market, open since {business.established}.</p>
          <p className="font-script text-3xl text-crema">Thanks for stopping by.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-paper">Visit</p>
          <p className="text-foam/85">{business.address}</p>
          <p className="text-foam/70">{business.landmark}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-paper">Contact</p>
          <p><a className="underline-offset-4 hover:text-paper hover:underline" href={`tel:${business.phone.primary.replace(/\s/g, "")}`}>{business.phone.primary}</a></p>
          <p><a className="underline-offset-4 hover:text-paper hover:underline" href={`mailto:${business.email}`}>{business.email}</a></p>
          <p><a className="underline-offset-4 hover:text-paper hover:underline" href={business.social.instagram} target="_blank" rel="noopener noreferrer">Instagram: @thecoffeecatindia</a></p>
          <p><Link className="underline-offset-4 hover:text-paper hover:underline" href="/menu">Full menu</Link></p>
          <p><a className="underline-offset-4 hover:text-paper hover:underline" href={process.env.NEXT_PUBLIC_ADMIN_URL ?? "/"}>Staff login</a></p>
        </div>
      </div>

      {/* Stickers */}
      <div className="pointer-events-none absolute bottom-20 left-[6%] z-10 -rotate-12 sm:bottom-24" aria-hidden="true">
        <div className="rounded-full bg-paper p-2 shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
          <LogoMark className="h-20 w-20 sm:h-24 sm:w-24" />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-24 right-[6%] z-10 rotate-6 sm:bottom-28" aria-hidden="true">
        <span className="block rounded-2xl border-4 border-paper bg-crema px-5 py-2 font-script text-3xl font-bold text-ink shadow-[0_12px_30px_rgba(0,0,0,0.3)] sm:text-4xl">
          Purr-fect coffee
        </span>
      </div>

      {/* Giant watermark */}
      <p
        className="pointer-events-none absolute inset-x-0 -bottom-[0.18em] select-none text-center font-display text-[19vw] font-extrabold leading-none tracking-tighter whitespace-nowrap text-paper/[0.07]"
        aria-hidden="true"
      >
        The Coffee Cat
      </p>
      <div style={{ height: "var(--bottom-nav)" }} />
    </footer>
  );
}
