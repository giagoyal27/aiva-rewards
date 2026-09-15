# AIVA Rewards

A digital loyalty system for **AIVA — 925 Sterling Silver Jewellery**, connected to a physical
10-circle loyalty card. One common QR code is printed on every physical card; the unique
**Card Number** identifies each customer's account, and the digital database is always the
source of truth — not the physical card.

---

## 1. Architecture

- **Framework:** Next.js 14 (App Router) — a single project serves both the customer-facing
  frontend, the admin panel, and the JSON API (via Route Handlers). This keeps deployment to
  one process/one repo.
- **Database:** SQLite by default (zero setup, a single file) via **Prisma ORM**. Swap to
  Postgres in minutes by changing one line in `prisma/schema.prisma` and your `DATABASE_URL`
  — the schema is written to work unchanged on both.
- **Auth:** Two independent, cookie-based JWT sessions (`jose`) — customers authenticate with
  **Name + Mobile Number + Card Number** on registration, and **Mobile Number + Card Number** on
  return visits (no OTP, no password for customers). Admins use email + bcrypt-hashed password.
  Route access is enforced both in `src/middleware.ts` (edge-level redirect) and again inside
  every API route (defense in depth).
- **Styling:** Tailwind CSS with a custom AIVA design system (soft neutral background, blush
  accent, no gold/neon) defined in `tailwind.config.ts` and `src/app/globals.css`.
- **Validation:** `zod` schemas for every API input (`src/lib/validation.ts`).
- **Tests:** `vitest`, running against a disposable local SQLite test database.

### Folder structure

```
aiva-rewards/
├─ prisma/
│  ├─ schema.prisma        # Full data model (see §6)
│  └─ seed.ts               # Dev seed data (admin, reward rules, demo customer)
├─ src/
│  ├─ app/
│  │  ├─ login/ register/                # Customer auth flow (mobile + card number, no OTP)
│  │  ├─ dashboard/ history/ rewards/ profile/  # Customer app (mobile-first)
│  │  ├─ qr/                              # Printable common QR code page
│  │  ├─ admin/                           # Admin panel (desktop-first)
│  │  └─ api/                             # All backend REST endpoints
│  ├─ components/            # Shared UI (buttons, nav, admin shell)
│  ├─ lib/
│  │  ├─ loyalty-engine.ts   # ⭐ single source of truth for all purchase/cycle/reward rules
│  │  ├─ cards.ts            # Card create/assign/deactivate/replace
│  │  ├─ rewards.ts          # Fixed default reward structure (§10 of the spec)
│  │  ├─ auth.ts              # Session + admin password helpers
│  │  ├─ validation.ts        # zod schemas
│  │  ├─ api-response.ts      # Consistent ok()/fail() + friendly error copy
│  │  ├─ audit.ts             # Audit log writer
│  │  └─ admin-guard.ts       # requireAdmin() helper for API routes
│  └─ middleware.ts           # Route protection at the edge
└─ tests/                    # vitest suite covering all critical business rules
```

---

## 2. Install & run locally

**Prerequisites:** Node.js 18+ and npm.

```bash
git clone <this-repo>   # or unzip the project
cd aiva-rewards
npm install
cp .env.example .env
# edit .env: set AUTH_SECRET to a real random value, e.g.
#   openssl rand -base64 48

npm run db:push     # creates dev.db (SQLite) from the Prisma schema
npm run db:seed     # seeds reward rules, a dev admin, and a demo customer

npm run dev
```

Visit:
- Customer app → http://localhost:3000/login
- Admin panel → http://localhost:3000/admin/login
- Common QR code (printable) → http://localhost:3000/qr

### Seeded accounts (development only)

| Role | Identifier | Password / Card Number |
|---|---|---|
| Admin | `admin@aiva.test` (or your `SEED_ADMIN_EMAIL`) | `ChangeMe123!` (or your `SEED_ADMIN_PASSWORD`) — **change this before any real deployment** |
| Demo customer | mobile `+919999900001`, card `AIVA-00001` | Log in directly with that mobile number + card number — no code needed |

A second blank card, `AIVA-00002`, is also seeded and ready to register a second test customer
against, to exercise the full registration flow end-to-end.

