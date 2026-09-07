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

React 19, TanStack Start, Tailwind v4, Better Auth, Postgres (Neon in production, PGLite in local preview).

## Local development

```bash
npm install
npm run dev
```

The app listens on port 8080. Auth and a local database work without extra env files in this workspace.

Production needs `DATABASE_URL` (Postgres). Auth credentials are injected by the host; email/password is also enabled.

```bash
npm run build
npm run typecheck
```

## License

Private product of [Sifalo](https://www.sifalo.com).
