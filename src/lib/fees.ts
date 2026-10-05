/**
 * Platform fee math and payment-verification rules. Pure and side-effect
 * free so both the client (checkout preview) and the server (checkout,
 * admin settings) can share one definition — and so they are unit-tested.
 */

export type FeeBreakdown = {
  /** What the platform keeps, in the order's currency. */
  fee: number;
  /** What the seller is owed after the fee. */
  net: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * `fee = price * pct% + fixed`, capped so a cheap item can never leave the
 * seller owing money, and zero for free items.
 */
export function computeFee(price: number, feePercent: number, feeFixed: number): FeeBreakdown {
  if (!Number.isFinite(price) || price <= 0) return { fee: 0, net: 0 };
  const pct = Number.isFinite(feePercent) && feePercent > 0 ? feePercent : 0;
  const fixed = Number.isFinite(feeFixed) && feeFixed > 0 ? feeFixed : 0;
  const rawFee = round2((price * pct) / 100 + fixed);
  const fee = Math.min(Math.max(rawFee, 0), price);
  return { fee, net: round2(price - fee) };
}

export type SifaloVerifyLike = {
  status: string;
  code?: number;
  amount?: string;
  currency?: string;
};

export type VerifiableOrder = {
  amount: number;
  currency: string;
};

/**
 * Sifalo Pay's own rule (developer.sifalopay.com/docs/authentication): mark
 * paid only when `status === "success"` AND `code === 601`. We additionally
 * require the verified amount to match this order (within a cent) so a sid
 * from a cheaper purchase can't be replayed against an expensive one.
 */
export function isVerifiedPaid(verify: SifaloVerifyLike, order: VerifiableOrder): boolean {
  if (verify.status !== "success" || Number(verify.code) !== 601) return false;
  if (verify.amount !== undefined) {
    const verifiedAmount = Number(verify.amount);
    if (!Number.isFinite(verifiedAmount)) return false;
    if (Math.abs(verifiedAmount - order.amount) >= 0.005) return false;
  }
  if (verify.currency && verify.currency.toUpperCase() !== (order.currency || "USD").toUpperCase()) {
    return false;
  }
  return true;
}

/** `failed` covers Sifalo's decline (600) and insufficient-balance (604) codes. */
export function isVerifiedFailed(verify: SifaloVerifyLike): boolean {
  return verify.status === "failed";
}
