/**
 * Creates the hidden /dashx super-admin the first time the database is empty.
 * Prints email + password once to the deploy logs.
 */
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

const DEFAULT_EMAIL = "owner@shop.sifalo.cloud";

function newId() {
  return randomBytes(16).toString("hex");
}

function newPassword() {
  return randomBytes(18).toString("base64url");
}

/**
 * @param {import("pg").PoolClient} client
 */
export async function ensureSuperAdmin(client) {
  const tables = await client.query(
    "select 1 from pg_tables where schemaname = 'public' and tablename = 'platform_admins'",
  );
  if (tables.rowCount === 0) return;

  const email = (process.env.DASHX_ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const reset = process.env.DASHX_RESET_PASSWORD === "1";

  const existing = await client.query(
    "select user_id, email from platform_admins order by created_at asc limit 1",
  );
  if (existing.rows[0] && !reset) {
    console.log(`[dashx] super admin already exists (${existing.rows[0].email}). Sign in at /dashx`);
    return;
  }

  const password = newPassword();
  const hashed = await hashPassword(password);

  if (existing.rows[0] && reset) {
    const userId = existing.rows[0].user_id;
    await client.query(`update account set password = $1, "updatedAt" = now() where "userId" = $2 and "providerId" = 'credential'`, [
      hashed,
      userId,
    ]);
    printCreds(existing.rows[0].email, password, true);
    return;
  }

  const byEmail = await client.query(`select id from "user" where email = $1 limit 1`, [email]);
  if (byEmail.rows[0]) {
    const userId = byEmail.rows[0].id;
    await client.query(
      `insert into platform_admins (user_id, email) values ($1, $2) on conflict (user_id) do nothing`,
      [userId, email],
    );
    const accounts = await client.query(
      `select id from account where "userId" = $1 and "providerId" = 'credential' limit 1`,
      [userId],
    );
    if (accounts.rows[0]) {
      await client.query(`update account set password = $1, "updatedAt" = now() where id = $2`, [
        hashed,
        accounts.rows[0].id,
      ]);
    } else {
      await client.query(
        `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $3, $4, now(), now())`,
        [newId(), userId, userId, hashed],
      );
    }
    printCreds(email, password, true);
    return;
  }

  const userId = newId();
  const accountId = newId();
  const name = "Platform owner";

  await client.query("BEGIN");
  try {
    await client.query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       values ($1, $2, $3, true, now(), now())`,
      [userId, name, email],
    );
    await client.query(
      `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values ($1, $2, 'credential', $3, $4, now(), now())`,
      [accountId, userId, userId, hashed],
    );
    await client.query(
      `insert into platform_admins (user_id, email) values ($1, $2)`,
      [userId, email],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }

  printCreds(email, password, false);
}

function printCreds(email, password, rotated) {
  console.log("============================================================");
  console.log(rotated ? "[dashx] Super admin password rotated." : "[dashx] Super admin created (first boot only).");
  console.log("[dashx] Sign in at:  /dashx");
  console.log(`[dashx] Email:       ${email}`);
  console.log(`[dashx] Password:    ${password}`);
  console.log("[dashx] This password is shown once. Save it, then sign in at /dashx.");
  console.log("============================================================");
}
