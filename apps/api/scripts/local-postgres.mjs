// Local Postgres 17 without Docker, for development until the Supabase project is connected.
// Data lives in apps/api/.pg-data (git-ignored). Stop with Ctrl+C.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const port = Number(process.env.PG_PORT ?? 54329);
const dir = new URL("../.pg-data", import.meta.url).pathname;
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "postgres", port, persistent: true, onLog: () => {} });

if (!existsSync(dir)) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("coffeecat");
} catch {
  // already exists
}
console.log(`Postgres ready: DATABASE_URL=postgres://postgres:postgres@localhost:${port}/coffeecat`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
