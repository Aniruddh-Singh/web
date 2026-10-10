/*
 * Create (or update) a staff login.
 *   pnpm --filter @coffeecat/api staff:create -- --email owner@example.com --password '...' --role owner --name "Owner"
 * Creates a confirmed Supabase Auth user (no email is sent) and gives it the role. Re-running
 * with the same email updates the role/password instead of failing.
 */
import { createClient } from "@supabase/supabase-js";
import { staffRole } from "@coffeecat/shared";
import { createDb } from "../src/db/client.js";
import { profiles, staff } from "../src/db/schema.js";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const email = arg("email")?.toLowerCase();
const password = arg("password");
const role = staffRole.parse(arg("role") ?? "kitchen");
const name = arg("name") ?? null;
if (!email || !password || password.length < 10) {
  console.error("Usage: --email <email> --password <at least 10 chars> [--role owner|manager|kitchen] [--name <name>]");
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL must be set");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

let userId: string | undefined;
const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
if (created.data.user) {
  userId = created.data.user.id;
} else {
  // Already exists: find it and reset the password.
  for (let page = 1; !userId && page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }
  if (!userId) throw created.error ?? new Error("Could not create or find the user");
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });
  if (error) throw error;
}

const { db, client } = createDb(DATABASE_URL, 1);
await db.insert(profiles).values({ id: userId, email, name }).onConflictDoUpdate({ target: profiles.id, set: { email, name } });
await db.insert(staff).values({ userId, role, active: true }).onConflictDoUpdate({ target: staff.userId, set: { role, active: true } });
await client.end();
console.log(`Staff ready: ${email} (${role})`);
