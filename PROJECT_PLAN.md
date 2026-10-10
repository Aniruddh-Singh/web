# PROJECT_PLAN — The Coffee Cat

**Mode:** Production build in progress (was: prototype)
**Current phase:** 10 — Deploy to preview URL (blocked on Vercel login)
**Last updated:** 2026-10-09 (prototype built)

## Brief
- Purpose: Pitch prototype of The Coffee Cat's own ordering site, laid out like a Zomato/Swiggy restaurant page.
- Primary visitor action: Order food online (browse menu → cart → checkout → pay → confirmation).
- Success metrics: Owner sign-off on the pitch. (Production metrics TBD: direct orders/month, share of orders off-aggregator.)
- Audience & devices: Local customers in Noida Sec 72–78, mostly on mobile — mobile-first.
- Regions / languages: India, English, INR.
- Deadline / launch date: Flexible.
- Who maintains it after launch: Cafe owner/staff (non-technical) — needs a simple admin panel.

### In scope (prototype)
- Restaurant header: name, cuisines, rating, cost for two, address, hours, veg/non-veg info
- Menu: sticky category nav, search, veg-only filter, veg/non-veg marks, "Bestseller" tags, Add / quantity steppers
- Cart (persisted in the browser), delivery vs. pickup, checkout form
- **Simulated** payment screen (UPI / card / cash on delivery) and order confirmation with status
- Staff admin mock: order list, mark item sold out, edit price, edit hours
- Info sections: about, location map/directions, contact
- Deploy to a preview URL

### Out of scope (prototype)
- Real payments, real backend/database, auth, GST invoices, delivery logistics, CMS, heavy testing

## Backend build (plan approved 2026-10-10; full plan: ~/.claude/plans/dreamy-greeting-bird.md)
Stack: NestJS 12 API + Supabase (Postgres 17, Auth, Storage) + Drizzle ORM; separate Next.js admin app; Razorpay (test mode first). pnpm + Turborepo monorepo on git branch `backend-v1` (repo root moved up from `web/`; empty old root repo kept at `.git-root-empty-backup/`).

### Phase 1 — Foundation: done 2026-10-10
- Monorepo: `apps/web` (moved, history kept), `apps/api`, `packages/shared` (16 unit tests: bill/coupon/GST maths, IST opening hours, status transitions, role permissions)
- Supabase project `pfomyjpkqovshlhdczqf` (Mumbai): 13 tables migrated, RLS on every table with no policies — verified the public anon key reads nothing and cannot insert
- Seeded 11 categories, 144 dishes (with draft descriptions), store settings, coupon PURR50
- API: `/health`, `/menu` (30 s cache), `/store` (IST open flag), Swagger at `/docs`, helmet, CORS allow-list, rate limit; 6 e2e tests on a throwaway Postgres
- Site now reads the menu from the API (cached, prerendered, `/api/revalidate` with secret for instant refresh)
- Still browser-only until Phase 2: orders, fees/hours, local staff panel

### Phase 2 — Orders end to end: done 2026-10-10
- Real orders in Supabase: server-side pricing (prices from the browser ignored), coupons, store hours (India time), sold-out checks, guest tracking tokens (hashed), order codes like TCC8Q2D5D
- Live order status for customers and a live staff board, both over Server-Sent Events
- Staff portal (`apps/admin`): Supabase email/password login, roles checked by the API, Orders board with chime + tab-title alerts, order detail with timeline, cancel-with-reason (shown to customer), mark cash collected
- Supabase JWT verification against the project's ES256 public keys; dev staff accounts created with `staff:create`

### Phase 3 — Admin management: done 2026-10-10
- Menu: categories/sections/dishes create, edit, reorder, hide, archive; one-tap sold-out (kitchen allowed); photo upload (browser shrinks to WebP, uploads straight to Supabase Storage bucket `menu-photos` via one-time signed URL)
- Store: pause/resume (kitchen allowed), hours, fees, GST, radius; Coupons: flat/%/caps/limits/end date/usage counts; Staff: add with one-time password, roles, remove access, last-owner protection; Activity log in plain sentences
- Every edit refreshes the customer site within seconds (`/api/revalidate`)

