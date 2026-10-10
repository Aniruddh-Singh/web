"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStaff } from "./auth-provider";
import { Button, Field, inputClass, Notice, PageHeader } from "./ui";

export function AccountPage() {
  const staff = useStaff();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string }>();
  const [busy, setBusy] = useState(false);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 10) return setMsg({ tone: "error", text: "Use at least 10 characters." });
    if (pw !== confirm) return setMsg({ tone: "error", text: "The two passwords don't match." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: error.message });
    setPw("");
    setConfirm("");
    setMsg({ tone: "success", text: "Password changed." });
  };

  return (
    <div className="max-w-md px-4 py-5 md:px-8">
      <PageHeader title="Account" description={`${staff.email} · ${staff.role}`} />
      <form onSubmit={change} className="mt-6 space-y-4 rounded-3xl bg-paper p-6">
        <h2 className="font-display text-lg font-bold">Change password</h2>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Field label="New password" hint="(at least 10 characters)">
          <input type="password" autoComplete="new-password" className={inputClass} value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Field label="Type it again">
          <input type="password" autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
      </form>
    </div>
  );
}
