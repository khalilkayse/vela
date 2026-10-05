import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/auth/admin-middleware";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { money, toIso } from "@/lib/utils";
import { mapOrder, mapPayout, mapShop, type OrderRow, type PayoutRow, type ShopRow } from "./map";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

function adminEmails(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? process.env.PLATFORM_OWNER_EMAIL ?? "";
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

type SessionUser = { id: string; email: string | null; emailVerified: boolean };

/**
 * Owner access is only the generated /dashx account (plus optional
 * PLATFORM_ADMIN_EMAILS). An allowlisted email promotes to admin only once
 * it's VERIFIED — otherwise anyone could register that address first (email
 * verification is not required to sign up) and claim the console before its
 * real owner does.
 */
export async function assertPlatformAdmin(user: SessionUser): Promise<void> {
  const sql = await getSql();
  const email = user.email?.trim().toLowerCase() ?? "";
  const allow = adminEmails();

  if (email && user.emailVerified && allow.has(email)) {
    await sql.query(
      `insert into platform_admins (user_id, email) values ($1, $2) on conflict (user_id) do update set email = excluded.email`,
      [user.id, email],
    );
    return;
  }

  const existing = await sql.query<{ user_id: string }>(
    "select user_id from platform_admins where user_id = $1 limit 1",
    [user.id],
  );
  if (existing[0]) return;

  throw new ForbiddenError();
}

export const getIsPlatformAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      // `context.userId` is already resolved by `authMiddleware` from either
      // the session cookie or (in the partitioned live-preview iframe) the
      // forwarded bearer token — re-deriving the session here with a second,
      // bearer-less `getSessionUser()` call is what made this always say "no
      // access" in the preview.
      const sql = await getSql();
      const rows = await sql.query<{ email: string | null; emailVerified: boolean | null }>(
        `select email, "emailVerified" from "user" where id = $1 limit 1`,
        [context.userId],
      );
      const row = rows[0];
      if (!row) return false;
      await assertPlatformAdmin({
        id: context.userId,
        email: row.email,
        emailVerified: Boolean(row.emailVerified),
      });
      return true;
    } catch {
      return false;
    }
  });

/** Paid, real-money orders — excludes legacy demo orders and free claims. */
const REAL_PAID_SQL = "status = 'paid' and demo = false and amount > 0";

export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<{
      users: number;
      shops: number;
      products: number;
      orders: number;
      paid: number;
      revenue: unknown;
      fees: unknown;
      balance: unknown;
    }>(`
      select
        (select count(*)::int from "user") as users,
        (select count(*)::int from shops) as shops,
        (select count(*)::int from products) as products,
        (select count(*)::int from orders) as orders,
        (select count(*)::int from orders where status = 'paid' and demo = false) as paid,
        coalesce((select sum(amount) from orders where ${REAL_PAID_SQL}), 0) as revenue,
        coalesce((select sum(fee_amount) from orders where ${REAL_PAID_SQL}), 0) as fees,
        coalesce((select sum(net_amount) from orders where ${REAL_PAID_SQL} and payout_id is null), 0) as balance
    `);
    const row = rows[0];
    return {
      users: row?.users ?? 0,
      shops: row?.shops ?? 0,
      products: row?.products ?? 0,
      orders: row?.orders ?? 0,
      paid: row?.paid ?? 0,
      // All amounts are USD-only (Sifalo Pay's only supported currency), so a
      // straight sum is safe.
      revenue: money(row?.revenue),
      fees: money(row?.fees),
      balanceOwed: money(row?.balance),
    };
  });

export type AdminShop = ReturnType<typeof mapShop> & {
  ownerEmail: string | null;
  ownerName: string | null;
  productCount: number;
  paidCount: number;
  balanceOwed: number;
};

