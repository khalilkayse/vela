import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { BRAND_HEX, type ShopLayout } from "@/lib/constants";
import { initials } from "@/lib/utils";
import {
  assertUsername,
  normalizeUsername,
  USERNAME_FORMAT,
  USERNAME_UNAVAILABLE,
  usernameFormatOk,
} from "@/lib/server/usernames";
import {
  decorateShop,
  mapBlock,
  mapProduct,
  mapShop,
  type ShopRow,
  type ProductRow,
  type BlockRow,
} from "./map";
import { publicMediaPath } from "@/lib/upload";

export const getMyShop = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<ShopRow>`select * from shops where user_id = ${context.userId} limit 1`;
    return rows[0] ? decorateShop(rows[0]) : null;
  });

async function productGallery(productId: number) {
  const sql = await getSql();
  const rows = await sql.query<{ id: number }>(
    `select id from product_files where product_id = $1 and kind = 'gallery' order by id asc`,
    [productId],
  );
  return rows.map((row) => ({ id: row.id, url: publicMediaPath(row.id) }));
}

export const getPublicShop = createServerFn({ method: "GET" })
  .validator((username: string) => normalizeUsername(username))
  .handler(async ({ data: username }) => {
    const sql = await getSql();
    const shops = await sql<ShopRow>`select * from shops where username = ${username} and published = true limit 1`;
    const shopRow = shops[0];
    if (!shopRow) return null;
    const shop = await decorateShop(shopRow);
    const products = await sql<ProductRow>`
      select * from products
      where shop_id = ${shop.id} and published = true
      order by sort_order asc, id asc
    `;
    const blocks = await sql<BlockRow>`
      select * from page_blocks
      where shop_id = ${shop.id} and visible = true
      order by sort_order asc, id asc
    `;
    const mapped = [];
    for (const row of products) {
      mapped.push(mapProduct(row, { gallery: await productGallery(row.id) }));
    }
    return {
      shop,
      products: mapped,
      blocks: blocks.map(mapBlock),
    };
  });

export const listPublishedShops = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<ShopRow>`
    select * from shops where published = true order by created_at desc limit 24
  `;
  return rows.map((row) => mapShop(row));
});

export const usernameAvailable = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((username: string) => normalizeUsername(username))
  .handler(async ({ context, data: username }) => {
    if (!username) return { ok: false as const, reason: "Choose a username." };
    if (!usernameFormatOk(username)) {
      return { ok: false as const, reason: USERNAME_FORMAT };
    }
    try {
      await assertUsername(username);
    } catch {
      return { ok: false as const, reason: USERNAME_UNAVAILABLE };
    }
    const sql = await getSql();
    const taken = await sql<{ id: number; user_id: string }>`
      select id, user_id from shops where username = ${username} limit 1
    `;
    if (taken[0] && taken[0].user_id !== context.userId) {
      return { ok: false as const, reason: USERNAME_UNAVAILABLE };
    }
    return { ok: true as const, reason: "This username is available." };
  });

export const createShop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { username: string; displayName: string; layout?: string; tagline?: string }) => {
    const username = normalizeUsername(input.username ?? "");
    const displayName = (input.displayName ?? "").trim();
    if (!displayName) throw new Error("Give your shop a name.");
    const layout: ShopLayout =
      input.layout === "shop" || input.layout === "links" || input.layout === "hybrid"
        ? input.layout
        : "hybrid";
    return {
      username,
      displayName,
      layout,
      tagline: (input.tagline ?? "").trim().slice(0, 120),
    };
  })
  .handler(async ({ context, data }) => {
    await assertUsername(data.username);
    const sql = await getSql();
    const existing = await sql<{ id: number }>`select id from shops where user_id = ${context.userId} limit 1`;
    if (existing[0]) throw new Error("You already have a shop.");
    const taken = await sql<{ id: number }>`select id from shops where username = ${data.username} limit 1`;
    if (taken[0]) throw new Error(USERNAME_UNAVAILABLE);
    const { signupCountryFor } = await import("./profiles");
    const country = await signupCountryFor(context.userId);
    const rows = await sql<ShopRow>`
      insert into shops (user_id, username, display_name, tagline, avatar_initials, layout, country)
      values (
        ${context.userId},
        ${data.username},
        ${data.displayName},
        ${data.tagline},
        ${initials(data.displayName)},
        ${data.layout},
        ${country}
      )
      returning *
    `;
    const shop = await decorateShop(rows[0]);
    void sendShopWelcome(context.userId, shop.username, shop.displayName);
    return shop;
  });

