# Architecture

Map of Vela for people (and coding agents) changing the code. Product intent lives in [README.md](README.md). How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md).

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
| `src/routes/pay/` | Checkout return, demo pay, success + file unlock. |
| `src/routes/api/files/` | `upload` (session) and `d.$token` (purchase-gated download). |
| `src/components/` | UI. `dashx-shell.tsx` vs `dashboard-shell.tsx` are separate on purpose. |
| `src/lib/server/` | `createServerFn` handlers (products, shops, orders, checkout, admin, files). |
| `src/lib/auth/` | Better Auth client + server, admin middleware, session verify. |
| `src/lib/sifalo.server.ts` | Gateway initiate + verify. Server-only. |
| `src/lib/storage.ts` | S3 client, put/delete, signed GET. Server-only. |
| `src/lib/download-token.ts` | HMAC grant `{ orderRef, fileId, exp }`. |
| `src/lib/platform-settings.ts` | Key/value in `platform_settings`. |
| `src/lib/mail.ts` | Nodemailer + HTML layouts. |
| `src/lib/constants.ts` | Reserved usernames, layouts, Sifalo host presets. Safe for client. |
| `migrations/` | Ordered `000N_*.sql`. Applied on start. Never edit an applied file — add `0007_…`. |
| `scripts/` | migrate, bootstrap-admin, start, env, tests. |
| `src/routeTree.gen.ts` | Generated. Do not hand-edit; Vite regenerates it. |

## Auth

- Email/password via Better Auth. `VITE_AUTH_ENABLED=true` at **build** time.
- `BETTER_AUTH_URL` is the public origin. Empty in production still defaults to `https://shop.sifalo.cloud`.
- `authMiddleware` on merchant server functions; `adminMiddleware` on `/dashx` server functions.
- Platform admins: row in `platform_admins`, plus optional `PLATFORM_ADMIN_EMAILS`. First boot inserts `owner@shop.sifalo.cloud` (`scripts/bootstrap-admin.mjs`) and prints the password **once**.
- Do not expose `/dashx` in the merchant header, footer, sitemap, or storefront.

## Data

Postgres (or PGLite). Important tables:

- `"user"` / `session` / `account` — Better Auth
- `shops` — unique `username`, layout, Sifalo keys, published
- `products` — kind `digital` \| `service` \| `link`, delivery note/url
- `product_files` — `object_key`, `kind` (`delivery` \| `cover`)
- `orders` — `order_ref`, status, `sifalo_sid`, `demo`
- `page_blocks` — extra storefront blocks
- `platform_admins`, `platform_settings`

`platform_settings` keys:

| Key | Set in |
|---|---|
| `smtp_*` | `/dashx/mail` |
| `s3_endpoint`, `s3_region`, `s3_bucket`, `s3_access_key`, `s3_secret_key`, `s3_cdn_base`, `s3_force_path_style` | `/dashx/storage` |
| `sifalo_gateway_url`, `sifalo_verify_url`, `sifalo_checkout_page`, `sifalo_api_key`, `sifalo_api_password`, `sifalo_use_platform` | `/dashx/payments` |

Env vars of the same name are fallbacks if the row is empty.

## Checkout

```
startCheckout
  ├─ free / link     → mark paid, /pay/success/:orderRef
  ├─ no credentials  → /pay/demo/:orderRef
  └─ Sifalo          → POST gateway → redirect checkoutPage?key&token
                          └─ /pay/return?order_id&sid
                               └─ POST verify { sid } → paid | failed
                                    └─ /pay/success/:orderRef
```

`resolveSifaloMerchant(shop)`:

1. If `sifalo_use_platform` is off and the shop has keys → shop
2. If `sifalo_use_platform` is on and platform has keys → platform
3. Else first shop keys, then platform keys
4. Else demo mode

Verify does **not** send Basic Auth. Treat `status === "success"` or `code === 601` as paid.

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
- `/pay/return` `/pay/success/$orderRef` `/pay/demo/$orderRef`

`$username` must stay after static routes so `login` / `dashx` / `discover` are not captured as shops. `RESERVED_USERNAMES` in `src/lib/constants.ts` must include every top-level path.

## UI rules

- Tokens in `src/styles.css` `@theme`. No ad-hoc hex in JSX.
- Merchant chrome: `DashboardShell`. Owner chrome: `DashxShell`.
- lucide-react for icons. Existing `Button` / `Field` / `Card` / `Input`.
