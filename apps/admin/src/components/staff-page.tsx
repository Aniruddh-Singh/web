"use client";

import type { StaffMember, StaffRole } from "@coffeecat/shared";
import { useState } from "react";
import { api } from "@/lib/api";
import { formError, useApi } from "@/lib/use-api";
import { useStaff } from "./auth-provider";
import { Button, Drawer, Field, inputClass, Notice, PageHeader } from "./ui";

const roleInfo: Record<StaffRole, string> = {
  owner: "Everything, including staff and the activity log",
  manager: "Orders, menu, prices, store settings and coupons",
  kitchen: "Orders, sold-out switches and pausing orders",
};

export function StaffPage() {
  const me = useStaff();
  const { data, error, reload } = useApi<StaffMember[]>("/admin/staff");
  const [inviting, setInviting] = useState(false);
  const [f, setF] = useState({ name: "", email: "", role: "kitchen" as StaffRole });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formMsg, setFormMsg] = useState<string>();
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [copied, setCopied] = useState(false);

  const invite = async () => {
    setBusy(true);
    setFields({});
    setFormMsg(undefined);
    try {
      const res = await api<{ email: string; temporaryPassword: string }>("/admin/staff", { method: "POST", json: f });
      setCreated(res);
      setF({ name: "", email: "", role: "kitchen" });
      await reload();
    } catch (e) {
      const err = formError(e);
      setFormMsg(err.message);
      setFields(err.fields);
    } finally {
      setBusy(false);
    }
  };

  const update = async (m: StaffMember, patch: { role?: StaffRole; active?: boolean }) => {
    setActionError(undefined);
    try {
      await api(`/admin/staff/${m.userId}`, { method: "PATCH", json: patch });
    } catch (e) {
      setActionError(formError(e).message);
    }
    await reload();
  };

  return (
    <div className="max-w-4xl px-4 py-5 md:px-8">
      <PageHeader title="Staff" description="Who can log in to this portal, and what they can do." actions={<Button onClick={() => (setInviting(true), setCreated(null))}>+ Add staff</Button>} />
      <div className="mt-4 space-y-2">
        {error && <Notice tone="error">{error}</Notice>}
        {actionError && <Notice tone="error">{actionError}</Notice>}
      </div>
      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
        {data?.map((m) => (
          <li key={m.userId} className={`flex flex-wrap items-center gap-4 px-4 py-4 ${m.active ? "" : "opacity-60"}`}>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {m.name ?? m.email} {m.userId === me.id && <span className="font-normal text-muted">(you)</span>}
              </span>
              <span className="block truncate text-sm text-muted">{m.email}</span>
            </span>
            <label className="text-sm">
              <span className="sr-only">Role for {m.email}</span>
              <select value={m.role} disabled={!m.active || m.userId === me.id} onChange={(e) => void update(m, { role: e.target.value as StaffRole })} className={`${inputClass} mt-0 h-10 w-36`}>
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </label>
            {m.userId !== me.id && (
              <Button variant={m.active ? "secondary" : "ghost"} className="h-10" onClick={() => void update(m, { active: !m.active })}>
                {m.active ? "Remove access" : "Restore access"}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        {(Object.keys(roleInfo) as StaffRole[]).map((r) => (
          <div key={r} className="rounded-2xl bg-paper p-4">
            <dt className="font-semibold capitalize">{r}</dt>
            <dd className="text-muted">{roleInfo[r]}</dd>
          </div>
        ))}
      </dl>

      {inviting && (
        <Drawer
          title={created ? "Login created" : "Add staff"}
          onClose={() => setInviting(false)}
          footer={
            created ? (
              <Button className="w-full" onClick={() => setInviting(false)}>Done</Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={invite} disabled={busy} className="flex-1">{busy ? "Creating…" : "Create login"}</Button>
                <Button variant="secondary" onClick={() => setInviting(false)}>Cancel</Button>
              </div>
            )
          }
        >
          {created ? (
            <div className="space-y-4">
              <Notice tone="success">Login created for {created.email}.</Notice>
              <p className="text-sm">Give them this temporary password in person or over the phone. It&apos;s shown only once. They should change it from Account after logging in.</p>
              <div className="flex items-center gap-2 rounded-xl bg-surface p-3">
                <code className="flex-1 select-all font-mono text-lg">{created.temporaryPassword}</code>
                <Button variant="secondary" className="h-9" onClick={() => void navigator.clipboard.writeText(created.temporaryPassword).then(() => setCopied(true))}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {formMsg && <Notice tone="error">{formMsg}</Notice>}
              <Field label="Name" error={fields.name}>
                <input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </Field>
              <Field label="Email" error={fields.email}>
                <input type="email" className={inputClass} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </Field>
              <fieldset>
                <legend className="text-sm font-medium">Role</legend>
                <div className="mt-1 space-y-2">
                  {(Object.keys(roleInfo) as StaffRole[]).map((r) => (
                    <label key={r} className={`block cursor-pointer rounded-xl border px-3 py-2 ${f.role === r ? "border-roast bg-foam" : "border-line"}`}>
                      <input type="radio" className="sr-only" checked={f.role === r} onChange={() => setF({ ...f, role: r })} />
                      <span className="block font-semibold capitalize">{r}</span>
                      <span className="block text-sm text-muted">{roleInfo[r]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </Drawer>
      )}
    </div>
  );
}