### Phase 4 — Customer login and accounts: done 2026-10-10
- `/login`: phone OTP, Google, email magic link (all optional; guest checkout unchanged). Phone and Google need provider setup in Supabase (see DEPLOYMENT.md); email works now
- `/account`: name, saved addresses (one default), order history, "Order again"; checkout pre-fills name/phone/default address; logged-in orders trackable on any device

### Phase 5 — Razorpay: done 2026-10-10 (code complete; needs the cafe's test keys to see the live window)
- UPI/card via Razorpay Checkout; server-verified signatures; webhook as source of truth (idempotent); failed-payment retry; unpaid online orders hidden from the kitchen and auto-cancelled after 30 min; late payment after cancel flagged for refund
- Online payment switches on automatically when RAZORPAY_KEY_ID/SECRET are set on the API

### Phase 6 — Hardening and deploy prep: done 2026-10-10 (not deployed: no hosting access in this environment)
- Security headers on web and admin, safe API error responses with reference ids, trust proxy for rate limits, production bundle verified, Dockerfile + Render blueprint, Vercel configs, GitHub Actions CI, generated sitemap/robots, one launch switch (NEXT_PUBLIC_LAUNCHED)
- Step-by-step guide: DEPLOYMENT.md

### Tests
- packages/shared: 16 unit tests (money, GST, coupons, IST hours, status rules, roles)
- apps/api: 52 end-to-end tests on a throwaway Postgres with fake Supabase keys and fake Razorpay (pricing, privacy, roles, live stream, admin edits, payments)
- Browser walkthroughs of customer ordering, staff board, admin management and customer login against the real Supabase project

### Dev data notes
- Store hours in the dev database are set to always open (00:00–00:00) for testing at any hour; set real hours in the staff portal before launch
- Test orders created during development were cancelled with reason "Test order by the developer"

## Needed from client
| Item | Owner | Due | Status |
|---|---|---|---|
| Logo & brand guidelines | Cafe | Before production | Logo cropped from menu-card photo (low-res) — need original vector/PNG |
| Verified menu & in-store prices | Cafe | Before production | Current data UNVERIFIED (magicpin delivery prices) |
| Confirmed opening hours | Cafe | Before production | 6 conflicting listings |
| Food photography | Cafe | Before production | 11 client photos received 2026-10-09 (interior, storefront, 4 drinks, toast, menu card). Most dishes still on stock photos — more needed |
| Domain registrar & DNS access | Cafe | Before production | — |
| Payment gateway account (Razorpay etc.) | Cafe | Before production | — |
| Legal pages text (terms, privacy, refunds) | Cafe | Before production | — |

