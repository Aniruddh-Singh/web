import Link from "next/link";
import { LogoMark } from "./logo";

/** Friendly empty screen with one clear next step. */
export function EmptyState({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="animate-rise mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-foam">
        <LogoMark className="h-16 w-16" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <Link href={href} className="mt-6 inline-block rounded-lg bg-roast px-5 py-3 font-semibold text-paper transition-colors hover:bg-roast-hover active:scale-95">
        {cta}
      </Link>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-48" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <div className="skeleton h-20" />
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
          <div className="skeleton h-24" />
        </div>
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}
