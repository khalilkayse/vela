import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { computeFee } from "@/lib/fees";
import { makeOrderRef, money } from "@/lib/utils";
import { mapOrder, mapProduct, type OrderRow, type ProductRow, type ShopRow } from "./map";
import {
  activeCredentials,
  getSifaloPlatformConfig,
  sifaloCheckoutUrl,
  sifaloInitiateCheckout,
} from "@/lib/sifalo.server";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
    const autoFulfill = product.kind !== "service";

    let sifaloEnv: "sandbox" | "live" | null = null;
    let fee = 0;
    let net = amount;
    let credentials: { env: "sandbox" | "live"; apiUser: string; apiKey: string } | null = null;
    if (!isFree) {
      credentials = await activeCredentials();
      if (!credentials) throw new Error("Checkout isn't open yet. Please try again shortly.");
      const config = await getSifaloPlatformConfig();
      ({ fee, net } = computeFee(amount, config.feePercent, config.feeFixed));
      sifaloEnv = credentials.env;
    } else {
      fee = 0;
      net = 0;
    }

    const inserted = await sql<OrderRow>`
      insert into orders (
        shop_id, user_id, product_id, order_ref, product_title,
        customer_name, customer_email, amount, fee_amount, net_amount, currency, status,
        sifalo_env, fulfilled, fulfilled_at
      ) values (
        ${shopRow.id}, ${shopRow.user_id}, ${product.id}, ${orderRef}, ${product.title},
        ${data.name}, ${data.email}, ${amount}, ${fee}, ${net}, ${product.currency},
        ${isFree ? "paid" : "pending"},
        ${sifaloEnv}, ${isFree && autoFulfill}, ${isFree && autoFulfill ? new Date() : null}
      )
      returning *
    `;
    const order = mapOrder(inserted[0]);

    if (isFree) {
      await sql`update orders set paid_at = now() where id = ${order.id}`;
      const { notifyPaidOrder } = await import("./payments.server");
      void notifyPaidOrder(orderRef);
      return { mode: "free" as const, orderRef, redirectUrl: `/pay/success/${orderRef}` };
    }

    const merchant = credentials!;
    const returnUrl = `${data.origin.replace(/\/$/, "")}/pay/return?order_id=${encodeURIComponent(orderRef)}`;
    const session = await sifaloInitiateCheckout({
      env: merchant.env,
      apiUser: merchant.apiUser,
      apiKey: merchant.apiKey,
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
      redirectUrl: sifaloCheckoutUrl(merchant.env, session.key, session.token),
    };
  });

export const finalizeSifaloReturn = createServerFn({ method: "POST" })
  .validator((input: { orderId: string; sid?: string }) => ({
    orderId: input.orderId.trim(),
    sid: input.sid?.trim() || undefined,
  }))
  .handler(async ({ data }) => {
    const { reverifyOrder } = await import("./payments.server");
    return reverifyOrder(data.orderId, data.sid);
  });
