import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client.js";

/** Applies committed SQL migrations from ./drizzle. Safe to run repeatedly. */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
// Migrations need a session connection: on Supabase use the direct or session-pooler URL (port 5432).
const { db, client } = createDb(url, 1);
await migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
await client.end();
console.log("Migrations applied.");
