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

  if (allow.size === 0 && email) {
    const any = await sql.query<{ n: number }>("select count(*)::int as n from platform_admins");
    if ((any[0]?.n ?? 0) === 0) {
      await sql.query("insert into platform_admins (user_id, email) values ($1, $2)", [
        user.id,
        email,
      ]);
      return;
    }
  }

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

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  username: string | null;
  shopName: string | null;
  isAdmin: boolean;
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
    }>(`
      select
        u.id,
        u.name,
        u.email,
        u."createdAt",
        s.username,
        s.display_name as shop_name,
        exists(select 1 from platform_admins a where a.user_id = u.id) as is_admin
      from "user" u
      left join shops s on s.user_id = u.id
      order by u."createdAt" desc
      limit 200
    `);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: toIso(row.createdAt),
      username: row.username,
      shopName: row.shop_name,
      isAdmin: Boolean(row.is_admin),
    }));
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