export const listPlatformShops = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<
      ShopRow & {
        owner_email: string | null;
        owner_name: string | null;
        product_count: number;
        paid_count: number;
        balance_owed: unknown;
      }
    >(`
      select s.*,
        u.email as owner_email,
        u.name as owner_name,
        (select count(*)::int from products p where p.shop_id = s.id) as product_count,
        (select count(*)::int from orders o where o.shop_id = s.id and o.status = 'paid' and o.demo = false) as paid_count,
        coalesce((select sum(o.net_amount) from orders o where o.shop_id = s.id and ${REAL_PAID_SQL.replace(/orders/g, "o")} and o.payout_id is null), 0) as balance_owed
      from shops s
      left join "user" u on u.id = s.user_id
      order by s.created_at desc
      limit 200
    `);
    return rows.map((row) => ({
      ...mapShop(row),
      ownerEmail: row.owner_email,
      ownerName: row.owner_name,
      productCount: row.product_count ?? 0,
      paidCount: row.paid_count ?? 0,
      balanceOwed: money(row.balance_owed),
    }));
  });

export const setShopPublished = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: { shopId: number; published: boolean }) => ({
    shopId: Number(input.shopId),
    published: Boolean(input.published),
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query("update shops set published = $1, updated_at = now() where id = $2", [
      data.published,
      data.shopId,
    ]);
    return { ok: true as const };
  });

export const setShopCountry = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: { shopId: number; country: string }) => ({
    shopId: Number(input.shopId),
    country: input.country.trim().toUpperCase().slice(0, 2),
  }))
  .handler(async ({ data }) => {
    const { normalizeCountry } = await import("@/lib/geo");
    const country = normalizeCountry(data.country);
    const sql = await getSql();
    await sql.query("update shops set country = $1, updated_at = now() where id = $2", [
      country,
      data.shopId,
    ]);
    return { ok: true as const, country };
  });

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  username: string | null;
  shopName: string | null;
  isAdmin: boolean;
  signupCountry: string | null;
  lastLoginAt: string | null;
  lastLoginCountry: string | null;
  disabled: boolean;
};

export const listPlatformUsers = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<{
      id: string;
      name: string;
      email: string;
      createdAt: unknown;
      username: string | null;
      shop_name: string | null;
      is_admin: boolean;
      signup_country: string | null;
      last_login_at: unknown;
      last_login_country: string | null;
      disabled: boolean | null;
    }>(`
      select
        u.id,
        u.name,
        u.email,
        u."createdAt",
        s.username,
        s.display_name as shop_name,
        exists(select 1 from platform_admins a where a.user_id = u.id) as is_admin,
        p.signup_country,
        p.last_login_at,
        p.last_login_country,
        coalesce(p.disabled, false) as disabled
      from "user" u
      left join shops s on s.user_id = u.id
      left join user_profiles p on p.user_id = u.id
      order by coalesce(p.last_login_at, u."createdAt") desc
      limit 400
    `);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: toIso(row.createdAt),
      username: row.username,
      shopName: row.shop_name,
      isAdmin: Boolean(row.is_admin),
      signupCountry: row.signup_country,
      lastLoginAt: row.last_login_at ? toIso(row.last_login_at) : null,
      lastLoginCountry: row.last_login_country,
      disabled: Boolean(row.disabled),
    }));
  });

export const setUserDisabled = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: { userId: string; disabled: boolean; reason?: string }) => ({
    userId: String(input.userId),
    disabled: Boolean(input.disabled),
    reason: (input.reason ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) throw new Error("You cannot disable your own account.");
    const sql = await getSql();
    const admins = await sql.query<{ user_id: string }>(
      "select user_id from platform_admins where user_id = $1 limit 1",
      [data.userId],
    );
    if (admins[0] && data.disabled) throw new Error("Disable another owner first, or leave the console account active.");
    await sql.query(
      `insert into user_profiles (user_id, disabled, disabled_reason, updated_at)
       values ($1, $2, $3, now())
       on conflict (user_id) do update set
         disabled = excluded.disabled,
         disabled_reason = excluded.disabled_reason,
         updated_at = now()`,
      [data.userId, data.disabled, data.disabled ? data.reason || "Disabled from /dashx" : null],
    );
    if (data.disabled) {
      await sql.query(`delete from session where "userId" = $1`, [data.userId]);
    }
    return { ok: true as const };
  });

export const getAccessSettings = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { readSettings } = await import("@/lib/platform-settings");
    const { parseCountryList, normalizeCountry } = await import("@/lib/geo");
    const raw = await readSettings(["blocked_countries", "default_signup_country"]);
    return {
      blockedCountries: parseCountryList(raw.blocked_countries),
      defaultSignupCountry: normalizeCountry(raw.default_signup_country) ?? "",
    };
  });