export const updateShop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Record<string, unknown>) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const current = await sql<ShopRow>`select * from shops where user_id = ${context.userId} limit 1`;
    if (!current[0]) throw new Error("Create a shop first.");
    const shop = current[0];

    const displayName =
      typeof data.displayName === "string" && data.displayName.trim()
        ? data.displayName.trim().slice(0, 80)
        : shop.display_name;
    const tagline = typeof data.tagline === "string" ? data.tagline.trim().slice(0, 120) : shop.tagline;
    const bio = typeof data.bio === "string" ? data.bio.trim().slice(0, 600) : shop.bio;
    const terms = typeof data.terms === "string" ? data.terms.trim().slice(0, 8000) : (shop.terms ?? "");
    const contactEmail =
      typeof data.contactEmail === "string"
        ? emptyToNull(data.contactEmail)
        : shop.contact_email ?? null;
    const layout =
      data.layout === "shop" || data.layout === "links" || data.layout === "hybrid"
        ? data.layout
        : shop.layout;
    const websiteUrl = typeof data.websiteUrl === "string" ? emptyToNull(data.websiteUrl) : shop.website_url;
    const instagramUrl =
      typeof data.instagramUrl === "string" ? emptyToNull(data.instagramUrl) : shop.instagram_url;
    const xUrl = typeof data.xUrl === "string" ? emptyToNull(data.xUrl) : shop.x_url;
    const youtubeUrl = typeof data.youtubeUrl === "string" ? emptyToNull(data.youtubeUrl) : shop.youtube_url;
    const tiktokUrl = typeof data.tiktokUrl === "string" ? emptyToNull(data.tiktokUrl) : shop.tiktok_url;
    const published = typeof data.published === "boolean" ? data.published : shop.published;
    const coverStyle = typeof data.coverStyle === "string" ? data.coverStyle : shop.cover_style;
    const country =
      typeof data.country === "string"
        ? (data.country.trim().toUpperCase().slice(0, 2) || null)
        : shop.country;

    let username = shop.username;
    if (typeof data.username === "string") {
      const next = normalizeUsername(data.username);
      if (next !== shop.username) {
        await assertUsername(next);
        const taken = await sql<{ id: number }>`
          select id from shops where username = ${next} and user_id <> ${context.userId} limit 1
        `;
        if (taken[0]) throw new Error(USERNAME_UNAVAILABLE);
        username = next;
      }
    }

    const rows = await sql<ShopRow>`
      update shops set
        username = ${username},
        display_name = ${displayName},
        tagline = ${tagline},
        bio = ${bio},
        terms = ${terms},
        contact_email = ${contactEmail},
        avatar_initials = ${initials(displayName)},
        layout = ${layout},
        website_url = ${websiteUrl},
        instagram_url = ${instagramUrl},
        x_url = ${xUrl},
        youtube_url = ${youtubeUrl},
        tiktok_url = ${tiktokUrl},
        published = ${published},
        cover_style = ${coverStyle},
        country = ${country},
        updated_at = now()
      where user_id = ${context.userId}
      returning *
    `;
    return decorateShop(rows[0]);
  });

export const saveSifaloCredentials = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { apiKey: string; apiPassword: string }) => {
    const apiKey = input.apiKey.trim();
    const apiPassword = input.apiPassword.trim();
    if (!apiKey || !apiPassword) throw new Error("Both API username and password are required.");
    return { apiKey, apiPassword };
  })
  .handler(async ({ context, data }) => {
    const { sifaloTestCredentials } = await import("@/lib/sifalo.server");
    const test = await sifaloTestCredentials(data.apiKey, data.apiPassword);
    const sql = await getSql();
    const shops = await sql<{ id: number }>`select id from shops where user_id = ${context.userId} limit 1`;
    if (!shops[0]) throw new Error("Create a shop first.");
    const policy = await shopPayPolicy(context.userId);
    if (!policy.canConnectOwnKeys) {
      throw new Error("This shop is not allowed to connect its own Sifalo Pay keys.");
    }
    await sql`
      update shops set
        sifalo_api_key = ${data.apiKey},
        sifalo_api_password = ${data.apiPassword},
        sifalo_connected = ${test.ok},
        updated_at = now()
      where user_id = ${context.userId}
    `;
    return test;
  });

export const disconnectSifalo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      update shops set
        sifalo_api_key = null,
        sifalo_api_password = null,
        sifalo_connected = false,
        updated_at = now()
      where user_id = ${context.userId}
    `;
    return { ok: true };
  });

function emptyToNull(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}

async function shopPayPolicy(userId: string) {
  const { getSifaloPlatformConfig } = await import("@/lib/sifalo.server");
  const platform = await getSifaloPlatformConfig();
  const sql = await getSql();
  const shops = await sql<{ allow_own_sifalo: boolean | null }>`
    select allow_own_sifalo from shops where user_id = ${userId} limit 1
  `;
  const allowOwnKeys = Boolean(shops[0]?.allow_own_sifalo);
  const platformCollects = platform.usePlatformCredentials && Boolean(platform.apiKey);
  return {
    platformCollects,
    allowOwnKeys,
    canConnectOwnKeys: !platformCollects || allowOwnKeys,
  };
}

export const getMyPayPolicy = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => shopPayPolicy(context.userId));

async function sendShopWelcome(userId: string, username: string, displayName: string) {
  try {
    const { sendMail, mailLayout, smtpConfigured, escapeHtml } = await import("@/lib/mail");
    if (!(await smtpConfigured())) return;
    const sql = await getSql();
    const users = await sql.query<{ email: string }>(`select email from "user" where id = $1 limit 1`, [userId]);
    const email = users[0]?.email;
    if (!email) return;
    const origin = (process.env.BETTER_AUTH_URL || "https://shop.sifalo.cloud").replace(/\/+$/, "");
    const url = `${origin}/${username}`;
    await sendMail({
      to: email,
      subject: `Your Kart page is live: ${username}`,
      html: mailLayout(
        "Your shop is ready",
        `<p style="line-height:1.6">${escapeHtml(displayName)} is on Kart. Share this link:</p>
         <p><a href="${escapeHtml(url)}" style="color:${BRAND_HEX.primary}">${escapeHtml(url)}</a></p>
         <p style="line-height:1.6;color:${BRAND_HEX.muted}">Connect Sifalo Pay in settings when you want live checkout. Get keys at sifalopay.com.</p>`,
      ),
    });
  } catch (err) {
    console.warn("[mail] welcome email failed:", err);
  }
}
