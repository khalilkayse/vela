import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function money(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

export function parsePrice(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  let raw = String(value ?? "").trim();
  if (!raw) return 0;
  raw = raw.replace(/^[^\d-]+/, "");
  if (raw.includes(",") && !raw.includes(".")) raw = raw.replace(",", ".");
  else raw = raw.replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export function formatPrice(value: unknown, currency = "USD"): string {
  const n = money(value);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function toIso(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "K";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The order ref is a bearer credential: it alone gates downloads, paid-article
 * access, and the success-page receipt, so it must not be guessable.
 * `crypto.getRandomValues` works in both the browser and Node/edge runtimes.
 */
export function makeOrderRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "KART-";
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}

export function usernamePattern(): RegExp {
  return /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/;
}

/**
 * Adds `https://` to a bare domain/path (e.g. "instagram.com/x") so it becomes
 * an absolute link instead of a relative one that collides with app routes.
 * Returns null for empty input or anything that isn't http(s) once normalized.
 */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
