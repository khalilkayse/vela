import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { money } from "@/lib/utils";
import { mapOrder, mapPayout, type OrderRow, type PayoutRow } from "./map";
import { filesForPaidOrder } from "./delivery.server";

/** Paid, real-money orders — excludes legacy demo orders and free claims. */
const REAL_PAID_SQL = "status = 'paid' and demo = false and amount > 0";

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
    const rows = await sql.query<{
      revenue: unknown;
      fees: unknown;
      earnings: unknown;
      balance: unknown;
      order_count: number;
      paid_count: number;
      product_count: number;
    }>(
      `select
        coalesce((select sum(amount) from orders where user_id = $1 and ${REAL_PAID_SQL}), 0) as revenue,
        coalesce((select sum(fee_amount) from orders where user_id = $1 and ${REAL_PAID_SQL}), 0) as fees,
        coalesce((select sum(net_amount) from orders where user_id = $1 and ${REAL_PAID_SQL}), 0) as earnings,
        coalesce((select sum(net_amount) from orders where user_id = $1 and ${REAL_PAID_SQL} and payout_id is null), 0) as balance,
        (select count(*)::int from orders where user_id = $1) as order_count,
        (select count(*)::int from orders where user_id = $1 and status = 'paid' and demo = false) as paid_count,
        (select count(*)::int from products where user_id = $1) as product_count`,
      [context.userId],
    );
    const row = rows[0];
    return {
      revenue: money(row?.revenue),
      fees: money(row?.fees),
      earnings: money(row?.earnings),
      balance: money(row?.balance),
      orderCount: row?.order_count ?? 0,
      paidCount: row?.paid_count ?? 0,
      productCount: row?.product_count ?? 0,
    };
  });

export const listMyPayouts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<PayoutRow>`
      select * from payouts where user_id = ${context.userId}
      order by created_at desc
      limit 100
    `;
    return rows.map(mapPayout);
  });

export const fulfillOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { orderId: number; note?: string }) => ({
    orderId: Number(input.orderId),
    note: (input.note ?? "").trim().slice(0, 1000),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql.query<OrderRow>(
      `update orders set
        fulfilled = true,
        fulfilled_at = coalesce(fulfilled_at, now()),
        fulfillment_note = case when $1 <> '' then $1 else fulfillment_note end
      where id = $2 and user_id = $3 and status = 'paid'
      returning *`,
      [data.note, data.orderId, context.userId],
    );
    if (!rows[0]) throw new Error("Paid order not found.");
    return mapOrder(rows[0]);
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
    const products = await sql<{
      delivery_url: string | null;
      delivery_note: string;
      slug: string;
      kind: string;
      shop_id: number;
    }>`
      select delivery_url, delivery_note, slug, kind, shop_id from products where id = ${order.productId} limit 1
    `;
    const files = order.status === "paid" && !order.demo ? await filesForPaidOrder(orderRef) : [];
    const shops = products[0]
      ? await sql<{ username: string; display_name: string }>`
          select username, display_name from shops where id = ${products[0].shop_id} limit 1
        `
      : [];
    const shop = shops[0] ?? null;
    let readUrl: string | null = null;
    let productUrl: string | null = null;
    if (shop && products[0]) {
      productUrl = `/${shop.username}/${products[0].slug}`;
      if (order.status === "paid" && products[0].kind === "article") {
        readUrl = `${productUrl}?access=${encodeURIComponent(orderRef)}`;
      }
    }
    return {
      order,
      shop: shop ? { username: shop.username, displayName: shop.display_name } : null,
      productUrl,
      delivery:
        order.status === "paid"
          ? {
              url: products[0]?.delivery_url ?? null,
              note: products[0]?.delivery_note ?? "",
              files,
            }
          : null,
      readUrl,
    };
  });
