// @ts-check
/**
 * Tiny .env loader — no extra dependency.
 *
 * Dokploy injects env in the process; a VPS may instead keep secrets in `.env`.
 * Existing `process.env` keys always win so the host's values are not overwritten.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./with-app-env.mjs";

/**
 * Parse KEY=VALUE lines. Supports `export KEY=`, quoted values, and `#` comments.
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseEnvFile(text) {
  /** @type {Record<string, string>} */
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.toLowerCase().startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/**
 * Merge `.env` then `.env.production` from `root` into `process.env`.
 * @param {string} [root]
 * @returns {NodeJS.ProcessEnv}
 */
export function loadProjectEnv(root = projectRoot()) {
  for (const name of [".env", ".env.production"]) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    const parsed = parseEnvFile(readFileSync(path, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
  return process.env;
}
