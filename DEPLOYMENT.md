# Deploying The Coffee Cat

Three deployable parts, one database:

| Part | Where | Domain (suggested) |
|---|---|---|
| Customer site, `apps/web` | Vercel | `thecoffeecat.in` |
| Staff portal, `apps/admin` | Vercel (second project) | `admin.thecoffeecat.in` |
| API, `apps/api` | Render (Docker), or any container host | `api.thecoffeecat.in` |
| Database, login, photos | Supabase project `pfomyjpkqovshlhdczqf` (Mumbai) | – |

Do the steps in order. Each ends with a check.

---

## 0. Before anything: rotate shared secrets

The Supabase **service-role key** and **database password** were shared in a chat during development. Rotate both before going live:

- Supabase → Project Settings → API → **Roll** the service-role key.
- Project Settings → Database → **Reset database password**.

Then update `apps/api/.env` locally and the API host's environment (step 3).

## 1. Supabase

1. **Auth → URL Configuration**
   - Site URL: `https://thecoffeecat.in`
   - Redirect URLs: `https://thecoffeecat.in/login`, `https://thecoffeecat.in/login?next=*`, plus any Vercel preview URL pattern you want to test with (e.g. `https://*-thecoffeecat.vercel.app/login*`).
2. **Auth → Providers**
   - **Email**: on (already). For real volume, set **Auth → SMTP** to a provider such as Resend; Supabase's built-in mailer allows only a few emails an hour.
   - **Phone**: turn on with an SMS provider (MSG91 via Send SMS Hook, or Twilio). In India this needs **DLT registration** of the sender ID and the OTP template first (3–7 days). Until then the site shows "Phone login isn't switched on yet".
   - **Google**: create an OAuth client in Google Cloud (consent screen in the cafe's name). Authorised redirect URI: `https://pfomyjpkqovshlhdczqf.supabase.co/auth/v1/callback`. Paste the client id and secret into Supabase.
3. **Database**: already migrated and seeded. For future schema changes run, from your machine:
   ```bash
   pnpm --filter @coffeecat/api db:migrate      # uses apps/api/.env DATABASE_URL (session pooler, port 5432)
   ```
4. **Backups**: daily backups need the Pro plan (Settings → Add-ons). Turn on Point-in-Time Recovery if the cafe wants minute-level restores.

**Check:** `curl -s https://pfomyjpkqovshlhdczqf.supabase.co/rest/v1/orders -H "apikey: <anon key>"` returns `[]`. Row Level Security blocks the public key from every table.

## 2. Staff accounts

Create the real owner, then remove the development logins:

```bash
pnpm --filter @coffeecat/api staff:create -- --email owner@<cafe-domain> --password '<10+ chars>' --role owner --name "<Owner name>"
```

- **Dev logins to remove:** in the staff portal, open Staff → *Remove access* for `dev-owner@example.com`, `dev-kitchen@example.com` and `dev-test-barista@example.com`.
- **Delete them fully:** Supabase → Authentication → Users → delete those `example.com` users and `dev-customer@example.com`.

## 3. API on Render

1. Render → **New → Blueprint** → pick this repo. `render.yaml` creates `coffeecat-api` from `apps/api/Dockerfile`.
2. Fill in the environment variables it asks for:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **transaction pooler** URL (port 6543), password URL-encoded (`@` → `%40`) |
| `SUPABASE_URL` | `https://pfomyjpkqovshlhdczqf.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the rotated service-role key |
| `CORS_ORIGINS` | `https://thecoffeecat.in,https://admin.thecoffeecat.in` |
| `WEB_REVALIDATE_URL` | `https://thecoffeecat.in/api/revalidate` |
| `REVALIDATE_SECRET` | auto-generated; copy it into the web project too |
| `RAZORPAY_*` | see step 5 (leave empty to keep online payment off) |

3. Add the custom domain `api.thecoffeecat.in`.

**Check:** `https://api.thecoffeecat.in/health` → `{"status":"ok","db":"ok"}`, and `/docs` → 404 (API docs are hidden in production).

## 4. Customer site and staff portal (Netlify or Vercel)

**Netlify:** create two sites from the repo. Each app has a `netlify.toml`, so you only set:

| Setting | Customer site | Staff portal |
|---|---|---|
| Base directory | `apps/web` | `apps/admin` |
| Build command / publish | from `apps/web/netlify.toml` (`pnpm build`, `.next`) | from `apps/admin/netlify.toml` |

Each app's `build` script builds `packages/shared` first, so nothing else is needed. Environment variables are the same as in the table below.
Until the API is hosted, add `ALLOW_BUNDLED_MENU=true` to the customer site so it builds from the bundled menu (remove it once `API_URL` points at the live API, so prices always come from the database).

**Vercel** works the same way: Root Directory `apps/web` / `apps/admin`, framework Next.js.

### Settings for both hosts

Create **two** Vercel projects from the same repo:

| Setting | Customer site | Staff portal |
|---|---|---|
| Root Directory | `apps/web` | `apps/admin` |
| `API_URL` | `https://api.thecoffeecat.in` | – |
| `NEXT_PUBLIC_API_URL` | `https://api.thecoffeecat.in` | `https://api.thecoffeecat.in` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pfomyjpkqovshlhdczqf.supabase.co` | same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | same |
| `REVALIDATE_SECRET` | same value as the API | – |
| `NEXT_PUBLIC_SITE_URL` | `https://thecoffeecat.in` | – |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.thecoffeecat.in` | – |
| `NEXT_PUBLIC_WEB_URL` | – | `https://thecoffeecat.in` |
| `NEXT_PUBLIC_LAUNCHED` | `false` until launch day | – |

The customer site prerenders menu pages from the API at build time, so **deploy the API first**.

**Check:** on the preview URL, place a pay-on-delivery order. It appears on the staff portal's Orders board with a chime, and the customer's page updates live as staff accept it.

## 5. Razorpay (online payment)

1. **Test mode:** Dashboard → Account & Settings → API Keys → generate **test** keys. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the API, then redeploy. The checkout now offers UPI and card.
2. **Webhook:** Dashboard → Webhooks → Add.
   - URL: `https://api.thecoffeecat.in/payments/razorpay/webhook`
   - Events: `payment.captured`, `payment.failed`, `order.paid`
   - Copy the secret into `RAZORPAY_WEBHOOK_SECRET`.
3. **Test:** use Razorpay's test card or `success@razorpay` UPI. The order shows "Paid online" and reaches the kitchen board. Close the window instead, and the order page offers "Pay"; after 30 minutes unpaid it cancels itself.
4. **Go live:** after Razorpay KYC is approved, switch to **live** keys and create a live-mode webhook the same way.

## 6. Launch day

- Owner sets the **real opening hours** and charges in Staff portal → Store. (Development set hours to always open.)
- Owner confirms **menu prices** (the menu came from delivery-app listings) and **dish descriptions** (drafts).
- Set `NEXT_PUBLIC_LAUNCHED=true` on the customer site and redeploy. This allows search indexing and hides the preview banner.
- Point DNS for the three domains (Vercel and Render show the records). If the cafe's domain already handles email, don't touch its MX/SPF records.
- Set up an uptime check on `https://api.thecoffeecat.in/health` (e.g. Better Stack or UptimeRobot, free tier).

## Running everything locally

```bash
pnpm install && pnpm --filter @coffeecat/shared build
pnpm --filter @coffeecat/api dev       # :4000
pnpm --filter @coffeecat/web dev       # :3000
pnpm --filter @coffeecat/admin dev     # :3001
```

## Known follow-ups

- **Content-Security-Policy**: other security headers are on. A CSP still needs listing Razorpay, Supabase and Google Fonts origins and testing in report-only mode first.
- **Error tracking**: unexpected API errors are logged with a reference id customers can quote. Adding Sentry (`@sentry/nestjs`, `@sentry/nextjs`) needs a DSN from the cafe's Sentry account.
- **Scaling the API past one instance**: live order updates use in-memory events. Before running two or more API instances, back them with Postgres `LISTEN/NOTIFY`.
