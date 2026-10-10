import { Inject, Injectable } from "@nestjs/common";
import type { StaffRole } from "@coffeecat/shared";
import { and, eq } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { profiles, staff } from "../db/schema.js";

const ROLE_TTL_MS = 30_000;

/** Keeps a profile row per Supabase user and looks up staff roles (briefly cached). */
@Injectable()
export class IdentityService {
  private known = new Set<string>();
  private roles = new Map<string, { at: number; role: StaffRole | null }>();

  constructor(@Inject(DB) private readonly db: Database) {}

  async ensureProfile(id: string, email: string | null, phone: string | null) {
    if (this.known.has(id)) return;
    await this.db
      .insert(profiles)
      .values({ id, email, phone })
      .onConflictDoUpdate({ target: profiles.id, set: { email, phone } });
    this.known.add(id);
  }

  async roleOf(userId: string): Promise<StaffRole | null> {
    const hit = this.roles.get(userId);
    if (hit && Date.now() - hit.at < ROLE_TTL_MS) return hit.role;
    const [row] = await this.db
      .select({ role: staff.role })
      .from(staff)
      .where(and(eq(staff.userId, userId), eq(staff.active, true)));
    const role = row?.role ?? null;
    this.roles.set(userId, { at: Date.now(), role });
    return role;
  }

  /** Call after changing someone's role so it takes effect immediately. */
  forgetRole(userId: string) {
    this.roles.delete(userId);
  }
}
