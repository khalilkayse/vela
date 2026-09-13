# Contributing

This repo is **Kart** — storefronts + Sifalo Pay checkout. Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing code.

## For coding agents

1. **Do not link `/dashx` from merchant or public UI.** It is a hidden owner console. Merchants use `/dashboard`.
2. **Do not rewrite applied migrations.** Add `migrations/0008_….sql` (next integer). `npm start` applies new files.
3. **Do not hand-edit `src/routeTree.gen.ts`.** Adding a file under `src/routes/` is enough; Vite regenerates the tree.
4. **Keep Sifalo Pay logic in `src/lib/sifalo.server.ts`.** Hosts and platform keys are `platform_settings`, edited at `/dashx/payments`. Per-shop `allow_own_sifalo` lets a shop bring its own keys while platform-wide collection stays on. Live keys ↔ `.com` hosts; staging keys ↔ `.net` hosts. Re-read [the hosted checkout docs](https://developer.sifalopay.com/docs/hosted-checkout) if the API moves.
5. **Delivery files stay private.** Upload via `/api/files/upload`. Downloads only through `/api/files/d/$token` after a paid order. No public-read ACL.
6. **Usernames are unique and reserved.** Validate with `RESERVED_USERNAMES` + `usernamePattern()`.
7. **Server functions that touch a shop must use `authMiddleware` and `context.userId`.** Admin functions use `adminMiddleware`. Never trust a client-sent user id.
8. **Match the existing UI.** Tokens in `src/styles.css`, components in `src/components/ui`. No new color language, no emoji-as-icon. Product name is Kart (`APP_NAME` in `src/lib/constants.ts`).
9. **`.server.ts` modules stay off the client.** Shared constants go in `src/lib/constants.ts`. Social catalog (no secrets) is `src/lib/auth/social-catalog.ts`.
10. **Social buttons are env-gated.** Add a provider to `SOCIAL_CATALOG` + `buildSocialProviders()` if Better Auth supports it. Do not render a button unless both client id and secret are set.
11. **Push to `main` on `https://github.com/khalilkayse/vela`** when the change is meant for Dokploy (`shop.sifalo.cloud`).

## Setup

```bash
npm install
cp .env.example .env   # optional locally; PGLite works without DATABASE_URL
npm run dev            # 0.0.0.0:8080
```

Useful scripts: `npm run typecheck`, `npm test`, `npm run db:migrate`, `npm run build`.

## Adding a dashx page

1. Create `src/routes/dashx/your-page.tsx` with `createFileRoute("/dashx/your-page")`.
2. Add a nav item in `src/components/dashx-shell.tsx` (`NAV`).
3. Put mutations in `src/lib/server/admin.ts` behind `adminMiddleware`.
4. Persist config with `writeSettings` in `src/lib/platform-settings.ts`.

## Adding a merchant page

1. File under `src/routes/dashboard/`.
2. Wrap with `DashboardPage` from `dashboard-shell.tsx`.
3. Data in `src/lib/server/*.ts` with `authMiddleware`.
