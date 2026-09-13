import { APIError } from "better-auth/api";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  countryFromHeaders,
  formatCountry,
  headersFromAuthContext,
  ipFromHeaders,
  normalizeCountry,
  parseCountryList,
} from "@/lib/geo";
import { setting } from "@/lib/platform-settings";

async function blockedCountries(): Promise<Set<string>> {
  const raw = await setting("blocked_countries");
  return new Set(parseCountryList(raw));
}

async function defaultSignupCountry(): Promise<string | null> {
  const fromSettings = normalizeCountry(await setting("default_signup_country"));
  if (fromSettings) return fromSettings;
  return normalizeCountry(process.env.DEFAULT_SIGNUP_COUNTRY);
}

function resolveCountry(ctx: unknown): string | null {
  return countryFromHeaders(headersFromAuthContext(ctx));
}

export async function assertSignupAllowed(ctx: unknown): Promise<void> {
  const country = resolveCountry(ctx) ?? (await defaultSignupCountry());
  if (!country) return;
  const blocked = await blockedCountries();
  if (blocked.has(country)) {
    throw new APIError("FORBIDDEN", {
      message: "Sign-ups from your region are not available.",
    });
  }
}

export async function assertUserActive(userId: string): Promise<void> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ disabled: boolean }>(
      "select disabled from user_profiles where user_id = $1 limit 1",
      [userId],
    );
    if (rows[0]?.disabled) {
      throw new APIError("FORBIDDEN", { message: "This account is disabled." });
    }
  } catch (err) {
    if (err instanceof APIError) throw err;
  }
}

export async function isUserDisabled(userId: string): Promise<boolean> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ disabled: boolean }>(
      "select disabled from user_profiles where user_id = $1 limit 1",
      [userId],
    );
    return Boolean(rows[0]?.disabled);
  } catch {
    return false;
  }
}

export async function recordSignup(userId: string, ctx: unknown): Promise<void> {
  const country = resolveCountry(ctx) ?? (await defaultSignupCountry());
  try {
    const sql = await getSql();
    await sql.query(
      `insert into user_profiles (user_id, signup_country, last_login_at, last_login_country, last_login_ip, updated_at)
       values ($1, $2, now(), $2, $3, now())
       on conflict (user_id) do update set
         signup_country = coalesce(user_profiles.signup_country, excluded.signup_country),
         last_login_at = now(),
         last_login_country = excluded.last_login_country,
         last_login_ip = excluded.last_login_ip,
         updated_at = now()`,
      [userId, country, ipFromHeaders(headersFromAuthContext(ctx))],
    );
  } catch (err) {
    console.warn("[kart] could not record signup country:", err);
  }
}

export async function recordLogin(userId: string, ctx: unknown): Promise<void> {
  const country = resolveCountry(ctx) ?? (await defaultSignupCountry());
  const ip = ipFromHeaders(headersFromAuthContext(ctx));
  try {
    const sql = await getSql();
    await sql.query(
      `insert into user_profiles (user_id, signup_country, last_login_at, last_login_country, last_login_ip, updated_at)
       values ($1, $2, now(), $2, $3, now())
       on conflict (user_id) do update set
         last_login_at = now(),
         last_login_country = excluded.last_login_country,
         last_login_ip = excluded.last_login_ip,
         updated_at = now()`,
      [userId, country, ip],
    );
  } catch (err) {
    console.warn("[kart] could not record last login:", err);
  }
}

export async function signupCountryFor(userId: string): Promise<string | null> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ signup_country: string | null }>(
      "select signup_country from user_profiles where user_id = $1 limit 1",
      [userId],
    );
    return normalizeCountry(rows[0]?.signup_country);
  } catch {
    return null;
  }
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<{
      signup_country: string | null;
      last_login_at: unknown;
      last_login_country: string | null;
    }>(
      `select signup_country, last_login_at, last_login_country from user_profiles where user_id = $1 limit 1`,
      [context.userId],
    );
    const row = rows[0];
    return {
      signupCountry: normalizeCountry(row?.signup_country),
      signupCountryLabel: formatCountry(row?.signup_country),
      lastLoginAt: row?.last_login_at ? String(row.last_login_at) : null,
      lastLoginCountry: normalizeCountry(row?.last_login_country),
    };
  });
