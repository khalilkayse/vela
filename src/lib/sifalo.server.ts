/**
 * Sifalo Pay Checkout client.
 * Docs: https://developer.sifalopay.com (hosted checkout).
 *
 * Flow:
 *   1. POST {gatewayUrl} with Basic Auth + amount/currency/return_url/order_id
 *      → { key, token }
 *   2. Redirect the buyer to {checkoutPage}?key=&token=
 *   3. Buyer returns to return_url with sid; POST {verifyUrl} to confirm.
 *
 * Endpoints and optional platform credentials are configured in /dashx.
 */
import { readSettings } from "@/lib/platform-settings";
import { SIFALO_PRESETS } from "@/lib/constants";

const DEFAULT_GATEWAY = SIFALO_PRESETS.production.gatewayUrl;
const DEFAULT_VERIFY = SIFALO_PRESETS.production.verifyUrl;
const DEFAULT_CHECKOUT = SIFALO_PRESETS.production.checkoutPage;

const FETCH_MS = 120_000;

export type SifaloCheckoutSession = {
  key: string;
  token: string;
};

export type SifaloVerifyResult = {
  sid: string;
  account?: string;
  payment_type?: string;
  amount?: string;
  status: string;
  code?: number;
};

export type SifaloPlatformConfig = {
  gatewayUrl: string;
  verifyUrl: string;
  checkoutPage: string;
  apiKey: string;
  apiPassword: string;
  usePlatformCredentials: boolean;
};

const SIFALO_KEYS = {
  gatewayUrl: "sifalo_gateway_url",
  verifyUrl: "sifalo_verify_url",
  checkoutPage: "sifalo_checkout_page",
  apiKey: "sifalo_api_key",
  apiPassword: "sifalo_api_password",
  usePlatform: "sifalo_use_platform",
} as const;

export async function getSifaloPlatformConfig(): Promise<SifaloPlatformConfig> {
  const raw = await readSettings(Object.values(SIFALO_KEYS));
  return {
    gatewayUrl: (raw[SIFALO_KEYS.gatewayUrl] || process.env.SIFALO_GATEWAY_URL || DEFAULT_GATEWAY).trim(),
    verifyUrl: (raw[SIFALO_KEYS.verifyUrl] || process.env.SIFALO_VERIFY_URL || DEFAULT_VERIFY).trim(),
    checkoutPage: (raw[SIFALO_KEYS.checkoutPage] || process.env.SIFALO_CHECKOUT_PAGE || DEFAULT_CHECKOUT).trim(),
    apiKey: (raw[SIFALO_KEYS.apiKey] || process.env.SIFALO_API_KEY || "").trim(),
    apiPassword: raw[SIFALO_KEYS.apiPassword] || process.env.SIFALO_API_PASSWORD || "",
    usePlatformCredentials: raw[SIFALO_KEYS.usePlatform] === "1",
  };
}

function basicAuth(apiKey: string, apiPassword: string): string {
  return `Basic ${Buffer.from(`${apiKey}:${apiPassword}`).toString("base64")}`;
}

export function sifaloCheckoutUrl(key: string, token: string, checkoutPage: string = DEFAULT_CHECKOUT): string {
  const base = checkoutPage.endsWith("/") ? checkoutPage : `${checkoutPage}/`;
  const url = new URL(base);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sifaloInitiateCheckout(input: {
  apiKey: string;
  apiPassword: string;
  amount: string;
  returnUrl: string;
  orderId?: string;
}): Promise<SifaloCheckoutSession> {
  const config = await getSifaloPlatformConfig();
  const payload: Record<string, string> = {
    amount: input.amount,
    gateway: "checkout",
    currency: "USD",
    return_url: input.returnUrl,
  };
  if (input.orderId) payload.order_id = input.orderId;

  const res = await fetch(config.gatewayUrl, {
    method: "POST",
    headers: {
      Authorization: basicAuth(input.apiKey, input.apiPassword),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(FETCH_MS),
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      (typeof data.message === "string" && data.message) ||
      (typeof data.error === "string" && data.error) ||
      text ||
      `Sifalo Pay returned ${res.status}`;
    throw new Error(message);
  }

  const key = typeof data.key === "string" ? data.key : "";
  const token = typeof data.token === "string" ? data.token : "";
  if (!key || !token) {
    throw new Error("Sifalo Pay did not return a checkout key and token.");
  }
  return { key, token };
}

export async function sifaloVerify(input: {
  sid?: string;
  orderId?: string;
}): Promise<SifaloVerifyResult> {
  const config = await getSifaloPlatformConfig();
  const body = input.sid
    ? { sid: input.sid }
    : input.orderId
      ? { order_id: input.orderId }
      : null;
  if (!body) throw new Error("A Sifalo Pay sid or order_id is required.");

  const res = await fetch(config.verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_MS),
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(text || "Sifalo Pay verification failed.");
  }

  if (!res.ok) {
    throw new Error(
      (typeof data.message === "string" && data.message) ||
        text ||
        `Sifalo Pay verification returned ${res.status}`,
    );
  }

  return {
    sid: String(data.sid ?? input.sid ?? ""),
    account: typeof data.account === "string" ? data.account : undefined,
    payment_type: typeof data.payment_type === "string" ? data.payment_type : undefined,
    amount: typeof data.amount === "string" ? data.amount : undefined,
    status: String(data.status ?? "pending").toLowerCase(),
    code: typeof data.code === "number" ? data.code : Number(data.code) || undefined,
  };
}

export async function sifaloTestCredentials(
  apiKey: string,
  apiPassword: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    await sifaloInitiateCheckout({
      apiKey,
      apiPassword,
      amount: "1.00",
      returnUrl: "https://pay.sifalo.com/checkout/?order_id=vela-test",
      orderId: "vela-test",
    });
    return { ok: true, message: "Sifalo Pay accepted these credentials." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reach Sifalo Pay.";
    const lower = message.toLowerCase();
    if (
      lower.includes("401") ||
      lower.includes("unauthorized") ||
      lower.includes("invalid") ||
      lower.includes("auth")
    ) {
      return { ok: false, message: "Sifalo Pay rejected these credentials." };
    }
    if (lower.includes("amount") || lower.includes("return")) {
      return { ok: true, message: "Sifalo Pay accepted these credentials." };
    }
    return { ok: false, message };
  }
}

export async function resolveSifaloMerchant(shop: {
  sifalo_api_key: string | null;
  sifalo_api_password: string | null;
  allow_own_sifalo?: boolean | null;
}): Promise<{ apiKey: string; apiPassword: string; source: "shop" | "platform" } | null> {
  const platform = await getSifaloPlatformConfig();
  const shopKeys =
    shop.sifalo_api_key && shop.sifalo_api_password
      ? { apiKey: shop.sifalo_api_key, apiPassword: shop.sifalo_api_password, source: "shop" as const }
      : null;
  const platformKeys =
    platform.apiKey && platform.apiPassword
      ? { apiKey: platform.apiKey, apiPassword: platform.apiPassword, source: "platform" as const }
      : null;

  if (shop.allow_own_sifalo && shopKeys) return shopKeys;
  if (platform.usePlatformCredentials && platformKeys) return platformKeys;
  if (!platform.usePlatformCredentials && shopKeys) return shopKeys;
  if (platformKeys) return platformKeys;
  if (shopKeys) return shopKeys;
  return null;
}