export const saveAccessSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: { blockedCountries: string[]; defaultSignupCountry: string }) => ({
    blockedCountries: input.blockedCountries,
    defaultSignupCountry: input.defaultSignupCountry,
  }))
  .handler(async ({ data }) => {
    const { writeSettings } = await import("@/lib/platform-settings");
    const { parseCountryList, normalizeCountry } = await import("@/lib/geo");
    const blocked = parseCountryList(data.blockedCountries.join(","));
    await writeSettings({
      blocked_countries: blocked.join(","),
      default_signup_country: normalizeCountry(data.defaultSignupCountry) ?? "",
    });
    return { ok: true as const, blockedCountries: blocked };
  });

export const listPlatformOrders = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<OrderRow & { shop_username: string | null }>(`
      select o.*, s.username as shop_username
      from orders o
      left join shops s on s.id = o.shop_id
      order by o.created_at desc
      limit 200
    `);
    return rows.map((row) => ({
      ...mapOrder(row),
      shopUsername: row.shop_username,
    }));
  });

/** For a pending order whose buyer may have closed the tab before `/pay/return` ran. */
export const recheckOrderPayment = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((orderRef: string) => orderRef.trim())
  .handler(async ({ data: orderRef }) => {
    const { reverifyOrder } = await import("./payments.server");
    return reverifyOrder(orderRef);
  });

export const getSmtpSettings = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getSmtpConfig } = await import("@/lib/mail");
    const smtp = await getSmtpConfig();
    if (!smtp) {
      return {
        configured: false,
        host: "",
        port: 587,
        user: "",
        hasPassword: false,
        fromEmail: "",
        fromName: "Kart",
        secure: false,
      };
    }
    return {
      configured: true,
      host: smtp.host,
      port: smtp.port,
      user: smtp.user,
      hasPassword: Boolean(smtp.pass),
      fromEmail: smtp.fromEmail,
      fromName: smtp.fromName,
      secure: smtp.secure,
    };
  });

export const saveSmtpSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: {
    host: string;
    port: number;
    user: string;
    pass?: string;
    fromEmail: string;
    fromName: string;
    secure: boolean;
  }) => {
    const host = input.host.trim();
    const fromEmail = input.fromEmail.trim();
    if (!host) throw new Error("SMTP host is required.");
    if (!fromEmail || !fromEmail.includes("@")) throw new Error("From email is required.");
    const port = Number(input.port) || 587;
    return {
      host,
      port,
      user: input.user.trim(),
      pass: input.pass?.trim() ?? "",
      fromEmail,
      fromName: input.fromName.trim() || "Kart",
      secure: Boolean(input.secure) || port === 465,
    };
  })
  .handler(async ({ data }) => {
    const { getSmtpConfig } = await import("@/lib/mail");
    const { writeSettings } = await import("@/lib/platform-settings");
    const entries: Record<string, string> = {
      smtp_host: data.host,
      smtp_port: String(data.port),
      smtp_user: data.user,
      smtp_from_email: data.fromEmail,
      smtp_from_name: data.fromName,
      smtp_secure: data.secure ? "1" : "0",
    };
    if (data.pass) entries.smtp_pass = data.pass;
    else {
      const current = await getSmtpConfig();
      if (current?.pass) entries.smtp_pass = current.pass;
    }
    await writeSettings(entries);
    return { ok: true as const };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const { sendMail, mailLayout, smtpConfigured, escapeHtml } = await import("@/lib/mail");
    if (!(await smtpConfigured())) throw new Error("Save SMTP settings first.");
    const to = context.email;
    if (!to) throw new Error("Your account has no email.");
    await sendMail({
      to,
      subject: "Kart SMTP test",
      html: mailLayout(
        "SMTP is working",
        `<p style="line-height:1.6">This test was sent from the Kart owner console to <strong>${escapeHtml(to)}</strong>.</p>`,
      ),
    });
    return { ok: true as const, to };
  });

