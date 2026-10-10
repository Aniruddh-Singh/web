import { importJWK, SignJWT } from "jose";
import postgres from "postgres";
import { randomUUID } from "node:crypto";

/** Signs a Supabase-shaped access token with the fake key server's private key. */
export async function tokenFor(userId: string, extra: Record<string, unknown> = {}) {
  const jwk = JSON.parse(process.env.TEST_JWT_PRIVATE_JWK!);
  const key = await importJWK(jwk, "ES256");
  return new SignJWT({ role: "authenticated", ...extra })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setSubject(userId)
    .setIssuer(`${process.env.SUPABASE_URL}/auth/v1`)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);
}

export function sql() {
  return postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
}

/** Creates a staff member directly in the database and returns a bearer header for them. */
export async function staffUser(role: "owner" | "manager" | "kitchen") {
  const id = randomUUID();
  const db = sql();
  await db`insert into profiles (id, email) values (${id}, ${`${role}-${id.slice(0, 6)}@test.local`})`;
  await db`insert into staff (user_id, role) values (${id}, ${role})`;
  await db.end();
  return { id, auth: `Bearer ${await tokenFor(id, { email: `${role}@test.local` })}` };
}

export async function customerUser() {
  const id = randomUUID();
  return { id, auth: `Bearer ${await tokenFor(id, { phone: "919876543210" })}` };
}

export async function setStore(values: { accepting_orders?: boolean; opens?: string; closes?: string }) {
  const db = sql();
  if (values.accepting_orders !== undefined) await db`update store_settings set accepting_orders = ${values.accepting_orders}`;
  if (values.opens) await db`update store_settings set opens = ${values.opens}, closes = ${values.closes!}`;
  await db.end();
}
