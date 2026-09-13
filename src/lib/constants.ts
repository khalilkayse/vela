export const APP_NAME = "Kart";
export const APP_TAGLINE = "One click storefronts for independent makers.";
export const APP_PITCH = "One click storefronts for independent makers powered by Sifalo Pay";

/** Inline hex for emails and favicons — keep in sync with `src/styles.css`. */
export const BRAND_HEX = {
  primary: "#e24b2a",
  bg: "#f6f1e8",
  fg: "#1c1712",
  muted: "#6a6258",
  border: "#e6ddd0",
  surface: "#fffdf8",
} as const;

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
  "dashx",
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
  "kart",
  "sifalo",
]);

export const PRODUCT_KINDS = [
  { id: "digital", label: "Digital product", hint: "Files, templates, courses, downloads" },
  { id: "service", label: "Service", hint: "Sessions, audits, retainers" },
  { id: "link", label: "Free link", hint: "A public resource. No payment." },
] as const;

export type ProductKind = (typeof PRODUCT_KINDS)[number]["id"];

export const LAYOUTS = [
  {
    id: "hybrid",
    label: "Studio",
    hint: "Name and bio first, then a few links, then the things you sell.",
  },
  {
    id: "shop",
    label: "Shop",
    hint: "A catalog of covers, prices, and checkout on every product.",
  },
  {
    id: "links",
    label: "Page",
    hint: "A single column of buttons — one destination per tap.",
  },
] as const;

export type ShopLayout = (typeof LAYOUTS)[number]["id"];

/** Hosts from https://developer.sifalopay.com — live keys only work on .com. */
export type SifaloHosts = {
  gatewayUrl: string;
  verifyUrl: string;
  checkoutPage: string;
};

export const SIFALO_PRESETS: Record<"production" | "staging", SifaloHosts> = {
  production: {
    gatewayUrl: "https://api.sifalopay.com/gateway/",
    verifyUrl: "https://api.sifalopay.com/gateway/verify.php",
    checkoutPage: "https://pay.sifalo.com/checkout/",
  },
  staging: {
    gatewayUrl: "https://spay-api.sifalo.net/gateway/",
    verifyUrl: "https://spay-api.sifalo.net/gateway/verify.php",
    checkoutPage: "https://pay.sifalo.net/checkout/",
  },
};

export const COVER_STYLES = [
  "mesh-1",
  "mesh-2",
  "mesh-3",
  "mesh-4",
  "mesh-5",
  "mesh-6",
] as const;

export type CoverStyle = (typeof COVER_STYLES)[number];
