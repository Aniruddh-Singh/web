"use client";

import { can, formatTime, type StoreSettings } from "@coffeecat/shared";
import { useState } from "react";
import { api } from "@/lib/api";
import { formError, useApi } from "@/lib/use-api";
import { useStaff } from "./auth-provider";
import { Button, Field, inputClass, Notice, PageHeader, paiseToRupees, rupeesToPaise } from "./ui";

type Status = StoreSettings & { openNow: boolean };

export function StoreSettingsPage() {
  const staff = useStaff();
  const canEdit = can(staff.role, "store:edit");
  const { data, setData, error } = useApi<Status>("/store");
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();
  const [fields, setFields] = useState<Record<string, string>>({});

  if (!data) return <div className="px-4 py-5 md:px-8">{error ? <Notice tone="error">{error}</Notice> : <p className="text-muted">Loading…</p>}</div>;

  const f = form ?? {
    opens: data.opens,
    closes: data.closes,
    deliveryFee: paiseToRupees(data.deliveryFeePaise),
    freeDeliveryAbove: paiseToRupees(data.freeDeliveryAbovePaise),
    packagingFee: paiseToRupees(data.packagingFeePaise),
    gst: String(data.gstBps / 100),
    radius: String(data.deliveryRadiusKm),
  };
  const set = (k: string, v: string) => setForm({ ...f, [k]: v });

  const patch = async (body: Partial<StoreSettings>, done: string) => {
    setSaving(true);
    setMessage(undefined);
    setFields({});
    try {
      setData(await api<Status>("/admin/store", { method: "PATCH", json: body }));
      setForm(null);
      setMessage({ tone: "success", text: done });
    } catch (e) {
      const err = formError(e);
      setMessage({ tone: "error", text: err.message });
      setFields(err.fields);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl px-4 py-5 md:px-8">
      <PageHeader title="Store" description="Opening hours, pausing orders and delivery charges. India time." />

      <section className={`mt-6 rounded-3xl p-6 ${data.acceptingOrders ? "bg-paper" : "bg-danger-bg"}`} aria-labelledby="orders-now">
        <h2 id="orders-now" className="font-display text-2xl font-bold">
          {data.openNow ? "Taking orders now" : data.acceptingOrders ? `Closed now (opens ${formatTime(data.opens)})` : "Orders are paused"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {data.acceptingOrders ? "Pause if the kitchen is overloaded or something has run out. Customers can still browse the menu." : "Customers can browse but can't order until you resume."}
        </p>
        <Button className="mt-4 h-12 px-6" variant={data.acceptingOrders ? "danger" : "primary"} disabled={saving} onClick={() => patch({ acceptingOrders: !data.acceptingOrders }, data.acceptingOrders ? "Orders paused." : "Orders resumed.")}>
          {data.acceptingOrders ? "Pause orders" : "Resume orders"}
        </Button>
      </section>

      {message && <div className="mt-4"><Notice tone={message.tone}>{message.text}</Notice></div>}

      {canEdit && (
        <form
          className="mt-6 space-y-6 rounded-3xl bg-paper p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void patch(
              {
                opens: f.opens,
                closes: f.closes,
                deliveryFeePaise: rupeesToPaise(f.deliveryFee),
                freeDeliveryAbovePaise: rupeesToPaise(f.freeDeliveryAbove),
                packagingFeePaise: rupeesToPaise(f.packagingFee),
                gstBps: Math.round(Number(f.gst || 0) * 100),
                deliveryRadiusKm: Number(f.radius || 0),
              },
              "Settings saved. The website updates within a minute.",
            );
          }}
        >
          <fieldset>
            <legend className="font-display text-lg font-bold">Opening hours</legend>
            <p className="text-sm text-muted">If you close after midnight, set the closing time on the next morning (e.g. 01:30).</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Opens" error={fields.opens}>
                <input type="time" className={inputClass} value={f.opens} onChange={(e) => set("opens", e.target.value)} />
              </Field>
              <Field label="Closes" error={fields.closes}>
                <input type="time" className={inputClass} value={f.closes} onChange={(e) => set("closes", e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-lg font-bold">Charges</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Delivery fee (₹)" error={fields.deliveryFeePaise}>
                <input inputMode="decimal" className={inputClass} value={f.deliveryFee} onChange={(e) => set("deliveryFee", e.target.value)} />
              </Field>
              <Field label="Free delivery above (₹)" error={fields.freeDeliveryAbovePaise}>
                <input inputMode="decimal" className={inputClass} value={f.freeDeliveryAbove} onChange={(e) => set("freeDeliveryAbove", e.target.value)} />
              </Field>
              <Field label="Packaging per order (₹)" error={fields.packagingFeePaise}>
                <input inputMode="decimal" className={inputClass} value={f.packagingFee} onChange={(e) => set("packagingFee", e.target.value)} />
              </Field>
              <Field label="GST (%)" error={fields.gstBps}>
                <input inputMode="decimal" className={inputClass} value={f.gst} onChange={(e) => set("gst", e.target.value)} />
              </Field>
              <Field label="Delivery radius (km)" error={fields.deliveryRadiusKm}>
                <input inputMode="decimal" className={inputClass} value={f.radius} onChange={(e) => set("radius", e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving || !form}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
            {form && (
              <Button variant="secondary" onClick={() => setForm(null)}>
                Undo changes
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
