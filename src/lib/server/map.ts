import type { Order, PageBlock, Product, Shop } from "@/lib/types";
import { money, toIso } from "@/lib/utils";
import type { ProductKind, ShopLayout } from "@/lib/constants";

export type ShopRow = {
  id: number;
  user_id: string;
  username: string;
  display_name: string;
  tagline: string;
  bio: string;
  avatar_initials: string;
  cover_style: string;
  layout: string;
  website_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  sifalo_api_key: string | null;
  sifalo_api_password: string | null;
  sifalo_connected: boolean;
  published: boolean;
  created_at: unknown;
};

export type ProductRow = {
  id: number;
  shop_id: number;
  user_id: string;
  slug: string;
  title: string;
  description: string;
  kind: string;
  price: unknown;
  currency: string;
  cover_style: string;
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
  currency: string;
  status: string;
  sifalo_sid: string | null;
  payment_type: string | null;
  demo: boolean;
  created_at: unknown;
  paid_at: unknown;
};

function asLayout(value: string): ShopLayout {
  if (value === "shop" || value === "links" || value === "hybrid") return value;
  return "hybrid";
}

function asKind(value: string): ProductKind {
  if (value === "digital" || value === "service" || value === "link") return value;
  return "digital";
}

export function mapShop(row: ShopRow): Shop {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    tagline: row.tagline ?? "",
    bio: row.bio ?? "",
    avatarInitials: row.avatar_initials || "V",
    coverStyle: row.cover_style,
    layout: asLayout(row.layout),
    websiteUrl: row.website_url,
    instagramUrl: row.instagram_url,
    xUrl: row.x_url,
    youtubeUrl: row.youtube_url,
    tiktokUrl: row.tiktok_url,
    sifaloConnected: Boolean(row.sifalo_connected),
    hasSifaloCredentials: Boolean(row.sifalo_api_key && row.sifalo_api_password),
    published: Boolean(row.published),
    createdAt: toIso(row.created_at),
  };
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    shopId: row.shop_id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    kind: asKind(row.kind),
    price: money(row.price),
    currency: row.currency || "USD",
    coverStyle: row.cover_style,
    buttonLabel: row.button_label || "Buy now",
    deliveryNote: row.delivery_note ?? "",
    deliveryUrl: row.delivery_url,
    published: Boolean(row.published),
    featured: Boolean(row.featured),
    sortOrder: row.sort_order ?? 0,
    createdAt: toIso(row.created_at),
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
    currency: row.currency || "USD",
    status,
    sifaloSid: row.sifalo_sid,
    paymentType: row.payment_type,
    demo: Boolean(row.demo),
    createdAt: toIso(row.created_at),
    paidAt: row.paid_at ? toIso(row.paid_at) : null,
  };
}
