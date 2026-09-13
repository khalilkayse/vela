# Vela

Storefronts for independent makers. Sell digital products, services, and free links from a page that feels like yours. Checkout runs on [Sifalo Pay](https://sifalopay.com) — funds go to the merchant, never through Vela.

## What it does

- **Shop, Studio, or Page layouts** — catalog-first like Shopify, profile + products like Stan, or stacked buttons like Linktree.
- **Products, services, and free links** — each with a cover, price, and delivery note unlocked after payment.
- **Sifalo Pay checkout** — merchants paste their API username and password. Vela initiates hosted checkout and verifies the `sid` on return.
- **Demo checkout** — if a shop has not connected Sifalo Pay yet, buyers can still walk the success and delivery flow without a real charge.
- **Discover** — public shops listed for browsing.

Try the seeded studio at `/maya`.

## Sifalo Pay flow

1. Buyer submits name and email on a product page.
2. Vela `POST`s `https://api.sifalopay.com/gateway/` with Basic Auth and `{ amount, gateway: "checkout", currency: "USD", return_url }`.
3. Buyer is redirected to `https://pay.sifalo.com/checkout/?key=&token=`.
4. Sifalo Pay returns them to `/pay/return?order_id=…&sid=…`.
5. Vela verifies via `https://api.sifalopay.com/gateway/verify.php` and unlocks delivery.

Docs: [developer.sifalopay.com/sifalo-pay-checkout](https://developer.sifalopay.com/sifalo-pay-checkout).

## Stack

React 19, TanStack Start, Tailwind v4, Better Auth, Postgres (Neon or Dokploy Postgres in production, PGLite in local preview).

## Local development

```bash
npm install
npm run dev
```

The app listens on port 8080. Auth and a local database work without extra env files in this workspace.

```bash
npm run build
npm run typecheck
```

## Deploy on Dokploy

1. Create a Postgres service in the same Dokploy project and copy its connection string.
2. Create the application from this repo. **Railpack**, Dockerfile, or Nixpacks all work — `npm run build` now emits a Node server at `.output/server/index.mjs`.
3. Paste [`.env.example`](.env.example) into **Environment** and fill in:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/DBNAME` from the Postgres service. Same-project host is the **database service name**, not `localhost`. |
| `BETTER_AUTH_URL` | Public origin, e.g. `https://shop.sifalo.cloud` (no trailing slash). Must match the URL in the browser or sign-in fails with "Invalid origin". |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `VITE_AUTH_ENABLED` | `true` (needed at **build** time) |
| `NITRO_PRESET` | `node-server` |
| `HOST` / `PORT` | `0.0.0.0` / `3000` (Dokploy usually sets `PORT`) |

4. Deploy. `npm start` creates the database if needed, applies `migrations/`, then starts the server. Sign up at `/login`. The first account is the platform owner and can open `/admin`. Set `PLATFORM_ADMIN_EMAILS` if you want to lock the console to specific emails.

Re-deploys are safe: already-applied migrations are skipped. You can also run `npm run db:migrate` by itself.

A VPS with systemd can keep using [`deploy/vela.service`](deploy/vela.service) (`EnvironmentFile=.env`, same start script).

## License

Private product of [Sifalo](https://www.sifalo.com).
