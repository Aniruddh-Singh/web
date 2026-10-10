"use client";

import { formatINR as formatPaise, type CreateOrderResult, type FulfilmentMode, type PaymentMethod, type QuoteResult } from "@coffeecat/shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import { payWithRazorpay } from "@/lib/razorpay";
import { formatINR } from "@/lib/menu";
import { actions, cartLines, useHydrated, useStore } from "@/lib/store";
import { useStoreStatus } from "@/lib/store-status";
import { FoodMark } from "./food-mark";
import { QtyControl } from "./qty-control";
import { useMenu } from "./menu-provider";
import { EmptyState, PageSkeleton } from "./empty-state";
import { CheckIcon } from "./icons";
import { useCustomer } from "./customer-auth";
import type { Address } from "@coffeecat/shared";

type Details = { name: string; phone: string; address: string; notes: string };
type Errors = Partial<Record<keyof Details, string>>;

const field =
  "mt-1 h-11 w-full rounded-lg border border-line bg-paper px-3 text-[16px] focus:border-roast focus:outline-none aria-[invalid=true]:border-nonveg";

/** Quick checks before asking the server; the server re-validates everything. */
function validate(d: Details, mode: FulfilmentMode): Errors {
  const e: Errors = {};
  if (!d.name.trim()) e.name = "Enter your name.";
  if (!/^[6-9]\d{9}$/.test(d.phone.replace(/\D/g, "").slice(-10))) e.phone = "Enter a 10-digit mobile number.";
  if (mode === "delivery" && d.address.trim().length < 10) e.address = "Enter your full address, including flat and tower.";
  return e;
}

/** Server field paths ("customer.phone") to form fields. */
const fieldFor = (path: string): keyof Details | null => {
  const key = path.replace("customer.", "");
  return key === "name" || key === "phone" || key === "address" || key === "notes" ? key : null;
};

