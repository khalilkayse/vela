import { RESERVED_USERNAMES } from "@/lib/constants";
import { readSettings, writeSettings } from "@/lib/platform-settings";
import { usernamePattern } from "@/lib/utils";

/** Shown for taken, reserved, and platform-blocked names — never which one. */
export const USERNAME_UNAVAILABLE = "That username is not available.";
export const USERNAME_FORMAT =
  "Use 3–24 letters, numbers, or hyphens. Start and end with a letter or number.";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function parseReservedList(raw: string | string[]): string[] {
  const parts = Array.isArray(raw) ? raw : raw.split(/[\s,]+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const value = normalizeUsername(part);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export async function extraReservedUsernames(): Promise<string[]> {
  const raw = await readSettings(["reserved_usernames"]);
  return parseReservedList(raw.reserved_usernames ?? "");
}

export async function allReservedUsernames(): Promise<Set<string>> {
  const extra = await extraReservedUsernames();
  return new Set([...RESERVED_USERNAMES, ...extra]);
}

export async function isUsernameReserved(username: string): Promise<boolean> {
  return (await allReservedUsernames()).has(normalizeUsername(username));
}

export async function saveExtraReservedUsernames(names: string[]): Promise<string[]> {
  const extra = parseReservedList(names).filter((name) => !RESERVED_USERNAMES.has(name));
  await writeSettings({ reserved_usernames: extra.join(",") });
  return extra;
}

export function usernameFormatOk(username: string): boolean {
  return usernamePattern().test(username);
}

export async function assertUsername(username: string): Promise<void> {
  if (!usernameFormatOk(username)) throw new Error(USERNAME_FORMAT);
  if (await isUsernameReserved(username)) throw new Error(USERNAME_UNAVAILABLE);
}
