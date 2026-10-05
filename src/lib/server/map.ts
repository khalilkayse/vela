import type { Order, PageBlock, Product, ProductImage, Shop } from "@/lib/types";
import { money, toIso } from "@/lib/utils";
import { publicMediaPath } from "@/lib/upload";
import type { PayoutMethod, ProductKind, ShopLayout } from "@/lib/constants";

export type ShopRow = {
  id: number;
  user_id: string;
  username: string;
  display_name: string;
  tagline: string;
  bio: string;
  avatar_initials: string;
  avatar_file_id?: number | null;
  cover_style: string;
  layout: string;
  website_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  terms?: string | null;
  contact_email?: string | null;
  payout_method?: string | null;
  payout_account?: string | null;
  payout_name?: string | null;
  published: boolean;
  country?: string | null;
  created_at: unknown;
};

export type ProductRow = {
  id: number;
  shop_id: number;
  user_id: string;
  slug: string;
  title: string;
  description: string;
  body_html?: string | null;
  kind: string;
  price: unknown;
  currency: string;
  cover_style: string;
  cover_file_id?: number | null;
  button_label: string;
  delivery_note: string;
  delivery_url: string | null;
  published: boolean;
  featured: boolean;
  sort_order: number;
  created_at: unknown;
};

export type BlockRow = {
  id: number;
  shop_id: number;
  user_id: string;
  kind: string;
  title: string;
  url: string | null;
  sort_order: number;
  visible: boolean;
};

export type OrderRow = {
  id: number;
  shop_id: number;
  user_id: string;
  product_id: number | null;
  order_ref: string;
  product_title: string;
  customer_name: string;
  customer_email: string;
  amount: unknown;
  fee_amount?: unknown;
  net_amount?: unknown;
  currency: string;
  status: string;
  sifalo_sid: string | null;
  sifalo_env?: string | null;
  payment_type: string | null;
  demo: boolean;
  payout_id?: number | null;
  fulfilled?: boolean | null;
  fulfilled_at?: unknown;
  fulfillment_note?: string | null;
  created_at: unknown;
  paid_at: unknown;
};

export type PayoutRow = {
  id: number;
  shop_id: number;
  user_id: string;
  amount: unknown;
  currency: string;
  method: string;
  account: string;
  reference: string;
  note: string;
  created_by: string;
  created_at: unknown;
};

function asLayout(value: string): ShopLayout {
  if (value === "shop" || value === "links" || value === "hybrid") return value;
  return "hybrid";
}

function asKind(value: string): ProductKind {
  if (value === "digital" || value === "service" || value === "link" || value === "article") {
    return value;
  }
  return "digital";
}

function asPayoutMethod(value: string | null | undefined): PayoutMethod | null {
  if (
    value === "evc" ||
    value === "zaad" ||
    value === "sahal" ||
    value === "edahab" ||
    value === "premier" ||
    value === "bank" ||
    value === "other"
  ) {
    return value;
  }
  return null;
}

export function mapShop(row: ShopRow, extras?: { checkoutLive?: boolean; testMode?: boolean }): Shop {
  const avatarFileId = row.avatar_file_id ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    tagline: row.tagline ?? "",
    bio: row.bio ?? "",
    avatarInitials: row.avatar_initials || "K",
    avatarFileId,
    avatarUrl: avatarFileId ? publicMediaPath(avatarFileId) : null,
    coverStyle: row.cover_style,
    layout: asLayout(row.layout),
    websiteUrl: row.website_url,
    instagramUrl: row.instagram_url,
    xUrl: row.x_url,
    youtubeUrl: row.youtube_url,
    tiktokUrl: row.tiktok_url,
    terms: row.terms ?? "",
    contactEmail: row.contact_email ?? null,
    payoutMethod: asPayoutMethod(row.payout_method),
    payoutAccount: row.payout_account ?? "",
    payoutName: row.payout_name ?? "",
    checkoutLive: Boolean(extras?.checkoutLive),
    testMode: Boolean(extras?.testMode),
    country: row.country ?? null,
    published: Boolean(row.published),
    createdAt: toIso(row.created_at),
  };
}

/** Public-facing shop: drops the owner id and private contact email. */
export function mapPublicShop(row: ShopRow, extras?: { checkoutLive?: boolean; testMode?: boolean }): Shop {
  return { ...mapShop(row, extras), userId: "", contactEmail: null };
}

