import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * `prepare: false` keeps us compatible with Supabase's transaction pooler (port 6543),
 * which doesn't support prepared statements.
 */
export function createDb(url: string, max = 10) {
  const client = postgres(url, { prepare: false, max, onnotice: () => {} });
  return { db: drizzle(client, { schema }), client };
}