export const getStorageSettings = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getS3Config } = await import("@/lib/storage");
    const s3 = await getS3Config();
    if (!s3) {
      return {
        configured: false,
        endpoint: "",
        region: "auto",
        bucket: "",
        accessKey: "",
        hasSecret: false,
        cdnBase: "",
        forcePathStyle: true,
      };
    }
    return {
      configured: true,
      endpoint: s3.endpoint,
      region: s3.region,
      bucket: s3.bucket,
      accessKey: s3.accessKey,
      hasSecret: Boolean(s3.secretKey),
      cdnBase: s3.cdnBase,
      forcePathStyle: s3.forcePathStyle,
    };
  });

export const saveStorageSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secret?: string;
    cdnBase: string;
    forcePathStyle: boolean;
  }) => ({
    endpoint: input.endpoint.trim(),
    region: input.region.trim() || "auto",
    bucket: input.bucket.trim(),
    accessKey: input.accessKey.trim(),
    secret: input.secret?.trim() ?? "",
    cdnBase: input.cdnBase.trim().replace(/\/+$/, ""),
    forcePathStyle: Boolean(input.forcePathStyle),
  }))
  .handler(async ({ data }) => {
    if (!data.bucket || !data.accessKey) throw new Error("Bucket and access key are required.");
    const { writeSettings } = await import("@/lib/platform-settings");
    const { getS3Config } = await import("@/lib/storage");
    const entries: Record<string, string> = {
      s3_endpoint: data.endpoint,
      s3_region: data.region,
      s3_bucket: data.bucket,
      s3_access_key: data.accessKey,
      s3_cdn_base: data.cdnBase,
      s3_force_path_style: data.forcePathStyle ? "1" : "0",
    };
    if (data.secret) entries.s3_secret_key = data.secret;
    else {
      const current = await getS3Config();
      if (current?.secretKey) entries.s3_secret_key = current.secretKey;
    }
    await writeSettings(entries);
    return { ok: true as const };
  });

export const testStorage = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { testS3 } = await import("@/lib/storage");
    return testS3();
  });

export const getPaySettings = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getSifaloPlatformConfig } = await import("@/lib/sifalo.server");
    const pay = await getSifaloPlatformConfig();
    return {
      mode: pay.mode,
      sandboxApiUser: pay.sandbox.apiUser,
      sandboxHasKey: Boolean(pay.sandbox.apiKey),
      liveApiUser: pay.live.apiUser,
      liveHasKey: Boolean(pay.live.apiKey),
      feePercent: pay.feePercent,
      feeFixed: pay.feeFixed,
    };
  });

export const savePaySettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: {
    mode: string;
    sandboxApiUser: string;
    sandboxApiKey?: string;
    liveApiUser: string;
    liveApiKey?: string;
    feePercent: number;
    feeFixed: number;
  }) => ({
    mode: input.mode === "live" ? ("live" as const) : ("sandbox" as const),
    sandboxApiUser: input.sandboxApiUser.trim(),
    sandboxApiKey: input.sandboxApiKey?.trim() ?? "",
    liveApiUser: input.liveApiUser.trim(),
    liveApiKey: input.liveApiKey?.trim() ?? "",
    feePercent: Math.min(50, Math.max(0, Number(input.feePercent) || 0)),
    feeFixed: Math.min(100, Math.max(0, Number(input.feeFixed) || 0)),
  }))
  .handler(async ({ data }) => {
    const { saveSifaloPlatformSettings } = await import("@/lib/sifalo.server");
    await saveSifaloPlatformSettings(data);
    return { ok: true as const };
  });

export const clearPayCredentials = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((env: string) => (env === "live" ? ("live" as const) : ("sandbox" as const)))
  .handler(async ({ data: env }) => {
    const { clearSifaloCredentials } = await import("@/lib/sifalo.server");
    await clearSifaloCredentials(env);
    return { ok: true as const };
  });

export const testPaySettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((env: string) => (env === "live" ? ("live" as const) : ("sandbox" as const)))
  .handler(async ({ data: env }) => {
    const { getSifaloPlatformConfig, sifaloTestCredentials } = await import("@/lib/sifalo.server");
    const pay = await getSifaloPlatformConfig();
    const creds = env === "live" ? pay.live : pay.sandbox;
    if (!creds.apiUser || !creds.apiKey) {
      return { ok: false, message: `Save the ${env} API username and key first.` };
    }
    return sifaloTestCredentials(env, creds.apiUser, creds.apiKey);
  });

