/**
 * Payment side-effects that run outside a `createServerFn().handler()` body —
 * kept in a `.server.ts` module (TanStack Start's own-import-protection
 * convention, see delivery.server.ts / sifalo.server.ts) so this never gets
 * pulled into the client bundle just because `checkout.ts` or `admin.ts`
 * (both imported by client routes) call into it.
 */
import { getSql } from "@/lib/db";
import { isVerifiedFailed, isVerifiedPaid } from "@/lib/fees";
import { sifaloVerify } from "@/lib/sifalo.server";
import { BRAND_HEX } from "@/lib/constants";
import { filesForPaidOrder } from "./delivery.server";
import { mapOrder, type OrderRow, type ProductRow, type ShopRow } from "./map";
import type { Order } from "@/lib/types";

function origin(): string {
  return (process.env.BETTER_AUTH_URL || "https://shop.sifalo.cloud").replace(/\/+$/, "");
}

/** `23505` is Postgres's unique_violation — here, a Sifalo sid already used by another order. */
function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: string }).code === "23505");
}

export async function notifyPaidOrder(orderRef: string): Promise<void> {
  try {
    const sql = await getSql();
    const orders = await sql.query<OrderRow & { receipt_sent?: boolean | null }>(
      "select * from orders where order_ref = $1 limit 1",
      [orderRef],
    );
    const orderRow = orders[0];
    if (!orderRow || orderRow.status !== "paid") return;

    const { sendMail, mailLayout, smtpConfigured, escapeHtml } = await import("@/lib/mail");
    if (!(await smtpConfigured())) return;

    // Claim the send atomically so two concurrent finalize calls (a refresh, a
    // double effect) can't both pass the `receipt_sent` check and send twice.
    const claimed = await sql.query<{ id: number }>(
      "update orders set receipt_sent = true where order_ref = $1 and receipt_sent = false returning id",
      [orderRef],
    );
    if (!claimed[0]) return;

    const shops = await sql.query<ShopRow>("select * from shops where id = $1 limit 1", [orderRow.shop_id]);
    const shop = shops[0];
    const products = await sql.query<ProductRow>("select * from products where id = $1 limit 1", [
      orderRow.product_id,
    ]);
    const product = products[0];
    const owners = await sql.query<{ email: string }>(`select email from "user" where id = $1 limit 1`, [
      orderRow.user_id,
    ]);
    const files = await filesForPaidOrder(orderRef);
    const order = mapOrder(orderRow);
    const site = origin();
    const successUrl = `${site}/pay/success/${encodeURIComponent(orderRef)}`;

    const deliveryBits: string[] = [];
    if (product?.kind === "article" && shop) {
      const readUrl = `${site}/${shop.username}/${product.slug}?access=${encodeURIComponent(orderRef)}`;
      deliveryBits.push(
        `<p style="line-height:1.6">Read it here (this link is your access): <a href="${escapeHtml(readUrl)}" style="color:${BRAND_HEX.primary}">${escapeHtml(readUrl)}</a></p>`,
      );
    }
    if (product?.delivery_note) {
      deliveryBits.push(`<p style="line-height:1.6">${escapeHtml(product.delivery_note)}</p>`);
    }
    if (product?.delivery_url) {
      deliveryBits.push(
        `<p><a href="${escapeHtml(product.delivery_url)}" style="color:${BRAND_HEX.primary}">Open delivery</a></p>`,
      );
    }
    for (const file of files) {
      deliveryBits.push(
        `<p><a href="${escapeHtml(site + file.url)}" style="color:${BRAND_HEX.primary}">Download ${escapeHtml(file.name)}</a></p>`,
      );
    }

    await sendMail({
      to: order.customerEmail,
      subject: `Your order from ${shop?.display_name ?? "Kart"} · ${order.productTitle}`,
      html: mailLayout(
        "Thanks for your order",
        `<p style="line-height:1.6">Hi ${escapeHtml(order.customerName)}, ${escapeHtml(shop?.display_name ?? "the seller")} confirmed ${escapeHtml(order.productTitle)}.</p>
         <p style="line-height:1.6">Reference <strong>${escapeHtml(orderRef)}</strong> · ${escapeHtml(String(order.amount))} ${escapeHtml(order.currency)}</p>
         ${deliveryBits.join("") || `<p style="line-height:1.6">Open your receipt: <a href="${escapeHtml(successUrl)}" style="color:${BRAND_HEX.primary}">${escapeHtml(successUrl)}</a></p>`}
         <p style="line-height:1.6;color:${BRAND_HEX.muted}">Keep this link — it is your proof of purchase: ${escapeHtml(successUrl)}</p>`,
      ),
    });

    const merchantTo = (shop?.contact_email || owners[0]?.email || "").trim();
    if (merchantTo) {
      await sendMail({
        to: merchantTo,
        subject: `New Kart order · ${order.productTitle}`,
        html: mailLayout(
          "You made a sale",
          `<p style="line-height:1.6">${escapeHtml(order.customerName)} (${escapeHtml(order.customerEmail)}) bought ${escapeHtml(order.productTitle)}.</p>
           <p style="line-height:1.6">Reference <strong>${escapeHtml(orderRef)}</strong> · ${escapeHtml(String(order.amount))} ${escapeHtml(order.currency)} · you earn ${escapeHtml(String(order.netAmount))} ${escapeHtml(order.currency)} after the Kart fee${order.sifaloEnv === "sandbox" ? " · TEST" : ""}.</p>
           <p style="line-height:1.6">Fulfill it from your Kart dashboard orders page.</p>`,
        ),
      });
    }
  } catch (err) {
    console.warn("[mail] paid-order notice failed:", err);
  }
}

