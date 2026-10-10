"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useCustomer } from "./customer-auth";

const field = "mt-1 h-12 w-full rounded-xl border border-line bg-paper px-3 text-[16px] focus:border-roast focus:outline-none";

/** Turns Supabase errors into plain words. */
function friendly(message: string, method: "phone" | "email" | "google") {
  if (/provider is not enabled|unsupported phone provider|phone.*disabled|signups not allowed/i.test(message)) {
    return method === "phone" ? "Phone login isn't switched on yet. Use email, or order as a guest." : method === "google" ? "Google login isn't switched on yet. Use email or phone." : "Email login isn't available right now.";
  }
  if (/rate limit|too many|security purposes/i.test(message)) return "Too many tries. Wait a minute and try again.";
  if (/expired|invalid/i.test(message)) return "That code is wrong or has expired. Request a new one.";
  return message;
}

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/account";
  const { session } = useCustomer();
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"enter" | "code" | "email-sent">("enter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  const e164 = () => `+91${phone.replace(/\D/g, "").slice(-10)}`;

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").slice(-10))) return setError("Enter a 10-digit mobile number.");
    setBusy(true);
    setError(undefined);
    const { error } = await supabase().auth.signInWithOtp({ phone: e164() });
    setBusy(false);
    if (error) return setError(friendly(error.message, "phone"));
    setStage("code");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const { error } = await supabase().auth.verifyOtp({ phone: e164(), token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) setError(friendly(error.message, "phone"));
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const { error } = await supabase().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}` } });
    setBusy(false);
    if (error) return setError(friendly(error.message, "email"));
    setStage("email-sent");
  };

  const google = async () => {
    setError(undefined);
    const { error } = await supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}` } });
    if (error) setError(friendly(error.message, "google"));
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Log in</h1>
      <p className="mt-2 text-muted">See your orders on any device, save addresses and check out faster. You can always order as a guest instead.</p>

      {error && <p role="alert" className="mt-5 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-nonveg">{error}</p>}

      {stage === "email-sent" ? (
        <div className="mt-6 rounded-2xl bg-surface p-5">
          <p className="font-semibold">Check {email}</p>
          <p className="mt-1 text-sm text-muted">We sent a login link. Open it on this device. It works once and expires in an hour.</p>
          <button type="button" onClick={() => setStage("enter")} className="mt-3 text-sm font-semibold text-roast underline">Use a different email</button>
        </div>
      ) : stage === "code" ? (
        <form onSubmit={verify} className="mt-6 space-y-4">
          <p className="text-sm">We sent a 6-digit code to <strong>+91 {phone}</strong>.</p>
          <label className="block text-sm font-medium">
            Code
            <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`${field} tracking-[0.5em]`} />
          </label>
          <button type="submit" disabled={busy || code.length < 6} className="h-12 w-full rounded-xl bg-roast font-semibold text-paper hover:bg-roast-hover disabled:opacity-50">
            {busy ? "Checking…" : "Log in"}
          </button>
          <button type="button" onClick={() => (setStage("enter"), setCode(""))} className="text-sm font-semibold text-roast underline">Change number or resend</button>
        </form>
      ) : (
        <>
          <div role="tablist" aria-label="Login method" className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
            {(["phone", "email"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={method === m} type="button" onClick={() => (setMethod(m), setError(undefined))} className={`rounded-lg py-2 text-sm font-semibold ${method === m ? "bg-paper shadow-sm" : "text-muted"}`}>
                {m === "phone" ? "Mobile number" : "Email"}
              </button>
            ))}
          </div>
          {method === "phone" ? (
            <form onSubmit={sendCode} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Mobile number
                <span className="mt-1 flex">
                  <span className="grid h-12 place-items-center rounded-l-xl border border-r-0 border-line bg-surface px-3 text-sm">+91</span>
                  <input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${field} mt-0 rounded-l-none`} />
                </span>
              </label>
              <button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-roast font-semibold text-paper hover:bg-roast-hover disabled:opacity-50">
                {busy ? "Sending…" : "Send code"}
              </button>
            </form>
          ) : (
            <form onSubmit={sendLink} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Email
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              </label>
              <button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-roast font-semibold text-paper hover:bg-roast-hover disabled:opacity-50">
                {busy ? "Sending…" : "Email me a login link"}
              </button>
            </form>
          )}
          <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <button type="button" onClick={google} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line font-semibold hover:bg-surface">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z"/></svg>
            Continue with Google
          </button>
        </>
      )}
      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/menu" className="font-semibold text-roast underline">Order as a guest</Link>
      </p>
    </div>
  );
}