export function CheckoutView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const menu = useMenu();
  const lines = useStore((s) => cartLines(s, menu));
  const status = useStoreStatus();
  const [mode, setMode] = useState<FulfilmentMode>("delivery");
  const [details, setDetails] = useState<Details>({ name: "", phone: "", address: "", notes: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string>();
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState<string>();
  const [step, setStep] = useState<"details" | "pay">("details");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<{ message: string; unavailable?: string[] }>();
  const { session, profile } = useCustomer();
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Logged-in customers: fill in what we know, once.
  useEffect(() => {
    if (!session || !profile) return;
    const t = setTimeout(async () => {
      const saved = await apiFetch<Address[]>("/me/addresses").catch(() => []);
      setAddresses(saved);
      const def = saved.find((a) => a.isDefault);
      setDetails((d) => ({
        ...d,
        name: d.name || profile.name || "",
        phone: d.phone || profile.phone || "",
        address: d.address || (def ? [def.line, def.landmark && `near ${def.landmark}`].filter(Boolean).join(", ") : ""),
      }));
    }, 0);
    return () => clearTimeout(t);
  }, [session, profile]);

  const cartKey = useMemo(() => lines.map((l) => `${l.id}:${l.qty}`).join(","), [lines]);

  // Ask the server for the real bill whenever the cart, mode or coupon changes.
  useEffect(() => {
    if (!cartKey) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const q = await apiFetch<QuoteResult>("/orders/quote", {
          json: { lines: cartKey.split(",").map((p) => ({ itemId: p.split(":")[0], qty: Number(p.split(":")[1]) })), mode, couponCode: coupon },
          signal: controller.signal,
        });
        setQuote(q);
        setQuoteError(undefined);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setQuoteError(e instanceof ApiError ? e.message : "Couldn't update the total.");
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [cartKey, mode, coupon]);

  if (!hydrated) return <PageSkeleton />;

  if (lines.length === 0) {
    return <EmptyState title="Your cart is empty" body="Add a cold coffee or a plate of momos to get started." href="/menu" cta="Browse the menu" />;
  }

  const open = status ? status.openNow : true;
  const bill = quote?.bill;
  const unavailableNames = (quote?.unavailable ?? []).map((id) => menu.getItem(id)?.name ?? id);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    setCoupon(code || undefined);
  };

  const toPayment = () => {
    const e = validate(details, mode);
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`f-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setPlaceError(undefined);
    setStep("pay");
    window.scrollTo({ top: 0 });
  };

  const placeOrder = async (method: PaymentMethod) => {
    setPlacing(true);
    setPlaceError(undefined);
    try {
      const result = await apiFetch<CreateOrderResult>("/orders", {
        json: {
          lines: lines.map((l) => ({ itemId: l.id, qty: l.qty })),
          mode,
          customer: { ...details, address: mode === "delivery" ? details.address : "" },
          couponCode: quote?.coupon?.applied ? coupon : undefined,
          paymentMethod: method,
        },
      });
      actions.rememberOrder(result.order.code, result.trackingToken);
      if (result.payment) {
        // Online: pay now. Whatever happens, the order page shows the outcome and offers a retry.
        const paid = await payWithRazorpay(result.order.code, result.trackingToken, result.payment, { name: details.name, contact: details.phone.replace(/\D/g, "").slice(-10) });
        router.push(`/order?code=${result.order.code}${paid.outcome === "paid" ? "" : `&payment=${paid.outcome}`}`);
        return;
      }
      router.push(`/order?code=${result.order.code}`);
    } catch (e) {
      setPlacing(false);
      if (e instanceof ApiError) {
        const fieldIssues = (e.body.issues ?? []).flatMap((i) => (fieldFor(i.path) ? [[fieldFor(i.path)!, i.message] as const] : []));
        if (fieldIssues.length) {
          setErrors(Object.fromEntries(fieldIssues));
          setStep("details");
          return;
        }
        setPlaceError({ message: e.message, unavailable: e.body.unavailable });
      } else {
        setPlaceError({ message: "Something went wrong placing your order. Try again." });
      }
    }
  };

  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDetails({ ...details, [k]: e.target.value });

  const total = bill ? formatPaise(bill.total) : "…";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Steps current={step === "details" ? 0 : 1} />
      <h1 className="mt-6 font-display text-3xl font-bold">{step === "details" ? "Checkout" : `Pay ${total}`}</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {unavailableNames.length > 0 && (
            <div role="alert" className="mb-5 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-nonveg">
              <p>{unavailableNames.join(", ")} {unavailableNames.length > 1 ? "are" : "is"} sold out right now.</p>
              <button type="button" onClick={() => actions.removeItems(quote!.unavailable)} className="mt-2 font-semibold underline">
                Remove from cart
              </button>
            </div>
          )}
          {step === "details" ? (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                toPayment();
              }}
              className="space-y-6"
            >
              <fieldset>
                <legend className="font-semibold">How do you want your order?</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["delivery", "takeaway"] as const).map((m) => (
                    <label
                      key={m}
                      className={`cursor-pointer rounded-xl border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-roast ${
                        mode === m ? "border-roast bg-foam" : "border-line"
                      }`}
                    >
                      <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                      <span className="block font-semibold">{m === "delivery" ? "Delivery" : "Takeaway"}</span>
                      <span className="block text-sm text-muted">
                        {m === "delivery" ? "To your door, nearby sectors" : "Pick up at the counter"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="font-semibold">Your details</legend>
                <div>
                  <label htmlFor="f-name" className="text-sm font-medium">Name</label>
                  <input id="f-name" autoComplete="name" value={details.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby="e-name" className={field} />
                  {errors.name && <p id="e-name" className="mt-1 text-sm text-nonveg">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="f-phone" className="text-sm font-medium">Mobile number</label>
                  <input id="f-phone" type="tel" inputMode="numeric" autoComplete="tel" value={details.phone} onChange={set("phone")} aria-invalid={!!errors.phone} aria-describedby="e-phone" className={field} />
                  {errors.phone && <p id="e-phone" className="mt-1 text-sm text-nonveg">{errors.phone}</p>}
                </div>
                {mode === "delivery" && (
                  <div>
                    <label htmlFor="f-address" className="text-sm font-medium">Delivery address</label>
                    {addresses.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Saved addresses">
                        {addresses.map((a) => {
                          const text = [a.line, a.landmark && `near ${a.landmark}`].filter(Boolean).join(", ");
                          return (
                            <button key={a.id} type="button" onClick={() => setDetails((d) => ({ ...d, address: text }))} aria-pressed={details.address === text} className={`rounded-full border px-3 py-1 text-sm ${details.address === text ? "border-roast bg-foam font-semibold" : "border-line"}`}>
                              {a.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <textarea id="f-address" autoComplete="street-address" rows={3} value={details.address} onChange={set("address")} aria-invalid={!!errors.address} aria-describedby="e-address" className={`${field} h-auto py-2`} placeholder="Flat, tower, society, sector" />
                    {errors.address && <p id="e-address" className="mt-1 text-sm text-nonveg">{errors.address}</p>}
                  </div>
                )}
                <div>
                  <label htmlFor="f-notes" className="text-sm font-medium">Notes for the kitchen <span className="text-muted">(optional)</span></label>
                  <input id="f-notes" value={details.notes} onChange={set("notes")} className={field} placeholder="Less spicy, no onion" />
                </div>
              </fieldset>

              {!open && (
                <p role="status" className="rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-nonveg">
                  The cafe isn&apos;t taking orders right now, so you can&apos;t place this order yet.
                </p>
              )}
              <button
                type="submit"
                disabled={!open || unavailableNames.length > 0}
                className="h-12 w-full rounded-xl bg-roast font-semibold text-paper hover:bg-roast-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
              >
                Continue to payment
              </button>
            </form>
          ) : (
            <div className="animate-rise">
              <PaymentStep total={total} ready={!!bill} mode={mode} online={!!status?.onlinePayments} placing={placing} error={placeError?.message} onBack={() => setStep("details")} onPay={placeOrder} />
            </div>
          )}
        </div>

        <aside aria-label="Order summary" className="h-fit rounded-2xl border border-line p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Your order</h2>
          <ul className="mt-3 divide-y divide-line">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <FoodMark type={l.type} className="h-3.5 w-3.5" />
                <span className="min-w-0 flex-1 text-sm">{l.name}</span>
                {step === "details" ? <QtyControl id={l.id} name={l.name} size="sm" /> : <span className="text-sm text-muted">×{l.qty}</span>}
                <span className="w-14 text-right text-sm font-medium">{formatINR(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>

          {step === "details" && (
            <div className="mt-3">
              <label htmlFor="coupon" className="text-sm font-medium">Coupon code</label>
              <div className="mt-1 flex gap-2">
                <input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())} placeholder="PURR50" className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-[16px] uppercase focus:border-roast focus:outline-none" />
                <button type="button" onClick={applyCoupon} className="rounded-lg border border-roast px-4 text-sm font-semibold text-roast hover:bg-foam">
                  Apply
                </button>
              </div>
              {quote?.coupon && (
                <p role="status" className={`mt-1 text-sm ${quote.coupon.applied ? "text-ok" : "text-muted"}`}>
                  {quote.coupon.message}
                </p>
              )}
            </div>
          )}

          <dl className="mt-4 space-y-1.5 border-t border-dashed border-line pt-4 text-sm" aria-busy={!bill}>
            {bill ? (
              <>
                <div className="flex justify-between"><dt>Item total</dt><dd>{formatPaise(bill.itemTotal)}</dd></div>
                {bill.discount > 0 && <div className="flex justify-between text-ok"><dt>Coupon {coupon}</dt><dd>−{formatPaise(bill.discount)}</dd></div>}
                {mode === "delivery" && (
                  <div className="flex justify-between">
                    <dt>Delivery fee</dt>
                    <dd>{bill.deliveryFee ? formatPaise(bill.deliveryFee) : "Free"}</dd>
                  </div>
                )}
                <div className="flex justify-between"><dt>Packaging</dt><dd>{formatPaise(bill.packaging)}</dd></div>
                <div className="flex justify-between"><dt>GST</dt><dd>{formatPaise(bill.gst)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>To pay</dt><dd>{formatPaise(bill.total)}</dd></div>
              </>
            ) : (
              <div className="space-y-2" aria-hidden="true">
                <div className="skeleton h-4" />
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-6" />
              </div>
            )}
          </dl>
          {quoteError && <p role="alert" className="mt-2 text-sm text-nonveg">{quoteError}</p>}
          {mode === "delivery" && bill && bill.deliveryFee > 0 && status && (
            <p className="mt-2 text-xs text-muted">Add {formatPaise(status.freeDeliveryAbovePaise - bill.itemTotal)} more for free delivery.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function PaymentStep({
  total,
  ready,
  mode,
  online,
  placing,
  error,
  onBack,
  onPay,
}: {
  total: string;
  /** False until the server's total has loaded; customers must see what they'll pay. */
  ready: boolean;
  mode: FulfilmentMode;
  online: boolean;
  placing: boolean;
  error?: string;
  onBack: () => void;
  onPay: (m: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>(online ? "upi" : "cod");

  // UPI and cards go through Razorpay; offered only when the cafe's Razorpay account is connected.
  const options: { id: PaymentMethod; title: string; hint: string; disabled?: boolean }[] = [
    { id: "upi", title: "UPI", hint: online ? "Google Pay, PhonePe, Paytm or any UPI app" : "Coming soon", disabled: !online },
    { id: "card", title: "Credit or debit card", hint: online ? "Visa, Mastercard, RuPay" : "Coming soon", disabled: !online },
    { id: "cod", title: mode === "delivery" ? "Pay on delivery" : "Pay at the counter", hint: "Cash or UPI when you get your order" },
  ];

  if (placing) {
    return (
      <div role="status" className="flex flex-col items-center rounded-2xl border border-line py-16 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-foam border-t-roast motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-4 font-semibold">{method === "cod" ? "Placing your order" : "Opening secure payment"}</p>
        <p className="text-sm text-muted">Don&apos;t close this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-roast hover:underline">
        Back to details
      </button>
      <fieldset className="space-y-2">
        <legend className="sr-only">Payment method</legend>
        {options.map((o) => (
          <label
            key={o.id}
            className={`block rounded-xl border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-roast ${
              o.disabled ? "cursor-not-allowed border-line opacity-60" : method === o.id ? "cursor-pointer border-roast bg-foam" : "cursor-pointer border-line"
            }`}
          >
            <span className="flex items-center gap-3">
              <input type="radio" name="pay" checked={method === o.id} disabled={o.disabled} onChange={() => setMethod(o.id)} className="accent-[var(--roast)]" />
              <span>
                <span className="block font-semibold">{o.title}</span>
                <span className="block text-sm text-muted">{o.hint}</span>
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="rounded-lg bg-[#fbeceb] px-3 py-2 text-sm text-nonveg">{error}</p>}
      <button type="button" onClick={() => onPay(method)} disabled={!ready} className="h-12 w-full rounded-xl bg-roast font-semibold text-paper hover:bg-roast-hover disabled:cursor-wait disabled:opacity-60">
        {method === "cod" ? `Place order, pay ${total} ${mode === "delivery" ? "on delivery" : "at the counter"}` : `Pay ${total}`}
      </button>
      {method !== "cod" && <p className="text-center text-xs text-muted">Payments are processed securely by Razorpay.</p>}
    </div>
  );
}

const stepNames = ["Details", "Payment", "Order placed"];

/** Checkout progress: a real sequence, so numbered steps make sense here. */
function Steps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Checkout steps">
      {stepNames.map((name, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={name} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition-colors duration-300 ${
                done ? "bg-ok text-paper" : active ? "bg-roast text-paper" : "bg-surface text-muted"
              }`}
            >
              {done ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={active ? "font-semibold" : "text-muted"}>{name}</span>
            {i < stepNames.length - 1 && <span className={`h-px w-6 sm:w-12 ${done ? "bg-ok" : "bg-line"}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
