# Kart

One click storefronts for independent makers powered by [Sifalo Pay](https://sifalopay.com).

Live: [shop.sifalo.cloud](https://shop.sifalo.cloud)

If you are a coding agent contributing to this repo, start with [CONTRIBUTING.md](CONTRIBUTING.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## What it does

- **Shop, Studio, or Page layouts** — a catalog of covers and prices, a profile with links then products, or a single column of buttons.
- **Products, services, and free links** — each with a cover, price, and delivery note unlocked after payment.
- **Private file delivery** — merchants upload files to a platform S3/R2 bucket. Only a paid order can mint a short signed download.
- **Sifalo Pay checkout** — hosted checkout with Basic Auth. Endpoints and optional platform credentials are set in `/dashx`. Individual shops can be granted their own keys even while the platform collects for everyone else.
- **Country-aware accounts** — signup country and last login are recorded (Cloudflare `CF-IPCountry` and similar headers). New shops inherit that country. `/dashx/access` can block sign-ups from selected countries.
- **Social login** — Google, GitHub, X, Discord, Facebook, Apple, Microsoft. A button is shown **only** when that provider’s env vars are set. Otherwise email/password only.
- **Demo checkout** — if nobody has connected Sifalo Pay yet, buyers can still walk the success and delivery flow without a real charge.
- **Discover** — public shops listed for browsing.
- **Unique usernames** — every shop is `yoursite.com/username`. Reserved words include `dashx`, `dashboard`, `login`, `pay`, `kart`.

Try the seeded studio at `/maya`.

## Sifalo Pay flow

Docs: [developer.sifalopay.com/docs/hosted-checkout](https://developer.sifalopay.com/docs/hosted-checkout).

1. Buyer submits name and email on a product page.
2. Kart `POST`s the **gateway** with HTTP Basic Auth (`API username:API password`) and `{ amount, gateway: "checkout", currency: "USD", return_url, order_id }`.
3. Buyer is redirected to the **checkout page** `?key=&token=`.
4. Sifalo Pay returns them to `/pay/return?order_id=…&sid=…`.
5. Kart `POST`s the **verify** URL with `{ sid }` (no Basic Auth). Success is `status: "success"` or `code: 601`.
6. Paid orders unlock the delivery note, optional URL, and any private files.

Default **production** hosts (live keys only):

| Role | URL |
|---|---|
| Gateway | `https://api.sifalopay.com/gateway/` |
| Verify | `https://api.sifalopay.com/gateway/verify.php` |
| Checkout | `https://pay.sifalo.com/checkout/` |

**Staging** hosts (staging keys only): `https://spay-api.sifalo.net/gateway/`, `https://pay.sifalo.net/checkout/`. Switch them in `/dashx/payments`. Gateway timeout is 120 seconds. There are no webhooks.

**Who gets paid**

- Platform-wide collection off → each shop uses the keys it pasted in Settings.
- Platform-wide collection on → Kart uses the platform merchant, **except** shops marked **Allow own Sifalo keys** in `/dashx/shops`. Those shops keep (or connect) their own API user.

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
| `/dashx/shops` | Publish / unpublish, allow own Sifalo keys, clear keys |
| `/dashx/orders` | All orders |
| `/dashx/users` | Accounts, last login, signup country, disable |
| `/dashx/access` | Default country, blocked signup countries |
| `/dashx/mail` | SMTP (confirmation, reset, welcome) |
| `/dashx/storage` | S3/R2 credentials |
| `/dashx/payments` | Sifalo Pay hosts + optional platform merchant |

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
