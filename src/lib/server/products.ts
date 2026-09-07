import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { mapProduct, type ProductRow, type ShopRow } from "./map";

async function requireShop(userId: string) {
  const sql = await getSql();
  const rows = await sql<ShopRow>`select * from shops where user_id = ${userId} limit 1`;
  if (!rows[0]) throw new Error("Create a shop first.");
  return rows[0];
}

function parseKind(value: unknown): "digital" | "service" | "link" {
  if (value === "digital" || value === "service" || value === "link") return value;
  return "digital";
}

export const listMyProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<ProductRow>`
      select * from products where user_id = ${context.userId}
      order by sort_order asc, id desc
    `;
    return rows.map(mapProduct);
  });

export const getMyProduct = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<ProductRow>`
      select * from products where id = ${id} and user_id = ${context.userId} limit 1
    `;
    return rows[0] ? mapProduct(rows[0]) : null;
  });

export const getPublicProduct = createServerFn({ method: "GET" })
  .validator((input: { username: string; slug: string }) => ({
    username: input.username.trim().toLowerCase(),
    slug: input.slug.trim(),
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const shops = await sql<ShopRow>`
      select * from shops where username = ${data.username} and published = true limit 1
    `;
    if (!shops[0]) return null;
    const products = await sql<ProductRow>`
      select * from products
      where shop_id = ${shops[0].id} and slug = ${data.slug} and published = true
      limit 1
    `;
    if (!products[0]) return null;
    return {
      shop: (await import("./map")).mapShop(shops[0]),
      product: mapProduct(products[0]),
    };
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    id?: number;
    title: string;
    description?: string;
    kind?: string;
    price?: number | string;
    coverStyle?: string;
    buttonLabel?: string;
    deliveryNote?: string;
    deliveryUrl?: string;
    published?: boolean;
    featured?: boolean;
    slug?: string;
  }) => {
    const title = (input.title ?? "").trim();
    if (!title) throw new Error("Title is required.");
    const kind = parseKind(input.kind);
    const price = Number(input.price ?? 0);
    if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid price.");
    if (kind !== "link" && price <= 0) throw new Error("Paid products need a price above zero.");
    return {
      id: input.id,
      title: title.slice(0, 80),
      description: (input.description ?? "").trim().slice(0, 2000),
      kind,
      price: kind === "link" ? 0 : Number(price.toFixed(2)),
      coverStyle: (input.coverStyle ?? "mesh-1").slice(0, 24),
      buttonLabel: (input.buttonLabel ?? (kind === "link" ? "Open" : "Buy now")).trim().slice(0, 32),
      deliveryNote: (input.deliveryNote ?? "").trim().slice(0, 400),
      deliveryUrl: (input.deliveryUrl ?? "").trim().slice(0, 500) || null,
      published: input.published !== false,
      featured: Boolean(input.featured),
      slug: (input.slug ? slugify(input.slug) : slugify(title)) || "item",
    };
  })
  .handler(async ({ context, data }) => {
    const shop = await requireShop(context.userId);
    const sql = await getSql();

    const clash = data.id
      ? await sql.query<{ id: number }>(
          "select id from products where shop_id = $1 and slug = $2 and id <> $3 limit 1",
          [shop.id, data.slug, data.id],
        )
      : await sql.query<{ id: number }>(
          "select id from products where shop_id = $1 and slug = $2 limit 1",
          [shop.id, data.slug],
        );
    const slug = clash[0] ? `${data.slug}-${Date.now().toString(36).slice(-4)}` : data.slug;

    if (data.id) {
      const rows = await sql<ProductRow>`
        update products set
          title = ${data.title},
          description = ${data.description},
          kind = ${data.kind},
          price = ${data.price},
          cover_style = ${data.coverStyle},
          button_label = ${data.buttonLabel},
          delivery_note = ${data.deliveryNote},
          delivery_url = ${data.deliveryUrl},
          published = ${data.published},
          featured = ${data.featured},
          slug = ${slug},
          updated_at = now()
        where id = ${data.id} and user_id = ${context.userId}
        returning *
      `;
      if (!rows[0]) throw new Error("Product not found.");
      return mapProduct(rows[0]);
    }

    const count = await sql<{ n: number }>`
      select count(*)::int as n from products where shop_id = ${shop.id}
    `;
    const rows = await sql<ProductRow>`
      insert into products (
        shop_id, user_id, slug, title, description, kind, price,
        cover_style, button_label, delivery_note, delivery_url, published, featured, sort_order
      ) values (
        ${shop.id}, ${context.userId}, ${slug}, ${data.title}, ${data.description},
        ${data.kind}, ${data.price}, ${data.coverStyle}, ${data.buttonLabel},
        ${data.deliveryNote}, ${data.deliveryUrl}, ${data.published}, ${data.featured},
        ${count[0]?.n ?? 0}
      )
      returning *
    `;
    return mapProduct(rows[0]);
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from products where id = ${id} and user_id = ${context.userId}`;
    return { ok: true };
  });
