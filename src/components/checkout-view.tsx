"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatINR, pricing } from "@/lib/menu";
import {
  actions,
  cartLines,
  computeBill,
  isOpenNow,
  useHydrated,
  useStore,
  type FulfilmentMode,
  type PaymentMethod,
} from "@/lib/store";
import { FoodMark } from "./food-mark";
import { QtyControl } from "./qty-control";
import { EmptyState, PageSkeleton } from "./empty-state";
import { CheckIcon } from "./icons";

type Details = { name: string; phone: string; address: string; notes: string };
type Errors = Partial<Record<keyof Details, string>>;

const field =
  "mt-1 h-11 w-full rounded-lg border border-line bg-paper px-3 text-[16px] focus:border-roast focus:outline-none aria-[invalid=true]:border-nonveg";

function validate(d: Details, mode: FulfilmentMode): Errors {
  const e: Errors = {};
  if (!d.name.trim()) e.name = "Enter your name.";
  if (!/^[6-9]\d{9}$/.test(d.phone.replace(/\D/g, "").slice(-10))) e.phone = "Enter a 10-digit mobile number.";
  if (mode === "delivery" && d.address.trim().length < 10) e.address = "Enter your full address, including flat and tower.";
  return e;
}

export function CheckoutView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useStore(cartLines);
  const settings = useStore((s) => s.settings);
  const [mode, setMode] = useState<FulfilmentMode>("delivery");
  const [details, setDetails] = useState<Details>({ name: "", phone: "", address: "", notes: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string>();
  const [couponMsg, setCouponMsg] = useState<string>();
  const [step, setStep] = useState<"details" | "pay">("details");

  const bill = computeBill(lines, mode, coupon);

  if (!hydrated) return <PageSkeleton />;
  const open = settings.accepting && isOpenNow(settings);

  if (lines.length === 0) {
    return <EmptyState title="Your cart is empty" body="Add a cold coffee or a plate of momos to get started." href="/menu" cta="Browse the menu" />;
  }

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const c = pricing.coupons[code];
    if (!c) return setCouponMsg(`${code || "That code"} isn't a valid code.`);
    if (bill.itemTotal < c.min) return setCouponMsg(`Add ${formatINR(c.min - bill.itemTotal)} more to use ${code}.`);
    setCoupon(code);
    setCouponMsg(`${code} applied: ${c.label}.`);
  };

  const toPayment = () => {
    const e = validate(details, mode);
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`f-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setStep("pay");
    window.scrollTo({ top: 0 });
  };

  const placeOrder = (method: PaymentMethod) => {
    actions.placeOrder({
      lines,
      mode,
      customer: { ...details, address: mode === "delivery" ? details.address : "" },
      coupon,
      bill,
      payment: { method, paid: method !== "cod" },
    });
    router.push("/order");
  };

  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDetails({ ...details, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Steps current={step === "details" ? 0 : 1} />
      <h1 className="mt-6 font-display text-3xl font-bold">{step === "details" ? "Checkout" : `Pay ${formatINR(bill.total)}`}</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
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
                        {m === "delivery" ? "30 to 40 min to your door" : "Ready at the counter in 15 min"}
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
                disabled={!open}
                className="h-12 w-full rounded-xl bg-roast font-semibold text-paper hover:bg-roast-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
              >
                Continue to payment
              </button>
            </form>
          ) : (
            <div className="animate-rise">
            <PaymentStep total={bill.total} mode={mode} onBack={() => setStep("details")} onPaid={placeOrder} />
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
                <input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="PURR50" className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-[16px] uppercase focus:border-roast focus:outline-none" />
                <button type="button" onClick={applyCoupon} className="rounded-lg border border-roast px-4 text-sm font-semibold text-roast hover:bg-foam">
                  Apply
                </button>
              </div>
              {couponMsg && <p role="status" className="mt-1 text-sm text-muted">{couponMsg}</p>}
            </div>
          )}

          <dl className="mt-4 space-y-1.5 border-t border-dashed border-line pt-4 text-sm">
            <div className="flex justify-between"><dt>Item total</dt><dd>{formatINR(bill.itemTotal)}</dd></div>
            {bill.discount > 0 && <div className="flex justify-between text-ok"><dt>Coupon {coupon}</dt><dd>−{formatINR(bill.discount)}</dd></div>}
            {mode === "delivery" && (
              <div className="flex justify-between">
                <dt>Delivery fee</dt>
                <dd>{bill.delivery ? formatINR(bill.delivery) : "Free"}</dd>
              </div>
            )}
            <div className="flex justify-between"><dt>Packaging</dt><dd>{formatINR(bill.packaging)}</dd></div>
            <div className="flex justify-between"><dt>GST (5%)</dt><dd>{formatINR(bill.gst)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>To pay</dt><dd>{formatINR(bill.total)}</dd></div>
          </dl>
          {mode === "delivery" && bill.delivery > 0 && (
            <p className="mt-2 text-xs text-muted">Add {formatINR(pricing.freeDeliveryAbove - bill.itemTotal)} more for free delivery.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function PaymentStep({
  total,
  mode,
  onBack,
  onPaid,
}: {
  total: number;
  mode: FulfilmentMode;
  onBack: () => void;
  onPaid: (m: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "" });
  const [error, setError] = useState<string>();
  const [processing, setProcessing] = useState(false);

  const pay = () => {
    if (method === "upi" && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(upi.trim())) return setError("Enter a UPI ID like name@okbank.");
    if (method === "card") {
      if (card.number.replace(/\s/g, "").length < 15) return setError("Enter the full card number.");
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return setError("Enter the expiry as MM/YY.");
      if (!/^\d{3,4}$/.test(card.cvv)) return setError("Enter the 3-digit CVV.");
    }
    setError(undefined);
    setProcessing(true);
    // Simulated gateway round-trip. Replace with Razorpay Checkout in production.
    window.setTimeout(() => onPaid(method), 1600);
  };

  const options: { id: PaymentMethod; title: string; hint: string }[] = [
    { id: "upi", title: "UPI", hint: "Google Pay, PhonePe, Paytm or any UPI app" },
    { id: "card", title: "Credit or debit card", hint: "Visa, Mastercard, RuPay" },
    { id: "cod", title: mode === "delivery" ? "Cash on delivery" : "Pay at the counter", hint: "Cash or UPI when you get your order" },
  ];

  if (processing) {
    return (
      <div role="status" className="flex flex-col items-center rounded-2xl border border-line py-16 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-foam border-t-roast motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-4 font-semibold">{method === "cod" ? "Placing your order" : "Confirming your payment"}</p>
        <p className="text-sm text-muted">Don&apos;t close this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-roast hover:underline">
        Back to details
      </button>
      <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">Demo payment: no money moves and no real card or UPI details are needed.</p>
      <fieldset className="space-y-2">
        <legend className="sr-only">Payment method</legend>
        {options.map((o) => (
          <label
            key={o.id}
            className={`block cursor-pointer rounded-xl border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-roast ${
              method === o.id ? "border-roast bg-foam" : "border-line"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="pay"
                checked={method === o.id}
                onChange={() => {
                  setMethod(o.id);
                  setError(undefined);
                }}
                className="accent-[var(--roast)]"
              />
              <span>
                <span className="block font-semibold">{o.title}</span>
                <span className="block text-sm text-muted">{o.hint}</span>
              </span>
            </span>
            {method === o.id && o.id === "upi" && (
              <span className="mt-3 block">
                <span className="text-sm font-medium">UPI ID</span>
                <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@okbank" className={field} autoComplete="off" />
              </span>
            )}
            {method === o.id && o.id === "card" && (
              <span className="mt-3 grid grid-cols-2 gap-2">
                <span className="col-span-2">
                  <span className="text-sm font-medium">Card number</span>
                  <input inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4111 1111 1111 1111" className={field} autoComplete="off" />
                </span>
                <span>
                  <span className="text-sm font-medium">Expiry</span>
                  <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="MM/YY" className={field} autoComplete="off" />
                </span>
                <span>
                  <span className="text-sm font-medium">CVV</span>
                  <input inputMode="numeric" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} placeholder="123" className={field} autoComplete="off" />
                </span>
              </span>
            )}
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-sm text-nonveg">{error}</p>}
      <button type="button" onClick={pay} className="h-12 w-full rounded-xl bg-roast font-semibold text-paper hover:bg-roast-hover">
        {method === "cod" ? `Place order, pay ${formatINR(total)} later` : `Pay ${formatINR(total)}`}
      </button>
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
