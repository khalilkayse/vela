import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { makeOrderRef, money } from "@/lib/utils";
import { mapOrder, mapProduct, type OrderRow, type ProductRow, type ShopRow } from "./map";
import {
  sifaloCheckoutUrl,
  sifaloInitiateCheckout,
  sifaloVerify,
  getSifaloPlatformConfig,
  resolveSifaloMerchant,
} from "@/lib/sifalo.server";
import { filesForPaidOrder } from "./files";
import { BRAND_HEX } from "@/lib/constants";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function origin(): string {
  return (process.env.BETTER_AUTH_URL || "https://shop.sifalo.cloud").replace(/\/+$/, "");
}

async function notifyPaidOrder(orderRef: string): Promise<void> {
  try {
    const sql = await getSql();
    const orders = await sql.query<OrderRow & { receipt_sent?: boolean | null }>(
      "select * from orders where order_ref = $1 limit 1",
      [orderRef],
    );
    const orderRow = orders[0];
    if (!orderRow || orderRow.status !== "paid" || orderRow.receipt_sent) return;

    const { sendMail, mailLayout, smtpConfigured, escapeHtml } = await import("@/lib/mail");
    if (!(await smtpConfigured())) {
      await sql.query("update orders set receipt_sent = true where order_ref = $1", [orderRef]);
      return;
    }

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
         <p style="line-height:1.6;color:${BRAND_HEX.muted}">Keep this email — it is your proof of purchase.</p>`,
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
           <p style="line-height:1.6">Reference <strong>${escapeHtml(orderRef)}</strong> · ${escapeHtml(String(order.amount))} ${escapeHtml(order.currency)}${order.demo ? " · demo" : ""}.</p>
           <p style="line-height:1.6">Fulfill it from your Kart dashboard orders page.</p>`,
        ),
      });
    }

    await sql.query("update orders set receipt_sent = true where order_ref = $1", [orderRef]);
  } catch (err) {
    console.warn("[mail] paid-order notice failed:", err);
  }
}

export const startCheckout = createServerFn({ method: "POST" })
  .validator((input: {
    productId: number;
    name: string;
    email: string;
    origin: string;
    acceptedTerms?: boolean;
  }) => {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) throw new Error("Enter your name.");
    if (!validEmail(email)) throw new Error("Enter a valid email.");
    const origin = input.origin.trim();
    if (!/^https?:\/\//.test(origin)) throw new Error("Invalid origin.");
    return {
      productId: input.productId,
      name,
      email,
      origin,
      acceptedTerms: Boolean(input.acceptedTerms),
    };
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
    if ((shopRow.terms ?? "").trim() && !data.acceptedTerms) {
      throw new Error("Please agree to the store terms to continue.");
    }

    const product = mapProduct(productRow);
    const orderRef = makeOrderRef();
    const amount = product.price;
    const isFree = product.kind === "link" || amount <= 0;
    const merchant = await resolveSifaloMerchant(shopRow);
    const demo = !merchant && !isFree;
    const autoFulfill = product.kind !== "service";

    const inserted = await sql<OrderRow>`
      insert into orders (
        shop_id, user_id, product_id, order_ref, product_title,
        customer_name, customer_email, amount, currency, status, demo,
        fulfilled, fulfilled_at
      ) values (
        ${shopRow.id}, ${shopRow.user_id}, ${product.id}, ${orderRef}, ${product.title},
        ${data.name}, ${data.email}, ${amount}, ${product.currency},
        ${isFree ? "paid" : "pending"}, ${demo},
        ${isFree && autoFulfill}, ${isFree && autoFulfill ? new Date() : null}
      )
      returning *
    `;
    const order = mapOrder(inserted[0]);

    if (isFree) {
      await sql`update orders set paid_at = now() where id = ${order.id}`;
      void notifyPaidOrder(orderRef);
      return { mode: "free" as const, orderRef, redirectUrl: `/pay/success/${orderRef}` };
    }

    if (demo) {
      return { mode: "demo" as const, orderRef, redirectUrl: `/pay/demo/${orderRef}` };
    }
    if (!merchant) throw new Error("Sifalo Pay is not configured.");

    const returnUrl = `${data.origin.replace(/\/$/, "")}/pay/return?order_id=${encodeURIComponent(orderRef)}`;
    const config = await getSifaloPlatformConfig();
    const session = await sifaloInitiateCheckout({
      apiKey: merchant.apiKey,
      apiPassword: merchant.apiPassword,
      amount: money(amount).toFixed(2),
      returnUrl,
      orderId: orderRef,
    });
    await sql`
      update orders set sifalo_key = ${session.key} where id = ${order.id}
    `;
    return {
      mode: "sifalo" as const,
      orderRef,
      redirectUrl: sifaloCheckoutUrl(session.key, session.token, config.checkoutPage),
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
      const products = await sql.query<{ kind: string }>("select kind from products where id = $1 limit 1", [
        rows[0].product_id,
      ]);
      const autoFulfill = products[0]?.kind !== "service";
      await sql.query(
        `update orders
         set status = 'paid', paid_at = now(), payment_type = 'DEMO',
             fulfilled = case when $2 then true else fulfilled end,
             fulfilled_at = case when $2 then now() else fulfilled_at end
         where order_ref = $1 and demo = true`,
        [orderRef, autoFulfill],
      );
      void notifyPaidOrder(orderRef);
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

    const products = await sql.query<{ kind: string }>("select kind from products where id = $1 limit 1", [
      orderRow.product_id,
    ]);
    const autoFulfill = success && products[0]?.kind !== "service";

    await sql.query(
      `update orders set
        status = $1,
        sifalo_sid = $2,
        payment_type = $3,
        payer_account = $4,
        paid_at = case when $5 then now() else paid_at end,
        fulfilled = case when $7 then true else fulfilled end,
        fulfilled_at = case when $7 then now() else fulfilled_at end
      where order_ref = $6`,
      [
        success ? "paid" : verified.status === "pending" ? "pending" : "failed",
        verified.sid || data.sid || null,
        verified.payment_type ?? null,
        verified.account ?? null,
        success,
        data.orderId,
        autoFulfill,
      ],
    );

    if (success) void notifyPaidOrder(data.orderId);

    const updated = await sql<OrderRow>`select * from orders where order_ref = ${data.orderId} limit 1`;
    return mapOrder(updated[0]);
  });
