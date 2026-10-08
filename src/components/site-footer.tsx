import Link from "next/link";
import { business } from "@/lib/menu";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 pb-28 text-sm text-muted sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ink">
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-lg font-bold">The Coffee Cat</span>
          </div>
          <p>A small cafe in Antriksh Forest Market, open since {business.established}.</p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-ink">Visit</p>
          <p>{business.address}</p>
          <p>{business.landmark}</p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-ink">Contact</p>
          <p>
            <a className="hover:text-ink" href={`tel:${business.phone.primary.replace(/\s/g, "")}`}>
              {business.phone.primary}
            </a>
          </p>
          <p>
            <a className="hover:text-ink" href={`mailto:${business.email}`}>
              {business.email}
            </a>
          </p>
          <p>
            <a className="hover:text-ink" href={business.social.instagram} target="_blank" rel="noopener noreferrer">
              Instagram: @thecoffeecatindia
            </a>
          </p>
          <p>
            <Link className="hover:text-ink" href="/admin">
              Staff panel
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