/**
 * Shared by the public return route and the admin "re-check payment" action.
 * Idempotent: a second call on an already-paid order is a no-op.
 */
export async function reverifyOrder(orderId: string, sid?: string): Promise<Order> {
  const sql = await getSql();
  const rows = await sql<OrderRow>`
    select * from orders where order_ref = ${orderId} limit 1
  `;
  const orderRow = rows[0];
  if (!orderRow) throw new Error("Order not found.");
  if (orderRow.status === "paid") return mapOrder(orderRow);
  if (!orderRow.sifalo_env) throw new Error("This order has no payment session to verify.");

  const verified = await sifaloVerify({
    env: orderRow.sifalo_env === "live" ? "live" : "sandbox",
    sid,
    orderId,
  });
  const order = mapOrder(orderRow);
  const success = isVerifiedPaid(verified, { amount: order.amount, currency: order.currency });
  const failed = !success && isVerifiedFailed(verified);

  const products = await sql.query<{ kind: string }>("select kind from products where id = $1 limit 1", [
    orderRow.product_id,
  ]);
  const autoFulfill = success && products[0]?.kind !== "service";
  const nextStatus = success ? "paid" : failed ? "failed" : "pending";

  try {
    await sql.query(
      `update orders set
        status = $1,
        sifalo_sid = coalesce($2, sifalo_sid),
        payment_type = $3,
        payer_account = $4,
        paid_at = case when $5 then now() else paid_at end,
        fulfilled = case when $6 then true else fulfilled end,
        fulfilled_at = case when $6 then now() else fulfilled_at end
      where order_ref = $7 and status <> 'paid'`,
      [
        nextStatus,
        verified.sid || sid || null,
        verified.payment_type ?? null,
        verified.account ?? null,
        success,
        autoFulfill,
        orderId,
      ],
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error("This payment reference has already been used for a different order.");
    }
    throw err;
  }

  if (success) void notifyPaidOrder(orderId);

  const updated = await sql<OrderRow>`select * from orders where order_ref = ${orderId} limit 1`;
  return mapOrder(updated[0]);
}
