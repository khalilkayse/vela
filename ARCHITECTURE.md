# Architecture

Map of Kart for people (and coding agents) changing the code. Product intent lives in [README.md](README.md). How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md).

## Runtime

```
Browser ──► TanStack Start (Vite + Nitro node-server)
                │
                ├── Better Auth  /api/auth/$
                ├── Postgres     DATABASE_URL (PGLite if unset)
                ├── Sifalo Pay   hosts from platform_settings
                └── S3 / R2      private objects + presigned GET
```

- **Dev:** `npm run dev` → `0.0.0.0:8080` via `scripts/with-app-env.mjs`.
- **Prod:** `npm run build` (`NITRO_PRESET=node-server`) then `npm start` → `scripts/start.mjs` migrates, then `.output/server/index.mjs`.
- **Dokploy:** Railpack / Dockerfile / Nixpacks all emit that Node server.

## Directory map

| Path | Role |
|---|---|
| `src/routes/` | File-based routes. `__root.tsx` is the shell. `$username.tsx` is the public shop. |
| `src/routes/dashboard/` | Merchant studio (auth required). Never link `/dashx` from here. |
| `src/routes/dashx/` | Hidden platform console. Parent `src/routes/dashx.tsx` renders `DashxShell`. |
| `src/routes/pay/` | Checkout return, success + file unlock. (No demo pay route — removed with demo checkout.) |
| `src/routes/api/files/` | `upload` (session) and `d.$token` (purchase-gated download). |
| `src/components/` | UI. `dashx-shell.tsx` vs `dashboard-shell.tsx` are separate on purpose. |
| `src/lib/server/` | `createServerFn` handlers (products, shops, orders, checkout, admin, files). |
| `src/lib/server/payments.server.ts` | `notifyPaidOrder` + `reverifyOrder` — the side-effecting Sifalo logic that `checkout.ts` and `admin.ts` both call. Kept out of those files because both are imported by client routes; a `.server.ts` module is guaranteed never bundled for the browser. |
| `src/lib/auth/` | Better Auth client + server, admin middleware, session verify. |
| `src/lib/fees.ts` | Pure fee math (`computeFee`) and the Sifalo verify-result rules (`isVerifiedPaid`/`isVerifiedFailed`). Unit tested — client and server safe. |
| `src/lib/sifalo.server.ts` | Platform-wide (sandbox/live) credentials, fee settings, gateway initiate + verify. Server-only. |
| `src/lib/storage.ts` | S3 client, put/delete, signed GET, `contentDisposition()`. Server-only. |
| `src/lib/download-token.ts` | HMAC grant `{ orderRef, fileId, exp }`. |
| `src/lib/platform-settings.ts` | Key/value in `platform_settings`. |
| `src/lib/mail.ts` | Nodemailer + HTML layouts. |
| `src/lib/constants.ts` | Reserved usernames, layouts, Sifalo host presets, payout methods. Safe for client. |
| `migrations/` | Ordered `000N_*.sql`. Applied on start. Never edit an applied file — add `0007_…`. |
| `scripts/` | migrate, bootstrap-admin, start, env, tests. |
| `src/routeTree.gen.ts` | Generated. Do not hand-edit; Vite regenerates it. |

## Auth

- Email/password via Better Auth. `VITE_AUTH_ENABLED=true` at **build** time.
- Direct social providers (Google, GitHub, X, Discord, Facebook, Apple, Microsoft) via `socialProviders` when the matching env pair is set. Catalog: `src/lib/auth/social-catalog.ts`. Wired in `src/lib/auth/social.server.ts`. Login asks `getPublicAuthMethods`.
- `BETTER_AUTH_URL` is the public origin. Empty in production still defaults to `https://shop.sifalo.cloud`.
- `authMiddleware` on merchant server functions; `adminMiddleware` on `/dashx` server functions.
- Platform admins: row in `platform_admins`, plus optional `PLATFORM_ADMIN_EMAILS`. First boot inserts `owner@shop.sifalo.cloud` (`scripts/bootstrap-admin.mjs`) and prints the password **once**.
- Do not expose `/dashx` in the merchant header, footer, sitemap, or storefront.
- `user_profiles` holds signup country, last login, and `disabled`. Country headers live in `src/lib/geo.ts`. Blocked countries: `platform_settings.blocked_countries`.

