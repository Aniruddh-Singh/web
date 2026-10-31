"use client";

import { useState } from "react";
import type { Offer } from "@/lib/cafe";
import { CheckIcon } from "./icons";

/** Offer tickets; coupon offers have a one-tap "Copy code". */
export function OffersRail({ offers }: { offers: Offer[] }) {
  if (!offers.length) return null;
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1" aria-label="Offers">
      {offers.map((o) => (
        <li key={o.id} className="snap-start">
          <OfferTicket offer={o} />
        </li>
      ))}
    </ul>
  );
}

function OfferTicket({ offer }: { offer: Offer }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!offer.code) return;
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or permissions): the code is still visible to type.
    }
  };

  return (
    <div className="flex h-full min-w-72 items-center gap-4 rounded-2xl border border-dashed border-crema bg-paper px-4 py-3.5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-bold text-crema">%</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{offer.title}</span>
        <span className="block text-sm text-muted">
          {offer.detail}
          {offer.code && <strong className="ml-1 font-mono tracking-wider text-ink">{offer.code}</strong>}
        </span>
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
