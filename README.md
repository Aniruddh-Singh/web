# The Coffee Cat

Monorepo for The Coffee Cat's ordering site, admin portal and API.

| Path | What | Port |
|---|---|---|
| `apps/web` | Customer site (Next.js 16) | 3000 |
| `apps/admin` | Staff portal (Next.js 16): orders board, menu, store, coupons, staff, activity | 3001 |
| `apps/api` | REST API (NestJS 12, Drizzle, Supabase Postgres) | 4000 |
| `packages/shared` | Zod schemas, pricing and order rules shared by all three | – |

## First-time setup

Requires Node 20.9+ and pnpm 10.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env        # fill in DATABASE_URL and Supabase keys
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @coffeecat/shared build
pnpm --filter @coffeecat/api db:migrate       # create tables (RLS on)
pnpm --filter @coffeecat/api db:seed          # load the menu, store settings, PURR50
```

## Daily development

```bash
pnpm dev                                      # everything: API :4000, site :3000, staff portal :3001
```

Or one at a time:

```bash
pnpm --filter @coffeecat/api dev              # API on :4000 (reads apps/api/.env), docs at /docs
pnpm --filter @coffeecat/web dev              # site on :3000
pnpm --filter @coffeecat/admin dev            # staff portal on :3001
```

If the API isn't running, the site still loads in development using the bundled menu file (it prints a warning). Orders, login and live updates need the API.

Offline? `pnpm --filter @coffeecat/api db:local` starts Postgres 17 without Docker; point `DATABASE_URL` at it.

## Checks

```bash
pnpm turbo run typecheck lint test            # everything
pnpm --filter @coffeecat/api test:e2e         # API against a throwaway Postgres
```

## Database changes

Edit `apps/api/src/db/schema.ts`, then `pnpm --filter @coffeecat/api db:generate` and commit the new SQL in `apps/api/drizzle/`. Every table must keep `.enableRLS()`.

## Staff logins

```bash
pnpm --filter @coffeecat/api staff:create -- --email someone@example.com --password '<10+ chars>' --role owner|manager|kitchen
```

Development logins (`dev-owner@example.com`, `dev-kitchen@example.com`) have their passwords in `apps/api/.env`.

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md).

## Secrets

`.env` and `.env.local` files are git-ignored. The Supabase **service-role key** and database URL belong only in `apps/api/.env` and the API host's settings, never in a `NEXT_PUBLIC_` variable.
