import { getSql } from "@/lib/db";

export async function readSettings(keys: string[]): Promise<Record<string, string>> {
  const sql = await getSql();
  if (keys.length === 0) return {};
  const rows = await sql.query<{ key: string; value: string }>(
    `select key, value from platform_settings where key = any($1::text[])`,
    [keys],
  );
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export async function writeSettings(entries: Record<string, string>): Promise<void> {
  const sql = await getSql();
  for (const [key, value] of Object.entries(entries)) {
    await sql.query(
      `insert into platform_settings (key, value, updated_at) values ($1, $2, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [key, value],
    );
  }
}

export async function setting(key: string, fallback = ""): Promise<string> {
  const raw = await readSettings([key]);
  return (raw[key] ?? fallback).trim();
}
