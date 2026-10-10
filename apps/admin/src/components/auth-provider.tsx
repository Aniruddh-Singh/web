"use client";

import type { StaffRole } from "@coffeecat/shared";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export type Staff = { id: string; email: string | null; role: StaffRole };
type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "not-staff"; email: string | null }
  | { status: "staff"; staff: Staff };

const AuthContext = createContext<{ state: AuthState; signOut: () => Promise<void>; refresh: () => Promise<void> } | null>(null);

/** Knows whether the browser holds a staff session, and the staff member's role (checked with the API). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return setState({ status: "signed-out" });
    try {
      const me = await api<{ id: string; email: string | null; role: StaffRole | null }>("/me");
      setState(me.role ? { status: "staff", staff: { id: me.id, email: me.email, role: me.role } } : { status: "not-staff", email: me.email });
    } catch {
      setState({ status: "signed-out" });
    }
  }, []);

  useEffect(() => {
    // Supabase fires INITIAL_SESSION as soon as we subscribe, so this also covers first load.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => void refresh(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ status: "signed-out" });
  }, []);

  return <AuthContext.Provider value={{ state, signOut, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** The logged-in staff member. Only use inside the portal (behind <StaffGate>). */
export function useStaff(): Staff {
  const { state } = useAuth();
  if (state.status !== "staff") throw new Error("useStaff used outside the staff portal");
  return state.staff;
}
