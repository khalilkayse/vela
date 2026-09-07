/**
 * Sifalo Pay Checkout client.
 * Docs: https://developer.sifalopay.com/sifalo-pay-checkout
 *
 * Flow:
 *   1. POST /gateway/ with Basic Auth + amount/currency/return_url → { key, token }
 *   2. Redirect the buyer to https://pay.sifalo.com/checkout/?key=&token=
 *   3. Buyer returns to return_url with sid; POST /gateway/verify.php to confirm.
 */

const GATEWAY_URL = "https://api.sifalopay.com/gateway/";
const VERIFY_URL = "https://api.sifalopay.com/gateway/verify.php";
const CHECKOUT_PAGE = "https://pay.sifalo.com/checkout/";

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

function basicAuth(apiKey: string, apiPassword: string): string {
  return `Basic ${Buffer.from(`${apiKey}:${apiPassword}`).toString("base64")}`;
}

export function sifaloCheckoutUrl(key: string, token: string): string {
  const url = new URL(CHECKOUT_PAGE);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sifaloInitiateCheckout(input: {
  apiKey: string;
  apiPassword: string;
  amount: string;
  returnUrl: string;
}): Promise<SifaloCheckoutSession> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(input.apiKey, input.apiPassword),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      gateway: "checkout",
      currency: "USD",
      return_url: input.returnUrl,
    }),
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
  const body = input.sid
    ? { sid: input.sid }
    : input.orderId
      ? { order_id: input.orderId }
      : null;
  if (!body) throw new Error("A Sifalo Pay sid or order_id is required.");

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
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
    code: typeof data.code === "number" ? data.code : undefined,
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
    // A validation-style error after auth still means the key/password were accepted.
    if (lower.includes("amount") || lower.includes("return")) {
      return { ok: true, message: "Sifalo Pay accepted these credentials." };
    }
    return { ok: false, message };
  }
}