## Decisions log
| Date | Decision | Reason | Alternatives considered |
|---|---|---|---|
| 2026-10-09 | Prototype mode | User: pitch first | Production, pitch-then-production |
| 2026-10-09 | Full online ordering + payment flow | User choice | Order-via-apps links, WhatsApp cart |
| 2026-10-09 | Payment simulated | Default — no accounts/keys, demo-safe | Razorpay test mode |
| 2026-10-09 | Style: food-app layout, cafe-branded (warm coffee tones, cat motif) | Default — familiar UX, distinct brand | Zomato clone, cozy/playful, options |
| 2026-10-09 | Create placeholder brand (wordmark, palette, fonts) | No brand assets exist | — |
| 2026-10-09 | Switched to client's cat-roundel logo and its maroon (#7a2229) for buttons | Client supplied photos showing real brand | Keep placeholder |
| 2026-10-09 | Real dish photos only on the dish shown; no reuse for other drinks | Avoid misleading customers | Section-wide fallback |
| 2026-10-09 | Free delivery threshold ₹300; email + Instagram added | Printed menu card | — |
| 2026-10-09 | Animation level: subtle + signature moments | User choice — keeps performance | Moderate, rich |
| 2026-10-09 | PDP basic (no sizes/add-ons) | User choice | Sizes + add-ons |
| 2026-10-09 | Draft descriptions for all 144 dishes (src/data/descriptions.json, marked DRAFT) | User choice | None, owner provides |
| 2026-10-09 | Hero media: Ken Burns slideshow of cafe photos (no video yet) | Default — real cafe, no stock video | Stock coffee video |
| 2026-10-09 | Showpiece motion on home only; light touches elsewhere | Default — keeps ordering fast | Rich motion everywhere |
| 2026-10-09 | Lenis smooth scroll on fine pointers only | Default — touch keeps native momentum | Always on, off |
| 2026-10-09 | Stock photos labelled "Representative" on PDP; none for drinks or Healthy Zone | Honesty — avoid showing a different dish | Section-wide stock |
| 2026-10-09 | Stock photos (Unsplash) per category | Default — realistic pitch | Text-only, client photos later |
| 2026-10-09 | Next.js + Tailwind on Vercel | Default, user confirmed — carries into production | Single-file HTML, local only |
| 2026-10-09 | Content editors: cafe staff | Default — menus/prices change often | Devs only, marketing person |

## Sitemap & templates
App lives in `web/`.
- `/` — restaurant page: photo strip, name, ratings, hours, offers, menu (category tiles, sticky search + veg/bestseller filters, category sidebar on desktop, floating Menu button on mobile), sticky cart bar
- `/checkout` — delivery/takeaway, details form with validation, coupon, bill, then simulated payment (UPI / card / COD)
- `/order` — live order tracker + earlier orders
- `/admin` — staff panel: orders (accept → prepare → out/ready → done, cancel), menu (price edit, in-stock toggle), hours + pause orders, reset demo

### Added 2026-10-09 (UI round 2)
- `/` home is now a landing page: header, cafe favourites rail (real photos), category tiles, bestsellers rail, review themes, photo gallery
- `/menu` — full menu with sticky category index (moved from home)
- `/menu/[category]` — PLP, 11 prerendered pages: hero, category switcher, section chips, search-in-category, veg/bestseller filters, sort by price
- `/dish/[id]` — PDP, 144 prerendered pages: photo (morphs from the list), description, add/stepper, "goes well with", "more from section", sticky add bar on mobile, MenuItem JSON-LD
- `/search` — instant ranked search, highlighted matches, category matches, popular + recent searches, shareable `?q=` URLs
- Mobile bottom nav (Home, Menu, Search, Cart, Orders)
- Motion: ADD→stepper pop, count bumps, dot flies to cart, dish photo morph (React ViewTransition), one staggered header load-in, cart-bar ears, animated order tracker, skeleton loaders. All off under reduced motion.

### Added 2026-10-09 (motion round, after studying justswish.in, ownly.food/hyd, zomato.com)
Home page rebuilt as a showpiece; ordering pages kept calm. Libraries: `motion` 14 (LazyMotion + `m`), `lenis` 1.3.
- Cinematic hero: Ken Burns crossfade of the cafe's own photos, shrinks into a rounded card on scroll, glass navbar over it, scroll cue
- Story paragraph with scroll-lit words, floating photo stickers (`public/images/cafe/stickers/`) and a self-drawing line
- Count-up stats strip, "Why order direct" tilt cards, coverflow "Cafe favourites" (swipe/arrows/keys), dark "Come say hi" section with arc divider and drifting beans
- Maroon footer with giant watermark, stickers and script sign-off (Caveat, not preloaded)
- Floating "Order now" pill (hides when cart has items, over the coverflow controls, and near the footer)
- Smooth scroll (Lenis) for mouse/trackpad only; off on touch and reduced motion
- Category banner parallax; dish photo hover zoom
- Reduced motion: hydration-safe `useCalm()` hook; static hero, no scrub/parallax, no Lenis
- Checked: lint/types/build (166 routes), no console errors on 28 page loads (desktop+mobile, motion on/off), LCP 357 ms / CLS 0 on throttled mobile, Lighthouse a11y 96 / best practices 100

