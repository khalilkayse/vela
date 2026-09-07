export const APP_NAME = "Vela";
export const APP_TAGLINE = "Your store. Your page. Your payouts.";

export const RESERVED_USERNAMES = new Set([
  "login",
  "signup",
  "register",
  "dashboard",
  "onboarding",
  "settings",
  "api",
  "pay",
  "checkout",
  "discover",
  "admin",
  "app",
  "static",
  "assets",
  "www",
  "support",
  "help",
  "about",
  "pricing",
  "terms",
  "privacy",
  "blog",
  "docs",
  "auth",
  "s",
  "u",
  "me",
  "new",
  "edit",
  "vela",
  "sifalo",
]);

export const PRODUCT_KINDS = [
  { id: "digital", label: "Digital product", hint: "Files, templates, courses, downloads" },
  { id: "service", label: "Service", hint: "Sessions, audits, retainers" },
  { id: "link", label: "Free link", hint: "A public resource. No payment." },
] as const;

export type ProductKind = (typeof PRODUCT_KINDS)[number]["id"];

export const LAYOUTS = [
  { id: "hybrid", label: "Studio", hint: "Profile, links, then products — like Stan" },
  { id: "shop", label: "Shop", hint: "A catalog-first storefront — like Shopify" },
  { id: "links", label: "Page", hint: "Stacked buttons — like Linktree" },
] as const;

export type ShopLayout = (typeof LAYOUTS)[number]["id"];

export const COVER_STYLES = [
  "mesh-1",
  "mesh-2",
  "mesh-3",
  "mesh-4",
  "mesh-5",
  "mesh-6",
] as const;

export type CoverStyle = (typeof COVER_STYLES)[number];
