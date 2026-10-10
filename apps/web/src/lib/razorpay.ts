"use client";

import type { OrderView, PaymentSession } from "@coffeecat/shared";
import { apiFetch } from "./api-client";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;

/** Razorpay's checkout script, loaded only when someone actually pays online. */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load the payment window. Check your connection."));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export type PayResult = { outcome: "paid"; order: OrderView } | { outcome: "dismissed" } | { outcome: "failed"; message: string };

/**
 * Opens Razorpay Checkout for an order. On success the signed response goes to our API, which
 * verifies it before marking the order paid (Razorpay's webhook confirms it independently too).
 */
export async function payWithRazorpay(code: string, token: string | null, session: PaymentSession, prefill: { name?: string; contact?: string }): Promise<PayResult> {
  await loadCheckout();
  return new Promise<PayResult>((resolve) => {
    let settled = false;
    const done = (r: PayResult) => !settled && ((settled = true), resolve(r));
    const rzp = new window.Razorpay!({
      key: session.keyId,
      order_id: session.razorpayOrderId,
      amount: session.amount,
      currency: session.currency,
      name: "The Coffee Cat",
      description: `Order #${code}`,
      prefill: { name: prefill.name, contact: prefill.contact ? `+91${prefill.contact}` : undefined },
      theme: { color: "#7a2229" },
      handler: async (response: RazorpayResponse) => {
        try {
          const order = await apiFetch<OrderView>(`/orders/${code}/payment/confirm${token ? `?t=${encodeURIComponent(token)}` : ""}`, { json: response });
          done({ outcome: "paid", order });
        } catch (e) {
          done({ outcome: "failed", message: (e as Error).message });
        }
      },
      modal: { ondismiss: () => done({ outcome: "dismissed" }), confirm_close: true },
    });
    rzp.on("payment.failed", (r) => done({ outcome: "failed", message: r.error?.description ?? "The payment didn't go through." }));
    rzp.open();
  });
}
