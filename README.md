# Vela

Storefronts for independent makers. Sell digital products, services, and free links from a page that feels like yours. Checkout runs on [Sifalo Pay](https://sifalopay.com) — funds go to the merchant, never through Vela.

Live: [shop.sifalo.cloud](https://shop.sifalo.cloud)

If you are a coding agent contributing to this repo, start with [CONTRIBUTING.md](CONTRIBUTING.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## What it does

- **Shop, Studio, or Page layouts** — catalog-first like Shopify, profile + products like Stan, or stacked buttons like Linktree.
- **Products, services, and free links** — each with a cover, price, and delivery note unlocked after payment.
- **Private file delivery** — merchants upload files to a platform S3/R2 bucket. Only a paid order can mint a short signed download.
- **Sifalo Pay checkout** — hosted checkout with Basic Auth. Endpoints and optional platform credentials are set in the hidden `/dashx` console; shops can still paste their own keys.
- **Demo checkout** — if nobody has connected Sifalo Pay yet, buyers can still walk the success and delivery flow without a real charge.
- **Discover** — public shops listed for browsing.
- **Unique usernames** — every shop is `yoursite.com/username`. Reserved words include `dashx`, `dashboard`, `login`, `pay`.

Try the seeded studio at `/maya`.

## Sifalo Pay flow

Docs: [developer.sifalopay.com/docs/hosted-checkout](https://developer.sifalopay.com/docs/hosted-checkout).

1. Buyer submits name and email on a product page.
2. Vela `POST`s the **gateway** with HTTP Basic Auth (`API username:API password`) and `{ amount, gateway: "checkout", currency: "USD", return_url, order_id }`.
3. Buyer is redirected to the **checkout page** `?key=&token=`.
4. Sifalo Pay returns them to `/pay/return?order_id=…&sid=…`.
5. Vela `POST`s the **verify** URL with `{ sid }` (no Basic Auth). Success is `status: "success"` or `code: 601`.
6. Paid orders unlock the delivery note, optional URL, and any private files.

Default **production** hosts (live keys only):

| Role | URL |
|---|---|
| Gateway | `https://api.sifalopay.com/gateway/` |
| Verify | `https://api.sifalopay.com/gateway/verify.php` |
| Checkout | `https://pay.sifalo.com/checkout/` |

**Staging** hosts (staging keys only): `https://spay-api.sifalo.net/gateway/`, `https://pay.sifalo.net/checkout/`. Switch them in `/dashx/payments`. Gateway timeout is 120 seconds. There are no webhooks.

## File storage

Configured in `/dashx/storage` (Cloudflare R2, AWS S3, or MinIO). The bucket must stay **private**.

- Merchants upload through `POST /api/files/upload` (session required, 40 MB cap).
- Objects live at `shops/{shopId}/products/{productId}/{id}/{filename}`.
- After payment, the success page lists files as `/api/files/d/{hmac}`. The token is bound to a paid `order_ref` + file id. The handler 302s to a 90-second S3 signed GET. Unpaid visitors get 403.

## Hidden owner console (`/dashx`)

Not linked from the merchant UI. First deploy prints `owner@shop.sifalo.cloud` and a one-time password in the logs.

| Page | What it configures |
|---|---|
| `/dashx` | Platform stats |
| `/dashx/shops` | Publish / unpublish storefronts |
| `/dashx/orders` | All orders |
| `/dashx/users` | Accounts |
| `/dashx/mail` | SMTP (confirmation, reset, welcome) |
| `/dashx/storage` | S3/R2 credentials |
| `/dashx/payments` | Sifalo Pay hosts + optional platform merchant |

## Stack

React 19, TanStack Start (file routes), Tailwind v4, Better Auth (email/password), Postgres (Neon or Dokploy Postgres in production, PGLite in local preview), AWS SDK v3 for S3.

## Local development

```bash
npm install
npm run dev
```

The app listens on port 8080. Auth and a local database work without extra env files in this workspace.

```bash
npm run build
npm run typecheck
npm test
```

## Deploy on Dokploy

1. Create a Postgres service in the same Dokploy project and copy its connection string.
2. Create the application from this repo. **Railpack**, Dockerfile, or Nixpacks all work — `npm run build` emits a Node server at `.output/server/index.mjs`.
3. Paste [`.env.example`](.env.example) into **Environment** and fill in:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/DBNAME` from the Postgres service. Same-project host is the **database service name**, not `localhost`. |
| `BETTER_AUTH_URL` | Public origin, e.g. `https://shop.sifalo.cloud` (no trailing slash). Empty still defaults to that origin. |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `VITE_AUTH_ENABLED` | `true` (needed at **build** time) |
| `NITRO_PRESET` | `node-server` |
| `HOST` / `PORT` | `0.0.0.0` / `3000` (Dokploy usually sets `PORT`) |

4. Deploy. `npm start` creates the database if needed, applies `migrations/`, then starts the server. The first boot prints a **super admin** email and password in the logs — sign in at `/dashx`. Merchants sign up at `/login`.

SMTP, S3, and Sifalo Pay are configured **in `/dashx` after boot**, not required as env vars. Optional env fallbacks are listed in `.env.example`.

Re-deploys are safe: already-applied migrations are skipped. You can also run `npm run db:migrate` by itself.

A VPS with systemd can keep using [`deploy/vela.service`](deploy/vela.service) (`EnvironmentFile=.env`, same start script).

## License

Private product of [Sifalo](https://www.sifalo.com).