export function mapProduct(
  row: ProductRow,
  extras?: { gallery?: ProductImage[]; bodyHtml?: string; unlocked?: boolean },
): Product {
  const coverFileId = row.cover_file_id ?? null;
  const kind = asKind(row.kind);
  const price = money(row.price);
  const paywalled = kind === "article" && price > 0;
  const locked = paywalled && extras?.unlocked !== true;
  return {
    id: row.id,
    shopId: row.shop_id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    bodyHtml: locked ? "" : (extras?.bodyHtml ?? ""),
    kind,
    price,
    currency: row.currency || "USD",
    coverStyle: row.cover_style,
    coverFileId,
    coverUrl: coverFileId ? publicMediaPath(coverFileId) : null,
    gallery: extras?.gallery ?? [],
    buttonLabel: row.button_label || (kind === "article" ? "Read" : kind === "link" ? "Open" : "Buy now"),
    deliveryNote: row.delivery_note ?? "",
    deliveryUrl: row.delivery_url,
    published: Boolean(row.published),
    featured: Boolean(row.featured),
    paywalled,
    locked,
    sortOrder: row.sort_order ?? 0,
    createdAt: toIso(row.created_at),
  };
}

/**
 * Public-facing product: a "free link" IS its destination, so it keeps
 * `deliveryUrl`. Every other kind withholds `deliveryUrl`/`deliveryNote` —
 * those unlock only after a paid order (see `getPublicOrder`).
 */
export function mapPublicProduct(
  row: ProductRow,
  extras?: { gallery?: ProductImage[]; bodyHtml?: string; unlocked?: boolean },
): Product {
  const product = mapProduct(row, extras);
  const keepDelivery = product.kind === "link";
  return {
    ...product,
    userId: "",
    deliveryUrl: keepDelivery ? product.deliveryUrl : null,
    deliveryNote: keepDelivery ? product.deliveryNote : "",
  };
}

export function mapBlock(row: BlockRow): PageBlock {
  return {
    id: row.id,
    shopId: row.shop_id,
    userId: row.user_id,
    kind: row.kind === "heading" ? "heading" : "link",
    title: row.title,
    url: row.url,
    sortOrder: row.sort_order ?? 0,
    visible: Boolean(row.visible),
  };
}

function asSifaloEnv(value: string | null | undefined): "sandbox" | "live" | null {
  return value === "sandbox" || value === "live" ? value : null;
}

export function mapOrder(row: OrderRow): Order {
  const status: Order["status"] =
    row.status === "paid" || row.status === "failed" || row.status === "cancelled"
      ? row.status
      : "pending";
  return {
    id: row.id,
    shopId: row.shop_id,
    userId: row.user_id,
    productId: row.product_id,
    orderRef: row.order_ref,
    productTitle: row.product_title,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    amount: money(row.amount),
    feeAmount: money(row.fee_amount),
    netAmount: money(row.net_amount),
    currency: row.currency || "USD",
    status,
    sifaloSid: row.sifalo_sid,
    sifaloEnv: asSifaloEnv(row.sifalo_env),
    paymentType: row.payment_type,
    demo: Boolean(row.demo),
    payoutId: row.payout_id ?? null,
    fulfilled: Boolean(row.fulfilled),
    fulfilledAt: row.fulfilled_at ? toIso(row.fulfilled_at) : null,
    fulfillmentNote: row.fulfillment_note ?? "",
    createdAt: toIso(row.created_at),
    paidAt: row.paid_at ? toIso(row.paid_at) : null,
  };
}

export function mapPayout(row: PayoutRow): import("@/lib/types").Payout {
  return {
    id: row.id,
    shopId: row.shop_id,
    userId: row.user_id,
    amount: money(row.amount),
    currency: row.currency || "USD",
    method: row.method ?? "",
    account: row.account ?? "",
    reference: row.reference ?? "",
    note: row.note ?? "",
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
  };
}

/** Checkout status for the platform-wide Sifalo merchant, used on every shop alike. */
export async function platformCheckoutStatus(): Promise<{ checkoutLive: boolean; testMode: boolean }> {
  const { activeCredentials } = await import("@/lib/sifalo.server");
  const creds = await activeCredentials();
  return { checkoutLive: Boolean(creds), testMode: creds?.env === "sandbox" };
}

export async function decorateShop(row: ShopRow): Promise<Shop> {
  return mapShop(row, await platformCheckoutStatus());
}

export async function decoratePublicShop(row: ShopRow): Promise<Shop> {
  return mapPublicShop(row, await platformCheckoutStatus());
}
