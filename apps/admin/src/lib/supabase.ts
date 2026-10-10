import { createClient } from "@supabase/supabase-js";

/** Browser Supabase client for staff login. The session is kept in this browser and refreshed automatically. */
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "coffeecat-staff-auth" },
});