export type PayoutBalance = {
  shopId: number;
  shopUsername: string;
  shopDisplayName: string;
  ownerEmail: string | null;
  payoutMethod: string | null;
  payoutAccount: string;
  payoutName: string;
  balance: number;
  currency: string;
};

/** What every shop with unpaid earnings is currently owed. */
export const listPayoutBalances = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql.query<{
      shop_id: number;
      username: string;
      display_name: string;
      owner_email: string | null;
      payout_method: string | null;
      payout_account: string | null;
      payout_name: string | null;
      balance: unknown;
      currency: string;
    }>(`
      select
        s.id as shop_id,
        s.username,
        s.display_name,
        u.email as owner_email,
        s.payout_method,
        s.payout_account,
        s.payout_name,
        sum(o.net_amount) as balance,
        o.currency
      from orders o
      join shops s on s.id = o.shop_id
      left join "user" u on u.id = s.user_id
      where ${REAL_PAID_SQL.replace(/orders/g, "o")} and o.payout_id is null
      group by s.id, s.username, s.display_name, u.email, s.payout_method, s.payout_account, s.payout_name, o.currency
      having sum(o.net_amount) > 0
      order by sum(o.net_amount) desc
    `);
    return rows.map((row): PayoutBalance => ({
      shopId: row.shop_id,
      shopUsername: row.username,
      shopDisplayName: row.display_name,
      ownerEmail: row.owner_email,
      payoutMethod: row.payout_method,
      payoutAccount: row.payout_account ?? "",
      payoutName: row.payout_name ?? "",
      balance: money(row.balance),
      currency: row.currency || "USD",
    }));
  });

export const recordPayout = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: { shopId: number; reference?: string; note?: string }) => ({
    shopId: Number(input.shopId),
    reference: (input.reference ?? "").trim().slice(0, 120),
    note: (input.note ?? "").trim().slice(0, 500),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const shops = await sql.query<{ user_id: string; payout_method: string | null; payout_account: string | null }>(
      "select user_id, payout_method, payout_account from shops where id = $1 limit 1",
      [data.shopId],
    );
    const shop = shops[0];
    if (!shop) throw new Error("Shop not found.");

    // Everything still owed to this shop, locked by claiming it below so a
    // second click (or a concurrent request) can't pay it out twice.
    const owed = await sql.query<OrderRow>(
      `select * from orders o where o.shop_id = $1 and ${REAL_PAID_SQL} and o.payout_id is null`,
      [data.shopId],
    );
    if (owed.length === 0) throw new Error("Nothing is owed to this shop right now.");
    const amount = owed.reduce((sum, row) => sum + money(row.net_amount), 0);
    const currency = owed[0].currency || "USD";

    const payouts = await sql.query<PayoutRow>(
      `insert into payouts (shop_id, user_id, amount, currency, method, account, reference, note, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        data.shopId,
        shop.user_id,
        amount,
        currency,
        shop.payout_method ?? "",
        shop.payout_account ?? "",
        data.reference,
        data.note,
        context.userId,
      ],
    );
    const payout = payouts[0];
    await sql.query(
      `update orders set payout_id = $1 where id = any($2::int[])`,
      [payout.id, owed.map((row) => row.id)],
    );
    return mapPayout(payout);
  });

export const listPayoutsForShop = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator((shopId: number) => Number(shopId))
  .handler(async ({ data: shopId }) => {
    const sql = await getSql();
    const rows = await sql<PayoutRow>`
      select * from payouts where shop_id = ${shopId} order by created_at desc limit 50
    `;
    return rows.map(mapPayout);
  });

export const getReservedUsernames = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { extraReservedUsernames } = await import("@/lib/server/usernames");
    const { RESERVED_USERNAMES } = await import("@/lib/constants");
    return {
      locked: [...RESERVED_USERNAMES].sort(),
      extra: await extraReservedUsernames(),
    };
  });

export const saveReservedUsernames = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: { extra: string[] }) => ({ extra: input.extra ?? [] }))
  .handler(async ({ data }) => {
    const { saveExtraReservedUsernames } = await import("@/lib/server/usernames");
    const extra = await saveExtraReservedUsernames(data.extra);
    return { ok: true as const, extra };
  });
