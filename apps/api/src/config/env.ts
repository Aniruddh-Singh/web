import { existsSync } from "node:fs";
import { z } from "zod";

// Local development: read apps/api/.env automatically (the Nest CLI doesn't). Values already set in
// the environment win, and production/test never read the file.
if (!["production", "test"].includes(process.env.NODE_ENV ?? "") && existsSync(".env")) {
  process.loadEnvFile(".env");
}

/** Environment is validated once at startup; the API refuses to boot with a bad config. */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().url("DATABASE_URL must be a postgres:// URL"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001")
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  WEB_REVALIDATE_URL: z.string().url().optional().or(z.literal("")),
  REVALIDATE_SECRET: z.string().optional(),
  // Razorpay. Online payment is offered only when the key id and secret are set.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_API_BASE: z.string().url().default("https://api.razorpay.com"),
  /** Unpaid online orders are cancelled after this many minutes. */
  PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`Invalid environment:\n${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}
