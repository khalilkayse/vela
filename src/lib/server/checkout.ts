import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { makeOrderRef, money } from "@/lib/utils";
import { mapOrder, mapProduct, mapShop, type OrderRow, type ProductRow, type ShopRow } from "./map";
import {
  sifaloCheckoutUrl,
  sifaloInitiateCheckout,
  sifaloVerify,
} from "@/lib/sifalo.server";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const startCheckout = createServerFn({ method: "POST" })
  .validator((input: { productId: number; name: string; email: string; origin: string }) => {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) throw new Error("Enter your name.");
    if (!validEmail(email)) throw new Error("Enter a valid email.");
    const origin = input.origin.trim();
    if (!/^https?:\/\//.test(origin)) throw new Error("Invalid origin.");
    return { productId: input.productId, name, email, origin };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    const products = await sql<ProductRow>`
      select * from products where id = ${data.productId} and published = true limit 1
    `;
    const productRow = products[0];
    if (!productRow) throw new Error("This product is no longer available.");
    const shops = await sql<ShopRow>`
      select * from shops where id = ${productRow.shop_id} and published = true limit 1
    `;
    const shopRow = shops[0];
    if (!shopRow) throw new Error("This shop is unavailable.");

    const product = mapProduct(productRow);
    const shop = mapShop(shopRow);
    const orderRef = makeOrderRef();
    const amount = product.price;
    const isFree = product.kind === "link" || amount <= 0;
    const hasCredentials = Boolean(shopRow.sifalo_api_key && shopRow.sifalo_api_password);
    const demo = !hasCredentials && !isFree;

    const inserted = await sql<OrderRow>`
      insert into orders (
        shop_id, user_id, product_id, order_ref, product_title,
        customer_name, customer_email, amount, currency, status, demo
      ) values (
        ${shop.id}, ${shop.userId}, ${product.id}, ${orderRef}, ${product.title},
        ${data.name}, ${data.email}, ${amount}, ${product.currency},
        ${isFree ? "paid" : "pending"}, ${demo}
      )
      returning *
    `;
    const order = mapOrder(inserted[0]);

    if (isFree) {
      await sql`update orders set paid_at = now() where id = ${order.id}`;
      return { mode: "free" as const, orderRef, redirectUrl: `/pay/success/${orderRef}` };
    }

    if (demo) {
      return { mode: "demo" as const, orderRef, redirectUrl: `/pay/demo/${orderRef}` };
    }

    const returnUrl = `${data.origin.replace(/\/$/, "")}/pay/return?order_id=${encodeURIComponent(orderRef)}`;
    const session = await sifaloInitiateCheckout({
      apiKey: shopRow.sifalo_api_key as string,
      apiPassword: shopRow.sifalo_api_password as string,
      amount: money(amount).toFixed(2),
      returnUrl,
    });
    await sql`
      update orders set sifalo_key = ${session.key} where id = ${order.id}
    `;
    return {
      mode: "sifalo" as const,
      orderRef,
      redirectUrl: sifaloCheckoutUrl(session.key, session.token),
    };
  });

export const completeDemoPayment = createServerFn({ method: "POST" })
  .validator((orderRef: string) => orderRef.trim())
  .handler(async ({ data: orderRef }) => {
    const sql = await getSql();
    const rows = await sql<OrderRow>`
      select * from orders where order_ref = ${orderRef} limit 1
    `;
    if (!rows[0]) throw new Error("Order not found.");
    if (!rows[0].demo) throw new Error("This order is not a demo checkout.");
    if (rows[0].status !== "paid") {
      await sql`
        update orders
        set status = 'paid', paid_at = now(), payment_type = 'DEMO'
        where order_ref = ${orderRef} and demo = true
      `;
    }
    return { orderRef };
  });

export const finalizeSifaloReturn = createServerFn({ method: "POST" })
  .validator((input: { orderId: string; sid?: string }) => ({
    orderId: input.orderId.trim(),
    sid: input.sid?.trim() || undefined,
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<OrderRow>`
      select * from orders where order_ref = ${data.orderId} limit 1
    `;
    const orderRow = rows[0];
    if (!orderRow) throw new Error("Order not found.");
    if (orderRow.status === "paid") return mapOrder(orderRow);

    const verified = await sifaloVerify({
      sid: data.sid,
      orderId: data.orderId,
    });
    const success =
      verified.status === "success" || verified.status === "paid" || verified.code === 601;

    await sql.query(
      `update orders set
        status = $1,
        sifalo_sid = $2,
        payment_type = $3,
        payer_account = $4,
        paid_at = case when $5 then now() else paid_at end
      where order_ref = $6`,
      [
        success ? "paid" : verified.status === "pending" ? "pending" : "failed",
        verified.sid || data.sid || null,
        verified.payment_type ?? null,
        verified.account ?? null,
        success,
        data.orderId,
      ],
    );

    const updated = await sql<OrderRow>`select * from orders where order_ref = ${data.orderId} limit 1`;
    return mapOrder(updated[0]);
  });
