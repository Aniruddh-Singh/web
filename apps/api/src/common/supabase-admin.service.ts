import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

/** Server-side Supabase client with the service-role key (Storage, user management). Never exposed to browsers. */
@Injectable()
export class SupabaseAdmin {
  private client: SupabaseClient | null = null;

  get(): SupabaseClient {
    if (!this.client) {
      const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = env();
      if (!url || !key) throw new ServiceUnavailableException("Supabase isn't configured on this server.");
      this.client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    return this.client;
  }
}
