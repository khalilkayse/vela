/**
 * Sifalo Pay — one platform-wide merchant account, sandbox and live.
 * Docs: https://developer.sifalopay.com (hosted checkout).
 *
 * Flow:
 *   1. POST {gatewayUrl} with Basic Auth + amount/currency/return_url/order_id
 *      → { key, token }
 *   2. Redirect the buyer to {checkoutPage}?key=&token=
 *   3. Buyer returns to return_url with sid; POST {verifyUrl} to confirm.
 *
 * Hosts are fixed per environment (Sifalo's own sandbox vs. live infrastructure
 * — see SIFALO_PRESETS). Credentials and the platform fee are set in /dashx.
 */
import { readSettings } from "@/lib/platform-settings";
import { SIFALO_PRESETS, type SifaloEnv } from "@/lib/constants";

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
  currency?: string;
  status: string;
  code?: number;
};

export type SifaloCredentials = {
  apiUser: string;
  apiKey: string;
};

export type SifaloPlatformConfig = {
  mode: SifaloEnv;
  sandbox: SifaloCredentials;
  live: SifaloCredentials;
  feePercent: number;
  feeFixed: number;
};

const SETTINGS_KEYS = {
  mode: "sifalo_mode",
  sandboxUser: "sifalo_sandbox_api_user",
  sandboxKey: "sifalo_sandbox_api_key",
  liveUser: "sifalo_live_api_user",
  liveKey: "sifalo_live_api_key",
  feePercent: "platform_fee_percent",
  feeFixed: "platform_fee_fixed",
} as const;

function hostsFor(env: SifaloEnv) {
  return SIFALO_PRESETS[env];
}

/** Settings live in the database only — no env fallback, so clearing a field actually clears it. */
export async function getSifaloPlatformConfig(): Promise<SifaloPlatformConfig> {
  const raw = await readSettings(Object.values(SETTINGS_KEYS));
  const mode = raw[SETTINGS_KEYS.mode] === "live" ? "live" : "sandbox";
  const feePercent = Number.parseFloat(raw[SETTINGS_KEYS.feePercent] ?? "");
  const feeFixed = Number.parseFloat(raw[SETTINGS_KEYS.feeFixed] ?? "");
  return {
    mode,
    sandbox: {
      apiUser: (raw[SETTINGS_KEYS.sandboxUser] ?? "").trim(),
      apiKey: raw[SETTINGS_KEYS.sandboxKey] ?? "",
    },
    live: {
      apiUser: (raw[SETTINGS_KEYS.liveUser] ?? "").trim(),
      apiKey: raw[SETTINGS_KEYS.liveKey] ?? "",
    },
    feePercent: Number.isFinite(feePercent) && feePercent >= 0 ? feePercent : 0,
    feeFixed: Number.isFinite(feeFixed) && feeFixed >= 0 ? feeFixed : 0,
  };
}

export async function saveSifaloPlatformSettings(input: {
  mode: SifaloEnv;
  sandboxApiUser?: string;
  sandboxApiKey?: string;
  liveApiUser?: string;
  liveApiKey?: string;
  feePercent: number;
  feeFixed: number;
}): Promise<void> {
  const { writeSettings } = await import("@/lib/platform-settings");
  const current = await getSifaloPlatformConfig();
  const entries: Record<string, string> = {
    [SETTINGS_KEYS.mode]: input.mode,
    [SETTINGS_KEYS.feePercent]: String(input.feePercent),
    [SETTINGS_KEYS.feeFixed]: String(input.feeFixed),
  };
  if (input.sandboxApiUser !== undefined) entries[SETTINGS_KEYS.sandboxUser] = input.sandboxApiUser;
  entries[SETTINGS_KEYS.sandboxKey] = input.sandboxApiKey || current.sandbox.apiKey;
  if (input.liveApiUser !== undefined) entries[SETTINGS_KEYS.liveUser] = input.liveApiUser;
  entries[SETTINGS_KEYS.liveKey] = input.liveApiKey || current.live.apiKey;
  await writeSettings(entries);
}

