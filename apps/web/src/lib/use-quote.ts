"use client";

import type { FulfilmentMode, QuoteResult } from "@coffeecat/shared";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "./api-client";

/**
 * The server's bill for a cart (prices, coupon, fees). Debounced and cancelled as the cart changes.
 * `cartKey` is "id:qty,id:qty"; an empty key means no quote.
 */
export function useQuote(cartKey: string, mode: FulfilmentMode, coupon?: string | null) {
  const [quote, setQuote] = useState<{ key: string; result: QuoteResult } | null>(null);
  const [error, setError] = useState<string>();
  const key = `${cartKey}|${mode}|${coupon ?? ""}`;

  useEffect(() => {
    if (!cartKey) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const result = await apiFetch<QuoteResult>("/orders/quote", {
          json: { lines: cartKey.split(",").map((p) => ({ itemId: p.split(":")[0], qty: Number(p.split(":")[1]) })), mode, couponCode: coupon || undefined },
          signal: controller.signal,
        });
        setQuote({ key, result });
        setError(undefined);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(e instanceof ApiError ? e.message : "Couldn't update the total.");
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [cartKey, mode, coupon, key]);

  // The last quote stays visible while a newer one loads; `fresh` says whether it matches the current cart.
  return { quote: cartKey ? (quote?.result ?? null) : null, fresh: quote?.key === key, error: cartKey ? error : undefined };
}
