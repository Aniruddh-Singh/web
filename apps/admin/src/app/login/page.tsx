"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { state, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.status === "staff") router.replace("/");
  }, [state, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? "That email and password don't match a staff account." : error.message);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-paper p-8 shadow-[0_20px_60px_rgba(43,26,18,0.12)]">
        <div className="flex items-center gap-3">
          <Logo className="h-12 w-12" />
          <div>
            <p className="font-display text-xl font-bold">The Coffee Cat</p>
            <p className="text-sm text-muted">Staff portal</p>
          </div>
        </div>

        {state.status === "not-staff" ? (
          <div className="mt-8 space-y-4">
            <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-nonveg">
              {state.email ?? "This account"} isn&apos;t set up as staff. Ask the owner to add you.
            </p>
            <button type="button" onClick={signOut} className="h-11 w-full rounded-xl border border-line font-semibold hover:bg-surface">
              Use a different account
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <h1 className="font-display text-2xl font-bold">Log in</h1>
            <label className="block text-sm font-medium">
              Email
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-[16px] focus:border-roast focus:outline-none" />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-[16px] focus:border-roast focus:outline-none" />
            </label>
            {error && <p role="alert" className="text-sm text-nonveg">{error}</p>}
            <button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-roast font-semibold text-paper transition hover:bg-roast-hover disabled:opacity-60">
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
