#!/usr/bin/env node
/**
 * Production entry for Dokploy / VPS.
 *
 * Loads `.env`, creates the Postgres database if needed, applies migrations,
 * then starts the Nitro Node server. Safe to re-run — migrations are tracked.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectEnv } from "./load-dotenv.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
loadProjectEnv(root);

if (!process.env.HOST) process.env.HOST = "0.0.0.0";
if (!process.env.NITRO_HOST) process.env.NITRO_HOST = process.env.HOST;
if (!process.env.PORT) process.env.PORT = "3000";

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "[start] DATABASE_URL is required. Copy .env.example to .env, or set it in Dokploy → Environment.",
  );
  process.exit(1);
}

const migrate = join(root, "scripts/migrate.mjs");
const server = join(root, ".output/server/index.mjs");
if (!existsSync(server)) {
  console.error("[start] missing .output/server/index.mjs — run the production build first.");
  process.exit(1);
}

function run(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      stdio: "inherit",
      env: process.env,
      cwd: root,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} exited ${signal || code}`));
    });
  });
}

function forwardSignals(child) {
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => child.kill(signal));
  }
}

await run(migrate);

const child = spawn(process.execPath, [server], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});
forwardSignals(child);
child.on("exit", (code, signal) => {
  if (signal) process.exit(128);
  process.exit(code ?? 1);
});
