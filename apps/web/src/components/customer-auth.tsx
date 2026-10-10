"use client";

import type { Profile } from "@coffeecat/shared";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch, setTokenProvider } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-browser";

type CustomerAuth = {
  /** undefined while checking; null when logged out. */
  session: Session | null | undefined;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<CustomerAuth | null>(null);

/** Optional customer login. Everything works without it (guest checkout). */
export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await apiFetch<Profile>("/me/profile"));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const sb = supabase();
    setTokenProvider(async () => (await sb.auth.getSession()).data.session?.access_token ?? null);
    const { data } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setTimeout(() => void refreshProfile(), 0);
      else setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
  }, []);

  return <Ctx.Provider value={{ session, profile, refreshProfile, signOut }}>{children}</Ctx.Provider>;
}

export function useCustomer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCustomer must be used inside <CustomerAuthProvider>");
  return ctx;
}
