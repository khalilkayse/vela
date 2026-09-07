#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * 1. Loads `.env` if present (Dokploy UI env still wins).
 * 2. Creates the database named in DATABASE_URL when it does not exist.
 * 3. Applies pending files in ../migrations, one transaction each, recorded
 *    in `_migrations` so it is safe to re-run on every deploy / container start.
 *
 * The read is non-recursive, so the opt-in auth schema under migrations/auth/
 * is not applied to an app that never asked for sign-in.
 *
 * No DATABASE_URL (local / preview builds) -> skip; the PGLite fallback applies
 * the same files at startup instead (see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { pendingMigrations } from "./migration-plan.mjs";
import { loadProjectEnv } from "./load-dotenv.mjs";
import { isMainModule } from "./with-app-env.mjs";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/** Admin DBs we can connect to in order to run CREATE DATABASE. */
const ADMIN_DATABASES = ["postgres", "template1"];

/**
 * Database name from a Postgres URL path (`/vela` → `vela`).
 * @param {string} databaseUrl
 * @returns {string}
 */
export function parseDatabaseName(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  const name = decodeURIComponent(parsed.pathname.replace(/^\/+/, "").split("/")[0] || "");
  if (!name) throw new Error("DATABASE_URL has no database name in the path");
  return name;
}

/**
 * Same connection string, pointed at an admin database (`postgres` / `template1`).
 * @param {string} databaseUrl
 * @param {string} adminDb
 * @returns {string}
 */
export function adminConnectionString(databaseUrl, adminDb) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = `/${adminDb}`;
  return parsed.toString();
}

/**
 * Quote a Postgres identifier. Rejects NUL / oversized names.
 * @param {string} name
 * @returns {string}
 */
export function quoteIdent(name) {
  if (!name || name.includes("\0") || name.length > 63) {
    throw new Error(`Invalid database name "${name}"`);
  }
  return `"${name.replaceAll('"', '""')}"`;
}

/**
 * @param {string} connectionString
 * @returns {Promise<{ ok: true } | { ok: false, err: any }>}
 */
async function probe(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (err) {
    return { ok: false, err };
  } finally {
    await pool.end().catch(() => undefined);
  }
}

/**
 * Create the target database when it does not exist.
 * No-op when it already accepts connections. Requires CREATEDB on the role
 * (Dokploy's default Postgres user has this).
 * @param {string} databaseUrl
 */
export async function ensureDatabase(databaseUrl) {
  const dbName = parseDatabaseName(databaseUrl);
  const existing = await probe(databaseUrl);
  if (existing.ok) {
    console.log(`[migrate] database "${dbName}" already exists`);
    return;
  }
  // 3D000 = invalid_catalog_name (database does not exist)
  if (existing.err?.code !== "3D000") {
    throw existing.err;
  }

  let lastErr = existing.err;
  for (const adminDb of ADMIN_DATABASES) {
    const adminUrl = adminConnectionString(databaseUrl, adminDb);
    const pool = new pg.Pool({ connectionString: adminUrl, max: 1 });
    try {
      const client = await pool.connect();
      try {
        const found = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
        if (found.rowCount === 0) {
          // CREATE DATABASE cannot run inside a transaction or with a parameter.
          await client.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
          console.log(`[migrate] created database "${dbName}"`);
        } else {
          console.log(`[migrate] database "${dbName}" already exists`);
        }
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      lastErr = err;
    } finally {
      await pool.end().catch(() => undefined);
    }
  }

  console.error(
    `[migrate] database "${dbName}" does not exist and could not be created.`,
    "Create it in Dokploy's Postgres service, or grant CREATEDB to this role.",
  );
  throw lastErr;
}

async function applyMigrations(databaseUrl) {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  // An app with no schema of its own must not pay for a database connection.
  if (pendingMigrations(entries, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    );

    let count = 0;
    for (const { name } of pendingMigrations(entries, applied)) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        // pg's simple-query protocol runs a whole multi-statement file at once.
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  loadProjectEnv();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log(
      "[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).",
    );
    return;
  }

  await ensureDatabase(databaseUrl);
  await applyMigrations(databaseUrl);
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error("[migrate] failed:", err?.message || err);
    // pg errors carry the context needed to debug a bad SQL file.
    for (const key of ["code", "detail", "hint", "position", "where"]) {
      if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
    }
    process.exit(1);
  });
}