export async function clearSifaloCredentials(env: SifaloEnv): Promise<void> {
  const { writeSettings } = await import("@/lib/platform-settings");
  if (env === "sandbox") {
    await writeSettings({ [SETTINGS_KEYS.sandboxUser]: "", [SETTINGS_KEYS.sandboxKey]: "" });
  } else {
    await writeSettings({ [SETTINGS_KEYS.liveUser]: "", [SETTINGS_KEYS.liveKey]: "" });
  }
}

/** Credentials for the environment currently active in /dashx, or null when unset. */
export async function activeCredentials(): Promise<{ env: SifaloEnv; apiUser: string; apiKey: string } | null> {
  const config = await getSifaloPlatformConfig();
  const creds = config.mode === "live" ? config.live : config.sandbox;
  if (!creds.apiUser || !creds.apiKey) return null;
  return { env: config.mode, apiUser: creds.apiUser, apiKey: creds.apiKey };
}

function basicAuth(apiUser: string, apiKey: string): string {
  return `Basic ${Buffer.from(`${apiUser}:${apiKey}`).toString("base64")}`;
}

export function sifaloCheckoutUrl(env: SifaloEnv, key: string, token: string): string {
  const base = hostsFor(env).checkoutPage;
  const url = new URL(base.endsWith("/") ? base : `${base}/`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sifaloInitiateCheckout(input: {
  env: SifaloEnv;
  apiUser: string;
  apiKey: string;
  amount: string;
  returnUrl: string;
  orderId?: string;
}): Promise<SifaloCheckoutSession> {
  const payload: Record<string, string> = {
    amount: input.amount,
    gateway: "checkout",
    currency: "USD",
    return_url: input.returnUrl,
  };
  if (input.orderId) payload.order_id = input.orderId;

  const res = await fetch(hostsFor(input.env).gatewayUrl, {
    method: "POST",
    headers: {
      Authorization: basicAuth(input.apiUser, input.apiKey),
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

  // Wrong username/key comes back as HTTP 200 with code 0 (Sifalo's auth docs).
  if (Number(data.code) === 0) {
    throw new Error("Sifalo Pay rejected these credentials.");
  }
  if (!res.ok) {
    const message =
      (typeof data.message === "string" && data.message) ||
      (typeof data.error === "string" && data.error) ||
      (typeof data.response === "string" && data.response) ||
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
  env: SifaloEnv;
  sid?: string;
  orderId?: string;
}): Promise<SifaloVerifyResult> {
  const body = input.sid
    ? { sid: input.sid }
    : input.orderId
      ? { order_id: input.orderId }
      : null;
  if (!body) throw new Error("A Sifalo Pay sid or order_id is required.");

  const res = await fetch(hostsFor(input.env).verifyUrl, {
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
    currency: typeof data.currency === "string" ? data.currency : undefined,
    // Sifalo always returns "failed" for declines, never "failure" (decline-and-timeout docs).
    status: String(data.status ?? "pending").toLowerCase(),
    code: typeof data.code === "number" ? data.code : Number(data.code) || undefined,
  };
}

/**
 * A $1 checkout session, harmless on its own since nothing is charged until
 * someone actually pays on the resulting hosted-checkout page.
 */
export async function sifaloTestCredentials(
  env: SifaloEnv,
  apiUser: string,
  apiKey: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const origin = (process.env.BETTER_AUTH_URL || "https://shop.sifalo.cloud").replace(/\/+$/, "");
    await sifaloInitiateCheckout({
      env,
      apiUser,
      apiKey,
      amount: "1.00",
      returnUrl: `${origin}/pay/return?order_id=kart-test`,
      orderId: "kart-test",
    });
    return { ok: true, message: `Sifalo Pay accepted these ${env} credentials.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reach Sifalo Pay.";
    return { ok: false, message };
  }
}
