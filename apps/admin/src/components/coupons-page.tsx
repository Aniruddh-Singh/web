"use client";

import { formatINR, type AdminCoupon, type CouponKind } from "@coffeecat/shared";
import { useState } from "react";
import { api } from "@/lib/api";
import { formError, useApi } from "@/lib/use-api";
import { Button, Drawer, Field, inputClass, Notice, PageHeader, rupeesToPaise, Switch } from "./ui";

const describe = (c: AdminCoupon) =>
  c.kind === "flat" ? `${formatINR(c.value)} off` : `${c.value / 100}% off${c.maxDiscountPaise ? `, up to ${formatINR(c.maxDiscountPaise)}` : ""}`;

const blank = { code: "", description: "", kind: "flat" as CouponKind, value: "", minOrder: "", maxDiscount: "", endsAt: "", usageLimit: "", perUserLimit: "1" };

export function CouponsPage() {
  const { data, error, reload } = useApi<AdminCoupon[]>("/admin/coupons");
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState(blank);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formMsg, setFormMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  const set = (k: keyof typeof blank, v: string) => setF({ ...f, [k]: v });

  const create = async () => {
    setBusy(true);
    setFields({});
    setFormMsg(undefined);
    try {
      await api("/admin/coupons", {
        method: "POST",
        json: {
          code: f.code,
          description: f.description,
          kind: f.kind,
          value: f.kind === "flat" ? rupeesToPaise(f.value) : Math.round(Number(f.value || 0) * 100),
          minOrderPaise: rupeesToPaise(f.minOrder),
          maxDiscountPaise: f.kind === "percent" && f.maxDiscount ? rupeesToPaise(f.maxDiscount) : null,
          endsAt: f.endsAt ? new Date(`${f.endsAt}T23:59:59+05:30`).toISOString() : null,
          usageLimit: f.usageLimit ? Number(f.usageLimit) : null,
          perUserLimit: f.perUserLimit ? Number(f.perUserLimit) : null,
        },
      });
      setCreating(false);
      setF(blank);
      await reload();
    } catch (e) {
      const err = formError(e);
      setFormMsg(err.message);
      setFields(err.fields);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c: AdminCoupon, active: boolean) => {
    setActionError(undefined);
    try {
      await api(`/admin/coupons/${c.code}`, { method: "PATCH", json: { active } });
    } catch (e) {
      setActionError(formError(e).message);
    }
    await reload();
  };

  return (
    <div className="px-4 py-5 md:px-8">
      <PageHeader title="Coupons" description="Codes customers type at checkout. Switch one off to stop it working immediately." actions={<Button onClick={() => setCreating(true)}>+ New coupon</Button>} />
      <div className="mt-4 space-y-2">
        {error && <Notice tone="error">{error}</Notice>}
        {actionError && <Notice tone="error">{actionError}</Notice>}
      </div>
      <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((c) => {
          const expired = c.endsAt && new Date(c.endsAt) < new Date();
          return (
            <li key={c.id} className={`rounded-2xl border bg-paper p-5 ${c.active && !expired ? "border-crema" : "border-line opacity-75"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold tracking-wide">{c.code}</p>
                  <p className="text-sm text-muted">{c.description}</p>
                </div>
                <Switch checked={c.active} onChange={(v) => void toggle(c, v)} label={`${c.code} active`} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-muted">Discount</dt><dd className="font-semibold">{describe(c)}</dd></div>
                <div><dt className="text-muted">Minimum order</dt><dd className="font-semibold">{c.minOrderPaise ? formatINR(c.minOrderPaise) : "None"}</dd></div>
                <div><dt className="text-muted">Used</dt><dd className="font-semibold">{c.used}{c.usageLimit ? ` of ${c.usageLimit}` : " times"}</dd></div>
                <div><dt className="text-muted">Ends</dt><dd className="font-semibold">{c.endsAt ? new Date(c.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No end date"}{expired ? " (ended)" : ""}</dd></div>
              </dl>
            </li>
          );
        })}
      </ul>
      {data?.length === 0 && <p className="mt-6 text-muted">No coupons yet.</p>}

      {creating && (
        <Drawer
          title="New coupon"
          onClose={() => setCreating(false)}
          footer={
            <div className="flex gap-2">
              <Button onClick={create} disabled={busy} className="flex-1">{busy ? "Creating…" : "Create coupon"}</Button>
              <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          }
        >
          <div className="space-y-4">
            {formMsg && <Notice tone="error">{formMsg}</Notice>}
            <Field label="Code" hint="(what customers type)" error={fields.code}>
              <input className={`${inputClass} uppercase`} value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="CHAI10" />
            </Field>
            <Field label="Description" hint="(shown when applied)" error={fields.description}>
              <input className={inputClass} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="10% off on chai orders" />
            </Field>
            <fieldset>
              <legend className="text-sm font-medium">Type</legend>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(["flat", "percent"] as const).map((k) => (
                  <label key={k} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${f.kind === k ? "border-roast bg-foam" : "border-line"}`}>
                    <input type="radio" className="sr-only" checked={f.kind === k} onChange={() => set("kind", k)} />
                    {k === "flat" ? "Fixed amount (₹)" : "Percentage (%)"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label={f.kind === "flat" ? "Amount off (₹)" : "Percent off"} error={fields.value}>
                <input inputMode="decimal" className={inputClass} value={f.value} onChange={(e) => set("value", e.target.value)} />
              </Field>
              <Field label="Minimum order (₹)" error={fields.minOrderPaise}>
                <input inputMode="decimal" className={inputClass} value={f.minOrder} onChange={(e) => set("minOrder", e.target.value)} placeholder="0" />
              </Field>
              {f.kind === "percent" && (
                <Field label="Maximum discount (₹)" error={fields.maxDiscountPaise}>
                  <input inputMode="decimal" className={inputClass} value={f.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} placeholder="No cap" />
                </Field>
              )}
              <Field label="Ends on" hint="(optional)" error={fields.endsAt}>
                <input type="date" className={inputClass} value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </Field>
              <Field label="Total uses" hint="(optional)" error={fields.usageLimit}>
                <input inputMode="numeric" className={inputClass} value={f.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="Unlimited" />
              </Field>
              <Field label="Uses per customer" error={fields.perUserLimit}>
                <input inputMode="numeric" className={inputClass} value={f.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value)} placeholder="Unlimited" />
              </Field>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
