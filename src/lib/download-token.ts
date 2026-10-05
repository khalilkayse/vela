import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const configured = process.env.BETTER_AUTH_SECRET?.trim();
  if (configured) return configured;
  // A hard-coded fallback would let anyone who reads the source code forge a
  // download grant for any order. Only acceptable with no real database.
  if (process.env.DATABASE_URL?.trim()) {
    throw new Error("BETTER_AUTH_SECRET must be set to sign download links on a real database.");
  }
  return "vela-dev-download-secret";
}

export type DownloadGrant = {
  orderRef: string;
  fileId: number;
  exp: number;
};

export function signDownloadGrant(orderRef: string, fileId: number, ttlSeconds = 60 * 60 * 12): string {
  const grant: DownloadGrant = {
    orderRef,
    fileId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifyDownloadGrant(token: string): DownloadGrant {
  const [payload, mac] = token.split(".");
  if (!payload || !mac) throw new Error("Invalid download link.");
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid download link.");
  const grant = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DownloadGrant;
  if (!grant.orderRef || !grant.fileId || !grant.exp) throw new Error("Invalid download link.");
  if (grant.exp < Math.floor(Date.now() / 1000)) throw new Error("This download link has expired.");
  return grant;
}
