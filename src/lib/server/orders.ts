import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { money } from "@/lib/utils";
import { mapOrder, type OrderRow } from "./map";

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<OrderRow>`
      select * from orders where user_id = ${context.userId}
      order by created_at desc
      limit 100
    `;
    return rows.map(mapOrder);
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      revenue: unknown;
      order_count: number;
      paid_count: number;
      product_count: number;
    }>`
      select
        coalesce((select sum(amount) from orders where user_id = ${context.userId} and status = 'paid'), 0) as revenue,
        (select count(*)::int from orders where user_id = ${context.userId}) as order_count,
        (select count(*)::int from orders where user_id = ${context.userId} and status = 'paid') as paid_count,
        (select count(*)::int from products where user_id = ${context.userId}) as product_count
    `;
    const row = rows[0];
    return {
      revenue: money(row?.revenue),
      orderCount: row?.order_count ?? 0,
      paidCount: row?.paid_count ?? 0,
      productCount: row?.product_count ?? 0,
    };
  });

export const getPublicOrder = createServerFn({ method: "GET" })
  .validator((orderRef: string) => orderRef.trim())
  .handler(async ({ data: orderRef }) => {
    const sql = await getSql();
    const rows = await sql<OrderRow>`
      select * from orders where order_ref = ${orderRef} limit 1
    `;
    if (!rows[0]) return null;
    const order = mapOrder(rows[0]);
    const products = await sql<{ delivery_url: string | null; delivery_note: string; slug: string }>`
      select delivery_url, delivery_note, slug from products where id = ${order.productId} limit 1
    `;
    return {
      order,
      delivery:
        order.status === "paid"
          ? {
              url: products[0]?.delivery_url ?? null,
              note: products[0]?.delivery_note ?? "",
            }
          : null,
    };
  });