Run locally: `cd web && npm install && npm run build && npx next start` (or `npm run dev`).

## Content model
Source: `the-coffee-cat-data.json` — business (name, address, geo, phone, hours, cost for two, services, ratings) + menu (11 categories → sections → items: id, name, type veg/non-veg, price, recommended).

## Stack
- Framework: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS, tokens as CSS variables
- Commerce: Custom cart/checkout; payment simulated (prototype). Production: Razorpay + database.
- CMS: None in prototype — menu from JSON; admin edits saved in browser storage. Production: admin panel backed by a DB.
- Hosting: Vercel (preview URL)
- Analytics / Monitoring: Not in prototype

## Open questions
- Real opening hours (listings range 7 AM–2 AM). Demo default 10 am–11 pm, editable in staff panel.
- In-store vs delivery pricing for the production site.
- Delivery radius and fees. Demo assumes: 5 km, ₹35 delivery (free above ₹499), ₹20 packaging, 5% GST.
- Offers: PURR50 (₹50 off above ₹399) is invented for the demo — the owner must approve or replace.
- Ratings shown (4.4 Google dining, 4.0 Zomato delivery) are from public listings; decide whether to show third-party ratings at all.

## Printed menu card vs online data (resolve before launch)
The cafe's printed coffee menu has S/M/L sizes and lower prices than the magicpin data, e.g. Cappuccino ₹100/120/140 (online ₹130), Americano ₹50/60/70 (online ₹100), Cold coffee ₹100 (online ₹130). Production menu needs size variants and the owner's confirmed price list.

- Dish descriptions are DRAFTS written by us — owner must review all 144 (web/src/data/descriptions.json).
- Checkout ETAs ("30 to 40 min", "15 min") are placeholders.

- Story copy ("opened in 2022…", "See you at the swings") and footer stickers ("Purr-fect coffee") are drafts for owner approval.
- Ask the cafe for a 10–15 s phone video (cold coffee pour, latte art, swings) to replace the hero slideshow.
- Lighthouse flags the story's not-yet-revealed words (18% opacity) for contrast; they reach full contrast as you scroll.

## Known prototype limits (fix in production)
- All state in browser localStorage: staff panel and customer must be in the same browser; no real persistence.
- Staff panel has no login.
- Payment simulated; production needs Razorpay (or similar) + server-side order creation + payment verification webhook.
- No GST invoice, no SMS/WhatsApp order notifications, no refunds flow.
- Stock photos still used for food sections (pizza, burgers, momos, etc.); replace with real dish photos.
- Duplicate client photo (01.28.25 = 01.28.42) used once.

## Phase status
| Phase | Status | Notes |
|---|---|---|
| 0 Discovery | Done (compressed) | Prototype brief above |
| 1 IA & content | Done (prototype) | Sitemap above; content from JSON |
| 2 Design | Decided | Food-app layout, cafe brand |
| 3 Assets | Done (prototype) | Client photos in web/public/images/cafe (EXIF stripped, resized, square dish crops); Unsplash for remaining food sections |
| 4 Architecture | Done | Stack confirmed by user |
| 5 Data & CMS | Skipped (prototype) | JSON + browser storage |
| 6 Development | Done (prototype) | Typecheck, lint, build pass; all routes static |
| 7 Perf / SEO / a11y | Light pass done | Metadata, JSON-LD, noindex, skip link, labelled controls, focus rings, reduced motion. No Lighthouse run yet |
| 8 Analytics / security | Skipped (prototype) | |
| 9 Testing | Smoke test done | Playwright: full mobile order flow, validation, coupon, cross-tab staff updates, sold-out/price edits, no console errors, no horizontal scroll at 390px |
| 10 Deployment | Blocked | Vercel CLI not installed; Vercel connector not authorised |
| 11 Launch | N/A (prototype) | |