## Data

Postgres (or PGLite). Important tables:

- `"user"` / `session` / `account` — Better Auth
- `user_profiles` — signup country, last login, disabled
- `shops` — unique `username`, layout, country, payout method/account/name, published. (`sifalo_api_key`/`sifalo_api_password`/`allow_own_sifalo` columns still exist for migration safety but are unused — sellers no longer bring their own Sifalo Pay account.)
- `products` — kind `digital` \| `service` \| `link` \| `article`, delivery note/url
- `product_files` — `object_key`, `kind` (`delivery` \| `cover`)
- `orders` — `order_ref`, status, `sifalo_sid` (unique when set), `sifalo_env`, `fee_amount`, `net_amount`, `payout_id`, `demo` (legacy — never set on new orders)
- `payouts` — one row per payout the operator records in `/dashx/payouts`; sets `payout_id` on the orders it covers
- `page_blocks` — extra storefront blocks
- `platform_admins`, `platform_settings`

`platform_settings` keys:

| Key | Set in |
|---|---|
| `smtp_*` | `/dashx/mail` |
| `s3_endpoint`, `s3_region`, `s3_bucket`, `s3_access_key`, `s3_secret_key`, `s3_cdn_base`, `s3_force_path_style` | `/dashx/storage` |
| `sifalo_mode`, `sifalo_sandbox_api_user`, `sifalo_sandbox_api_key`, `sifalo_live_api_user`, `sifalo_live_api_key`, `platform_fee_percent`, `platform_fee_fixed` | `/dashx/payments` |
| `blocked_countries`, `default_signup_country` | `/dashx/access` |

No env var fallbacks for any of these — a cleared field in `/dashx` stays cleared. (`DEFAULT_SIGNUP_COUNTRY` is the one exception, and it's env-only, read before `default_signup_country` exists.)

## Checkout

```
startCheckout
  ├─ free / link      → mark paid, /pay/success/:orderRef
  ├─ no credentials   → reject: "Checkout isn't open yet."
  └─ Sifalo           → compute fee/net from the platform fee settings
                         → POST gateway (active mode's credentials) → redirect checkoutPage?key&token
                             └─ /pay/return?order_id&sid
                                  └─ reverifyOrder (payments.server.ts): POST verify { sid }
                                       → isVerifiedPaid (status==="success" && code===601 && amount matches)
                                       → paid | failed | pending
                                            └─ /pay/success/:orderRef (polls while pending)
```

`activeCredentials()` (`sifalo.server.ts`) just reads whichever of `sandbox`/`live` is the configured `sifalo_mode` and returns it, or `null` if that mode's username/key isn't set — there is no per-shop fallback or demo mode anymore. `/dashx/orders` can call `reverifyOrder` again by `order_id` for a pending order (e.g. the buyer closed the tab before `/pay/return` ran).

Verify does **not** send Basic Auth. `isVerifiedPaid`/`isVerifiedFailed` (`src/lib/fees.ts`) are the one place that interprets the result — don't re-implement the `status`/`code` check elsewhere.

## Purchase-gated files

```
merchant POST /api/files/upload
  → PutObject (private) + insert product_files

buyer paid → getPublicOrder.delivery.files
  → /api/files/d/{hmac}
       → verify HMAC + order.status === "paid" + file belongs to that product
       → 302 signed GET (90s)
```

Never put a public object ACL on delivery files. Never put the raw `object_key` in HTML.

## Public URLs

- `/` marketing
- `/discover` shop index
- `/login` `/onboarding`
- `/$username` shop
- `/$username/$slug` product + checkout
- `/dashboard/*` merchant
- `/dashx/*` owner (unlisted)
- `/pay/return` `/pay/success/$orderRef`

`$username` must stay after static routes so `login` / `dashx` / `discover` are not captured as shops. `RESERVED_USERNAMES` in `src/lib/constants.ts` must include every top-level path.

## UI rules

- Tokens in `src/styles.css` `@theme`. No ad-hoc hex in JSX.
- Merchant chrome: `DashboardShell`. Owner chrome: `DashxShell`.
- lucide-react for icons. Existing `Button` / `Field` / `Card` / `Input`.
