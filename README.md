# Kart

One click storefronts for independent makers powered by [Sifalo Pay](https://sifalopay.com).

Live: [shop.sifalo.cloud](https://shop.sifalo.cloud)

If you are a coding agent contributing to this repo, start with [CONTRIBUTING.md](CONTRIBUTING.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## What it does

- **Shop, Studio, or Page layouts** — a catalog of covers and prices, a profile with links then products, or a single column of buttons.
- **Products, services, and free links** — title, thumbnail, gallery, description, price, and a delivery note unlocked after payment.
- **Private file delivery** — merchants upload files to a platform S3/R2 bucket. Only a paid order can mint a short signed download.
- **Platform-wide Sifalo Pay checkout** — one Sifalo Pay merchant account (set in `/dashx/payments`, sandbox or live) runs checkout for every shop. Kart takes a percent-plus-fixed fee per sale and tracks each shop's balance; sellers add payout details (mobile wallet or bank account) in Settings, and the platform owner records payouts in `/dashx/payouts`. Sellers never connect their own Sifalo Pay account.
- **Country-aware accounts** — signup country and last login are recorded (Cloudflare `CF-IPCountry` and similar headers). New shops inherit that country. `/dashx/access` can block sign-ups from selected countries.
- **Social login** — Google, GitHub, X, Discord, Facebook, Apple, Microsoft. A button is shown **only** when that provider’s env vars are set. Otherwise email/password only.
- **Discover** — public shops listed for browsing.
- **Unique usernames** — every shop is `yoursite.com/username`. Reserved names (routes plus extras you add in `/dashx/access`) cannot be claimed. The shop form only says the username is not available.

The seeded studio at `/maya` ships unpublished — it only existed so the live preview had something to show without signing in, and a demo shop must never be able to take a real payment on the platform-wide merchant account.

## Sifalo Pay flow

One Sifalo Pay merchant account (sandbox or live, set in `/dashx/payments`) runs checkout for every shop on this instance. Sellers never paste their own API credentials.

1. Buyer submits name and email on a product page.
2. Kart `POST`s the **gateway** with HTTP Basic Auth (the platform's API username/key for the active mode) and `{ amount, gateway: "checkout", currency: "USD", return_url, order_id }`.
3. Buyer is redirected to the **checkout page** `?key=&token=`.
4. Sifalo Pay returns them to `/pay/return?order_id=…&sid=…`.
5. Kart `POST`s the **verify** URL with `{ sid }` (no Basic Auth). An order is marked paid only when `status` is exactly `"success"` **and** `code` is `601`, and the verified amount matches the order — this also blocks a sid from one order being replayed against another.
6. Paid orders unlock the delivery note, optional URL, and any private files. Receipts email when SMTP is set. The platform fee is deducted into `net_amount`, which accrues to the seller's balance until a payout is recorded.

Hosts are fixed per environment (not editable):

| Role | Live | Sandbox |
|---|---|---|
| Gateway | `https://api.sifalopay.com/gateway/` | `https://spay-api.sifalo.net/gateway/` |
| Verify | `https://api.sifalopay.com/gateway/verify.php` | `https://spay-api.sifalo.net/gateway/verify.php` |
| Checkout | `https://pay.sifalo.com/checkout/` | `https://pay.sifalo.net/checkout/` |

Switch the active mode, and set sandbox/live credentials, in `/dashx/payments`. Gateway timeout is 120 seconds. There are no webhooks.

**Who gets paid**

Every sale runs through the platform's merchant account. The platform fee (percent + fixed, set in `/dashx/payments`) is subtracted from the sale into `net_amount`. `/dashx/payouts` shows each shop's running balance; the operator sends the money by hand (to the mobile wallet or bank account the seller set in Settings → Payouts) and records it there, which clears the balance.

Without active credentials for the current mode, paid checkout is disabled platform-wide (free items and links still work) — there is no demo/fallback checkout.

## File storage

Configured in `/dashx/storage` (Cloudflare R2, AWS S3, or MinIO). The bucket must stay **private**.

- Merchants upload through `POST /api/files/upload` (session required, 40 MB cap).
- Objects live at `shops/{shopId}/products/{productId}/{id}/{filename}`.
- After payment, the success page lists files as `/api/files/d/{hmac}`. The token is bound to a paid `order_ref` + file id. The handler 302s to a 90-second S3 signed GET. Unpaid visitors get 403.

## Hidden owner console (`/dashx`)

Not linked from the merchant UI. First deploy prints `owner@shop.sifalo.cloud` and a one-time password in the logs.

| Page | What it configures |
|---|---|
| `/dashx` | Platform stats, including gross sales, fees earned, and balance owed to sellers |
| `/dashx/shops` | Publish / unpublish |
| `/dashx/payouts` | Each shop's balance; record a payout and see its history |
| `/dashx/orders` | All orders, with fee/net and a re-check-payment action on pending ones |
| `/dashx/users` | Accounts, last login, signup country, disable |
| `/dashx/access` | Default country, blocked signup countries |
| `/dashx/mail` | SMTP (confirmation, reset, welcome) |
| `/dashx/storage` | S3/R2 credentials |
| `/dashx/payments` | Sifalo Pay sandbox/live credentials and the platform fee |

## Social login

Email/password is always on. Social buttons are **runtime** — set the pair in Dokploy Environment, restart the app, the button appears. Unset them and it disappears. No rebuild required for the server; the login page asks the server which providers are live.

Callback for every provider:

```
https://shop.sifalo.cloud/api/auth/callback/{provider}
```

Replace the origin with `BETTER_AUTH_URL` if the site is on another host. Add that **exact** URL in the provider console as an authorized redirect.

| Provider | Env vars | Console | Notes |
|---|---|---|---|
| **Google** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) | OAuth 2.0 Client ID, type **Web application**. Authorized JavaScript origin = the public origin. Authorized redirect URI = callback above. |
| **GitHub** | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | [GitHub OAuth Apps](https://github.com/settings/developers) | Homepage URL = public origin. Authorization callback URL = callback. |
| **X** | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | [X Developer Portal](https://developer.x.com/en/portal/dashboard) | OAuth 2.0 confidential client. Callback URL must match. Request email if you want a real address. |
| **Discord** | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | [Discord applications](https://discord.com/developers/applications) | OAuth2 → Redirects. |
| **Facebook** | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | [Facebook apps](https://developers.facebook.com/apps) | Facebook Login valid OAuth redirect URI. App must be live (or testers only). |
| **Apple** | `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | [Apple identifiers](https://developer.apple.com/account/resources/identifiers/list/serviceId) | Services ID as client id. Client secret is a JWT from a `.p8` key. HTTPS required. Optional `APPLE_APP_BUNDLE_IDENTIFIER`. |
| **Microsoft** | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | [Azure app registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps) | Web redirect URI = callback. Optional `MICROSOFT_TENANT_ID` (default `common`). |

Do **not** put these secrets in `VITE_*` variables. Only the server reads them.

## Country + last login

On every sign-up and sign-in Kart stores:

- `signup_country` (first seen, not overwritten)
- `last_login_at`, `last_login_country`, `last_login_ip`

Country is read from, in order: `CF-IPCountry`, `x-vercel-ip-country`, `cloudfront-viewer-country`, `x-country-code`. If none are present (no Cloudflare in front of Dokploy), it uses `default_signup_country` from `/dashx/access` or `DEFAULT_SIGNUP_COUNTRY`. New shops inherit that country so the store can be based in the right market. Merchants can change it in Settings.

Blocked ISO codes in `/dashx/access` refuse **new** sign-ups from that region. Existing accounts can still log in. Disable an account on `/dashx/users` to lock a person out (sessions are dropped).

## Stack

React 19, TanStack Start (file routes), Tailwind v4, Better Auth (email/password + optional social), Postgres (Neon or Dokploy Postgres in production, PGLite in local preview), AWS SDK v3 for S3.

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

SMTP, S3, and Sifalo Pay are configured **in `/dashx` after boot**, not required as env vars. Social login and `DEFAULT_SIGNUP_COUNTRY` are env-only (see above).

Put Cloudflare (or another proxy that sets `CF-IPCountry`) in front of the app if you want accurate signup countries.

Re-deploys are safe: already-applied migrations are skipped. You can also run `npm run db:migrate` by itself.

A VPS with systemd can keep using [`deploy/vela.service`](deploy/vela.service) (`EnvironmentFile=.env`, same start script).

## License

Private product of [Sifalo](https://www.sifalo.com).
