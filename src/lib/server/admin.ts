import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/auth/admin-middleware";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { money, toIso } from "@/lib/utils";
import { mapOrder, mapShop, type OrderRow, type ShopRow } from "./map";

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

type SessionUser = { id: string; email: string | null };

/** Owner access is only the generated /dashx account (plus optional PLATFORM_ADMIN_EMAILS). */
export async function assertPlatformAdmin(user: SessionUser): Promise<void> {
  const sql = await getSql();
  const email = user.email?.trim().toLowerCase() ?? "";
  const allow = adminEmails();

  if (email && allow.has(email)) {
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
      const user = await getSessionUser();
      if (!user || user.id !== context.userId) return false;
      await assertPlatformAdmin(user);
      return true;
    } catch {
      return false;
    }
  });

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
    }>(`
      select
        (select count(*)::int from "user") as users,
        (select count(*)::int from shops) as shops,
        (select count(*)::int from products) as products,
        (select count(*)::int from orders) as orders,
        (select count(*)::int from orders where status = 'paid') as paid,
        coalesce((select sum(amount) from orders where status = 'paid'), 0) as revenue
    `);
    const row = rows[0];
    return {
      users: row?.users ?? 0,
      shops: row?.shops ?? 0,
      products: row?.products ?? 0,
      orders: row?.orders ?? 0,
      paid: row?.paid ?? 0,
      revenue: money(row?.revenue),
    };
  });

export type AdminShop = ReturnType<typeof mapShop> & {
  ownerEmail: string | null;
  ownerName: string | null;
  productCount: number;
  paidCount: number;
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
      }
    >(`
      select s.*,
        u.email as owner_email,
        u.name as owner_name,
        (select count(*)::int from products p where p.shop_id = s.id) as product_count,
        (select count(*)::int from orders o where o.shop_id = s.id and o.status = 'paid') as paid_count
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

export const setShopAllowOwnSifalo = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: { shopId: number; allow: boolean }) => ({
    shopId: Number(input.shopId),
    allow: Boolean(input.allow),
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query("update shops set allow_own_sifalo = $1, updated_at = now() where id = $2", [
      data.allow,
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

export const clearShopSifalo = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((shopId: number) => Number(shopId))
  .handler(async ({ data: shopId }) => {
    const sql = await getSql();
    await sql.query(
      `update shops set sifalo_api_key = null, sifalo_api_password = null, sifalo_connected = false, updated_at = now() where id = $1`,
      [shopId],
    );
    return { ok: true as const };
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
      gatewayUrl: pay.gatewayUrl,
      verifyUrl: pay.verifyUrl,
      checkoutPage: pay.checkoutPage,
      apiKey: pay.apiKey,
      hasPassword: Boolean(pay.apiPassword),
      usePlatformCredentials: pay.usePlatformCredentials,
    };
  });

export const savePaySettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((input: {
    gatewayUrl: string;
    verifyUrl: string;
    checkoutPage: string;
    apiKey: string;
    apiPassword?: string;
    usePlatformCredentials: boolean;
  }) => ({
    gatewayUrl: input.gatewayUrl.trim() || "https://api.sifalopay.com/gateway/",
    verifyUrl: input.verifyUrl.trim() || "https://api.sifalopay.com/gateway/verify.php",
    checkoutPage: input.checkoutPage.trim() || "https://pay.sifalo.com/checkout/",
    apiKey: input.apiKey.trim(),
    apiPassword: input.apiPassword?.trim() ?? "",
    usePlatformCredentials: Boolean(input.usePlatformCredentials),
  }))
  .handler(async ({ data }) => {
    const { writeSettings } = await import("@/lib/platform-settings");
    const { getSifaloPlatformConfig } = await import("@/lib/sifalo.server");
    const current = await getSifaloPlatformConfig();
    await writeSettings({
      sifalo_gateway_url: data.gatewayUrl,
      sifalo_verify_url: data.verifyUrl,
      sifalo_checkout_page: data.checkoutPage,
      sifalo_api_key: data.apiKey,
      sifalo_api_password: data.apiPassword || current.apiPassword,
      sifalo_use_platform: data.usePlatformCredentials ? "1" : "0",
    });
    return { ok: true as const };
  });

export const testPaySettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getSifaloPlatformConfig, sifaloTestCredentials } = await import("@/lib/sifalo.server");
    const pay = await getSifaloPlatformConfig();
    if (!pay.apiKey || !pay.apiPassword) {
      return { ok: false, message: "Save API username and password first." };
    }
    return sifaloTestCredentials(pay.apiKey, pay.apiPassword);
  });
