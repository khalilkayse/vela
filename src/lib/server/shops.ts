import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { RESERVED_USERNAMES, type ShopLayout } from "@/lib/constants";
import { initials, usernamePattern } from "@/lib/utils";
import { mapBlock, mapProduct, mapShop, type ShopRow, type ProductRow, type BlockRow } from "./map";

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function assertUsername(username: string) {
  if (!usernamePattern().test(username)) {
    throw new Error("Use 3–24 letters, numbers, or hyphens. Start and end with a letter or number.");
  }
  if (RESERVED_USERNAMES.has(username)) {
    throw new Error("That username is reserved.");
  }
}

export const getMyShop = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<ShopRow>`select * from shops where user_id = ${context.userId} limit 1`;
    return rows[0] ? mapShop(rows[0]) : null;
  });

export const getPublicShop = createServerFn({ method: "GET" })
  .validator((username: string) => normalizeUsername(username))
  .handler(async ({ data: username }) => {
    const sql = await getSql();
    const shops = await sql<ShopRow>`select * from shops where username = ${username} and published = true limit 1`;
    const shopRow = shops[0];
    if (!shopRow) return null;
    const shop = mapShop(shopRow);
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
    return {
      shop,
      products: products.map(mapProduct),
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

export const createShop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { username: string; displayName: string; layout?: string; tagline?: string }) => {
    const username = normalizeUsername(input.username ?? "");
    const displayName = (input.displayName ?? "").trim();
    if (!displayName) throw new Error("Give your shop a name.");
    assertUsername(username);
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
    const sql = await getSql();
    const existing = await sql<{ id: number }>`select id from shops where user_id = ${context.userId} limit 1`;
    if (existing[0]) throw new Error("You already have a shop.");
    const taken = await sql<{ id: number }>`select id from shops where username = ${data.username} limit 1`;
    if (taken[0]) throw new Error("That username is taken.");
    const rows = await sql<ShopRow>`
      insert into shops (user_id, username, display_name, tagline, avatar_initials, layout)
      values (
        ${context.userId},
        ${data.username},
        ${data.displayName},
        ${data.tagline},
        ${initials(data.displayName)},
        ${data.layout}
      )
      returning *
    `;
    return mapShop(rows[0]);
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

    let username = shop.username;
    if (typeof data.username === "string") {
      const next = data.username.trim().toLowerCase();
      if (next !== shop.username) {
        assertUsername(next);
        const taken = await sql<{ id: number }>`
          select id from shops where username = ${next} and user_id <> ${context.userId} limit 1
        `;
        if (taken[0]) throw new Error("That username is taken.");
        username = next;
      }
    }

    const rows = await sql<ShopRow>`
      update shops set
        username = ${username},
        display_name = ${displayName},
        tagline = ${tagline},
        bio = ${bio},
        avatar_initials = ${initials(displayName)},
        layout = ${layout},
        website_url = ${websiteUrl},
        instagram_url = ${instagramUrl},
        x_url = ${xUrl},
        youtube_url = ${youtubeUrl},
        tiktok_url = ${tiktokUrl},
        published = ${published},
        cover_style = ${coverStyle},
        updated_at = now()
      where user_id = ${context.userId}
      returning *
    `;
    return mapShop(rows[0]);
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
