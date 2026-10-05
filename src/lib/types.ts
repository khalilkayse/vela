import type { CoverStyle, PayoutMethod, ProductKind, ShopLayout } from "./constants";

export type Shop = {
  id: number;
  userId: string;
  username: string;
  displayName: string;
  tagline: string;
  bio: string;
  avatarInitials: string;
  avatarFileId: number | null;
  avatarUrl: string | null;
  coverStyle: string;
  layout: ShopLayout;
  websiteUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  terms: string;
  contactEmail: string | null;
  payoutMethod: PayoutMethod | null;
  payoutAccount: string;
  payoutName: string;
  /** True when the platform has working Sifalo Pay credentials for the active mode. */
  checkoutLive: boolean;
  /** True when the platform is running in sandbox mode (test cards/wallets only). */
  testMode: boolean;
  country: string | null;
  published: boolean;
  createdAt: string;
};

export type ProductImage = {
  id: number;
  url: string;
};

export type Product = {
  id: number;
  shopId: number;
  userId: string;
  slug: string;
  title: string;
  description: string;
  bodyHtml: string;
  kind: ProductKind;
  price: number;
  currency: string;
  coverStyle: CoverStyle | string;
  coverFileId: number | null;
  coverUrl: string | null;
  gallery: ProductImage[];
  buttonLabel: string;
  deliveryNote: string;
  deliveryUrl: string | null;
  published: boolean;
  featured: boolean;
  paywalled: boolean;
  locked: boolean;
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
  feeAmount: number;
  netAmount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  sifaloSid: string | null;
  sifaloEnv: "sandbox" | "live" | null;
  paymentType: string | null;
  /** Legacy flag from the retired demo-checkout flow — never set on new orders. */
  demo: boolean;
  payoutId: number | null;
  fulfilled: boolean;
  fulfilledAt: string | null;
  fulfillmentNote: string;
  createdAt: string;
  paidAt: string | null;
};

export type Payout = {
  id: number;
  shopId: number;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  account: string;
  reference: string;
  note: string;
  createdBy: string;
  createdAt: string;
};

export type PublicShopPayload = {
  shop: Shop;
  products: Product[];
  blocks: PageBlock[];
};

export type DashboardStats = {
  /** Gross sales (what buyers paid), live orders only. */
  revenue: number;
  /** Platform fee taken out of `revenue`. */
  fees: number;
  /** `revenue - fees`: what the seller earned. */
  earnings: number;
  /** `earnings` not yet paid out. */
  balance: number;
  orderCount: number;
  paidCount: number;
  productCount: number;
};
