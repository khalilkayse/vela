import type { CoverStyle, ProductKind, ShopLayout } from "./constants";

export type Shop = {
  id: number;
  userId: string;
  username: string;
  displayName: string;
  tagline: string;
  bio: string;
  avatarInitials: string;
  coverStyle: string;
  layout: ShopLayout;
  websiteUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  sifaloConnected: boolean;
  hasSifaloCredentials: boolean;
  published: boolean;
  createdAt: string;
};

export type Product = {
  id: number;
  shopId: number;
  userId: string;
  slug: string;
  title: string;
  description: string;
  kind: ProductKind;
  price: number;
  currency: string;
  coverStyle: CoverStyle | string;
  buttonLabel: string;
  deliveryNote: string;
  deliveryUrl: string | null;
  published: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
};

export type PageBlock = {
  id: number;
  shopId: number;
  userId: string;
  kind: "link" | "heading";
  title: string;
  url: string | null;
  sortOrder: number;
  visible: boolean;
};

export type Order = {
  id: number;
  shopId: number;
  userId: string;
  productId: number | null;
  orderRef: string;
  productTitle: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  sifaloSid: string | null;
  paymentType: string | null;
  demo: boolean;
  createdAt: string;
  paidAt: string | null;
};

export type PublicShopPayload = {
  shop: Shop;
  products: Product[];
  blocks: PageBlock[];
};

export type DashboardStats = {
  revenue: number;
  orderCount: number;
  paidCount: number;
  productCount: number;
};
