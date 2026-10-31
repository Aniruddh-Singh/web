"use client";

import { useState } from "react";
import type { Offer } from "@/lib/cafe";
import { actions, useHydrated, useStore } from "@/lib/store";
import { CheckIcon } from "./icons";
import { CloseButton, Overlay } from "./overlay";

/** Offer tickets with one-tap "Copy" and a details sheet (terms, apply to cart). */
export function OffersRail({ offers }: { offers: Offer[] }) {
  const [open, setOpen] = useState<Offer | null>(null);
  if (!offers.length) return null;
  return (
    <>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1" aria-label="Offers">
        {offers.map((o) => (
          <li key={o.id} className="snap-start">
            <OfferTicket offer={o} onDetails={() => setOpen(o)} />
          </li>
        ))}
      </ul>
      <Overlay open={Boolean(open)} onClose={() => setOpen(null)} label={open?.title ?? "Offer details"} variant="sheet" panelClassName="md:max-w-md">
        {open && <OfferDetails offer={open} onClose={() => setOpen(null)} />}
      </Overlay>
    </>
  );
}

function useCopy(text?: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or permissions): the code is still visible to type.
    }
  };
  return { copied, copy };
}

function OfferTicket({ offer, onDetails }: { offer: Offer; onDetails: () => void }) {
  const { copied, copy } = useCopy(offer.code);
  return (
    <div className="flex h-full w-[300px] items-center gap-3 rounded-2xl border border-dashed border-crema bg-paper py-3 pl-4 pr-3 sm:w-[340px]">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-bold text-crema" aria-hidden="true">
        %
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{offer.title}</span>
        <span className="block text-sm text-muted">
          {offer.detail}
          {offer.code && <strong className="ml-1 font-mono tracking-wider text-ink">{offer.code}</strong>}
        </span>
        <button type="button" onClick={onDetails} aria-haspopup="dialog" className="-ml-1 mt-0.5 rounded px-1 py-1 text-xs font-semibold text-roast underline-offset-2 hover:underline">
          Details &amp; T&amp;Cs
        </button>
      </span>
      {offer.code && (
        <button
          type="button"
          onClick={copy}
          className={`flex h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-bold transition-colors ${copied ? "bg-ok text-paper" : "bg-foam text-ink hover:bg-crema"}`}
          aria-label={copied ? `Copied ${offer.code}` : `Copy code ${offer.code}`}
        >
          {copied ? (
            <>
              <CheckIcon /> Copied
            </>
          ) : (
            "Copy"
          )}
        </button>
      )}
    </div>
  );
}

function OfferDetails({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const hydrated = useHydrated();
  const current = useStore((s) => s.coupon);
  const applied = hydrated && offer.code && current === offer.code;
  return (
    <div className="relative p-6">
      <CloseButton onClick={onClose} className="absolute right-3 top-3" />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-mocha">Offer details</p>
      <h2 className="mt-1.5 pr-12 font-display text-2xl font-bold leading-tight">{offer.title}</h2>
      {offer.code && (
        <p className="mt-3 inline-block rounded-lg border border-dashed border-crema px-3 py-1.5 font-mono font-bold tracking-wider">{offer.code}</p>
      )}
      <h3 className="mt-5 text-sm font-semibold">Terms &amp; conditions</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
        {offer.terms.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {offer.code && (
        <button
          type="button"
          onClick={() => {
            actions.setCoupon(offer.code!);
            onClose();
          }}
          disabled={Boolean(applied)}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-roast font-semibold text-paper transition-colors hover:bg-roast-hover disabled:bg-ok"
        >
          {applied ? (
            <>
              <CheckIcon /> Added to your cart
            </>
          ) : (
            "Apply to my cart"
          )}
        </button>
      )}
      {offer.code && <p className="mt-2 text-center text-xs text-muted">We&apos;ll check it&apos;s valid before you pay.</p>}
    </div>
  );
}
