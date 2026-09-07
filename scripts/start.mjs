#!/usr/bin/env node
/**
 * Production entry for Dokploy / VPS / Railpack.
 *
 * Loads `.env`, creates the Postgres database if needed, applies migrations,
 * then starts the Nitro Node server. Safe to re-run — migrations are tracked.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
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
const serverCandidates = [
  join(root, ".output/server/index.mjs"),
  join(root, ".output/server/index.js"),
];
const server = serverCandidates.find((p) => existsSync(p));
if (!server) {
  const seen = [];
  for (const name of [".output", ".vercel", "dist", "build"]) {
    if (existsSync(join(root, name))) seen.push(name);
  }
  console.error("[start] missing .output/server/index.mjs — the production Node server was not built.");
  console.error("[start] cwd:", process.cwd());
  console.error("[start] app root:", root);
  console.error("[start] present output dirs:", seen.length ? seen.join(", ") : "(none)");
  try {
    console.error("[start] root entries:", readdirSync(root).join(", "));
  } catch {
    // ignore
  }
  console.error("[start] Rebuild with NITRO_PRESET=node-server (npm run build).");
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
