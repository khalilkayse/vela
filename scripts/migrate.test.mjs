import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminConnectionString,
  parseDatabaseName,
  quoteIdent,
} from "./migrate.mjs";

test("parseDatabaseName reads the path, including encoded names", () => {
  assert.equal(parseDatabaseName("postgresql://u:p@h:5432/vela"), "vela");
  assert.equal(
    parseDatabaseName("postgres://u:p@h/vela?sslmode=require"),
    "vela",
  );
  assert.equal(parseDatabaseName("postgresql://u:p@h:5432/vela-shop"), "vela-shop");
  assert.equal(parseDatabaseName("postgresql://u:p@h:5432/vela_prod/"), "vela_prod");
});

test("parseDatabaseName rejects a URL with no database name", () => {
  assert.throws(() => parseDatabaseName("postgresql://u:p@h:5432/"), /no database name/);
  assert.throws(() => parseDatabaseName("not a url"), /not a valid URL/);
});

test("adminConnectionString swaps the database and keeps query params", () => {
  assert.equal(
    adminConnectionString("postgresql://u:p@h:5432/vela?sslmode=require", "postgres"),
    "postgresql://u:p@h:5432/postgres?sslmode=require",
  );
  assert.equal(
    adminConnectionString("postgresql://u:p@h:5432/vela", "template1"),
    "postgresql://u:p@h:5432/template1",
  );
});

test("quoteIdent quotes and escapes identifiers", () => {
  assert.equal(quoteIdent("vela"), '"vela"');
  assert.equal(quoteIdent('ve"la'), '"ve""la"');
  assert.throws(() => quoteIdent(""), /Invalid database name/);
  assert.throws(() => quoteIdent("a".repeat(64)), /Invalid database name/);
});
