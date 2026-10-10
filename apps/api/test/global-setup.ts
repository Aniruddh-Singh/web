import EmbeddedPostgres from "embedded-postgres";
import { exportJWK, generateKeyPair } from "jose";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Each e2e run gets:
 *  - a throwaway Postgres 17 with migrations and seed data applied, and
 *  - a fake Supabase Auth key server (JWKS), so tests can sign real ES256 login tokens.
 * Nothing touches the real Supabase project.
 */
export default async function setup() {
  const dir = mkdtempSync(join(tmpdir(), "coffeecat-pg-"));
  const port = 54400 + Math.floor(Math.random() * 400);
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "postgres", port, persistent: false, onLog: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("coffeecat_test");

  const url = `postgres://postgres:postgres@localhost:${port}/coffeecat_test`;
  const run = (script: string) => execFileSync("node", ["--import", "tsx", script], { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  run("src/db/migrate.ts");
  run("src/db/seed.ts");
  process.env.DATABASE_URL = url;

  const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid: "test-key", alg: "ES256", use: "sig" };
  const server = createServer((req, res) => {
    if (req.url === "/auth/v1/.well-known/jwks.json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ keys: [jwk] }));
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const authPort = (server.address() as { port: number }).port;
  process.env.SUPABASE_URL = `http://localhost:${authPort}`;
  process.env.TEST_JWT_PRIVATE_JWK = JSON.stringify({ ...(await exportJWK(privateKey)), kid: "test-key", alg: "ES256" });

  // Fake Razorpay: just enough of POST /v1/orders for checkout to start.
  let n = 0;
  const rzp = createServer((req, res) => {
    const auth = Buffer.from((req.headers.authorization ?? "").replace("Basic ", ""), "base64").toString();
    if (req.method === "POST" && req.url === "/v1/orders" && auth === "rzp_test_fake:fake_key_secret") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { amount, receipt } = JSON.parse(body);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ id: `order_TEST${++n}`, amount, currency: "INR", receipt, status: "created" }));
      });
    } else {
      res.writeHead(401).end();
    }
  });
  await new Promise<void>((resolve) => rzp.listen(0, resolve));
  process.env.RAZORPAY_API_BASE = `http://localhost:${(rzp.address() as { port: number }).port}`;
  process.env.RAZORPAY_KEY_ID = "rzp_test_fake";
  process.env.RAZORPAY_KEY_SECRET = "fake_key_secret";
  process.env.RAZORPAY_WEBHOOK_SECRET = "fake_webhook_secret";

  return async () => {
    rzp.close();
    server.close();
    await pg.stop();
    rmSync(dir, { recursive: true, force: true });
  };
}