The demo customer starts with 2/10 purchases completed and **one pending purchase request**
(#3) already waiting in Admin → Pending Requests, so you can test the approve/reject flow
immediately without creating your own request first.

---

## 3. Environment variables

See `.env.example` for the full annotated list. The essentials:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` for SQLite (default), or a `postgresql://...` URL |
| `AUTH_SECRET` | Signs customer/admin session JWTs. **Must** be a long random string. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Used only by `npm run db:seed` |
| `NEXT_PUBLIC_APP_URL` | Used to build the URL encoded in the common QR code |

---

## 4. How customer authentication works

Customers authenticate with **Name + Mobile Number + Card Number** — there is no OTP and no
password for the customer side.

**Registration (`POST /api/auth/register`):**
1. Validates the name, mobile number, and card number.
2. Rejects the request if the mobile number is already registered, the card number doesn't
   exist, the card is inactive, or the card is already linked to someone else
   (`src/lib/cards.ts` → `assignCardToCustomer()`).
3. Creates the `Customer` record, links the card, and immediately creates the session cookie —
   the customer lands straight on their dashboard.

**Returning login (`POST /api/auth/login`):**
1. Looks up the customer by mobile number.
2. Confirms the submitted card number matches that customer's linked, active card.
3. If both match, creates the session cookie. If either the mobile number or the card number is
   wrong, a single generic `LOGIN_MISMATCH` error is returned (the API never reveals which of
   the two fields was incorrect, so the endpoint can't be used to enumerate registered mobile
   numbers).

This keeps the physical card meaningful as a second factor — a stranger who only knows a
customer's mobile number still can't log into their account — while avoiding the need for any
SMS/OTP provider or password reset flow. If you later want to add OTP or password login on top
of this, `src/app/api/auth/register` and `src/app/api/auth/login` are the two places to extend.

---

## 5. How to generate/display the common QR code

There is exactly **one** QR code for the whole brand — never a per-card or per-customer code.

- `GET /api/qr` returns a PNG that always encodes `<NEXT_PUBLIC_APP_URL>/login`.
- `/qr` is a printable page wrapping that image, ready to send to your card printer.

## 6. How to create/assign card numbers

- Admin → Cards → **+ Create Card** creates a new `UNASSIGNED` card (e.g. `AIVA-00512`).
- Cards get linked to a customer automatically the first time someone registers using that
  card number (`assignCardToCustomer` in `src/lib/cards.ts`), or an admin can link one manually
  by having the customer register with it.
- Admin → Cards → **Replace (lost)** deactivates the old card (`status: REPLACED`) and issues a
  new card number to the same customer, preserving their account and full purchase history.
- Admin → Cards → **Deactivate** marks a card `DEACTIVATED` without touching the customer record.

---

## 7. Database design (§21 of the original spec)

Core entities, all in `prisma/schema.prisma`:

- **Customer** — the authoritative account (name, mobile, active flag). No password.
- **LoyaltyCard** — unique `cardNumber`, status (`UNASSIGNED`/`ACTIVE`/`LOST`/`REPLACED`/
  `DEACTIVATED`), optionally linked to one `Customer` (1:1).
- **LoyaltyCycle** — one full 1–10 journey per customer. Multiple cycles per customer are kept
  forever (`cycleNumber` increments; nothing is deleted on completion).
- **PurchaseRequest** — a customer's "I MADE A PURCHASE" tap. `PENDING` → `APPROVED`/`REJECTED`.
- **Purchase** — a permanently recorded, approved purchase (`source`: `CUSTOMER_REQUEST_APPROVED`
  or `ADMIN_MANUAL`), unique per `(cycleId, purchaseNumber)`.
- **RewardRule** — the configurable 1–10 reward table (admin-editable labels/values; the 10
  *positions* are fixed).
- **RewardRedemption** — one row per completed purchase's reward; `UNLOCKED` → `REDEEMED`,
  never redeemable twice.
- **Admin** — separate login, `SUPER_ADMIN`/`STAFF` roles.
- **SystemSettings** — single-row brand/social-link configuration.
- **AuditLog** — append-only record of every important admin/business action.

---

## 8. API overview

All responses are `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.

| Area | Endpoint |
|---|---|
| Customer auth | `POST /api/auth/register` (name + mobile + card), `POST /api/auth/login` (mobile + card), `POST /api/auth/logout` |
| Customer data | `GET /api/customer/me`, `POST /api/customer/purchase-request` |
| Admin auth | `POST /api/admin/auth/login`, `/api/admin/auth/logout` |
| Admin dashboard | `GET /api/admin/dashboard-stats` |
| Purchase requests | `GET /api/admin/purchases/pending`, `POST /api/admin/purchases/[id]/approve`, `POST /api/admin/purchases/[id]/reject` |
| Manual purchase | `POST /api/admin/purchases/manual` |
| Customers | `GET /api/admin/customers?q=`, `GET /api/admin/customers/[id]` |
| Cards | `GET/POST /api/admin/cards`, `POST /api/admin/cards/[id]/deactivate`, `POST /api/admin/cards/[id]/replace` |
| Rewards | `GET /api/admin/rewards?status=`, `POST /api/admin/rewards/[id]/redeem` |
| Settings | `GET/PUT /api/admin/settings`, `PUT /api/admin/settings/reward-rules/[purchaseNumber]` |
| Audit | `GET /api/admin/audit-logs?page=` |
| QR | `GET /api/qr` |

---

## 9. Running tests

```bash
npm test
```

Tests run against an isolated local SQLite file (`tests/test.db`), automatically created and
reset before the suite runs and between every test (`tests/setup.ts`) — your dev database is
never touched. Coverage includes:

- Card creation, uniqueness, assignment, deactivation, lost-card replacement (history preserved)
- Purchase request creation + duplicate-request prevention
- Admin approval and rejection (and that a decided request can't be re-decided)
- Admin manual purchase addition
- The **exact** 10-step reward sequence, position by position
- Reward unlock-on-purchase and redeem-once-only enforcement
- Full cycle completion and automatic rollover into a new cycle, with history preserved
- Mobile number and card number uniqueness constraints
- Login only succeeds when mobile number and card number both match the same account
- Per-customer data isolation (one customer's journey never leaks into another's)

## 10. Build & deploy

```bash
npm run build
npm run start
```

Deploy anywhere that runs Node.js (Vercel, Render, a VPS with PM2, etc.). For production:

1. Set `DATABASE_URL` to a real Postgres instance (recommended over SQLite once you have
   concurrent writers) and run `npm run db:migrate` once to create tables via a tracked migration.
2. Set a strong `AUTH_SECRET`.
3. Run `npm run db:seed` once against production to create your real admin account and reward
   rules (edit `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` first!), then change that password.
4. Set `NEXT_PUBLIC_APP_URL` to your real domain so the printed QR code points to the right place.

---

## 11. Admin usage quick guide

1. Log in at `/admin/login`.
2. **Pending Requests** — approve or reject each "I MADE A PURCHASE" submission from customers.
3. **Customers** — search by name/mobile/card, open a profile, and use **+ Add Purchase** to
   record a purchase manually (with a confirmation step to avoid accidental duplicates).
4. **Rewards** — see every unlocked reward across all customers and mark them redeemed in-store.
5. **Cards** — issue new blank cards, replace lost ones, deactivate cards.
6. **Settings** — edit brand name, social links, and (if needed) reward labels per position.
7. **Audit Logs** — full trail of every approval, rejection, manual purchase, redemption, card
   action, and settings change, with the responsible admin and timestamp.

---

## 12. Business rules enforced in code (traceability)

Every rule from the original specification's §37 is enforced in `src/lib/loyalty-engine.ts` and
`src/lib/cards.ts`, not scattered across the UI:

- One common QR code (`/api/qr` always encodes the same login URL — see §5).
- Card numbers are unique (`LoyaltyCard.cardNumber` has a DB-level unique constraint).
- Customers authenticate with mobile number + card number together (`src/app/api/auth/login`);
  neither field alone is sufficient, and a login attempt never reveals which field was wrong.
- Customers cannot self-mark a purchase complete — only `createPurchaseRequest()` is exposed to
  them; only `approvePurchaseRequest()`/`addManualPurchase()` (admin-only) actually record one.
- Rewards unlock automatically and atomically alongside the purchase record.
- A `RewardRedemption` can only move `UNLOCKED → REDEEMED` once (`ALREADY_REDEEMED` guard).
- Purchase history and past cycles are never deleted — cycle rollover creates a new
  `LoyaltyCycle` row rather than resetting the old one, and card replacement re-points the
  existing `Customer` rather than creating a new one.
