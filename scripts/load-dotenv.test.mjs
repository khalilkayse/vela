import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadProjectEnv, parseEnvFile } from "./load-dotenv.mjs";

test("parseEnvFile reads KEY=VALUE, export, quotes, and skips comments", () => {
  const parsed = parseEnvFile(`
# comment
DATABASE_URL=postgresql://u:p@h:5432/vela
export BETTER_AUTH_URL=https://vela.example.com
BETTER_AUTH_SECRET="a b=c"
EMPTY=
NOT A KEY
-invalid=x
`);
  assert.equal(parsed.DATABASE_URL, "postgresql://u:p@h:5432/vela");
  assert.equal(parsed.BETTER_AUTH_URL, "https://vela.example.com");
  assert.equal(parsed.BETTER_AUTH_SECRET, "a b=c");
  assert.equal(parsed.EMPTY, "");
  assert.equal(parsed["-invalid"], undefined);
});

test("loadProjectEnv does not overwrite existing process.env", () => {
  const root = mkdtempSync(join(tmpdir(), "dotenv-"));
  writeFileSync(join(root, ".env"), "FROM_FILE=file\nFROM_BOTH=file\n");
  const prevFile = process.env.FROM_FILE;
  const prevBoth = process.env.FROM_BOTH;
  delete process.env.FROM_FILE;
  process.env.FROM_BOTH = "process";
  try {
    loadProjectEnv(root);
    assert.equal(process.env.FROM_FILE, "file");
    assert.equal(process.env.FROM_BOTH, "process");
  } finally {
    if (prevFile === undefined) delete process.env.FROM_FILE;
    else process.env.FROM_FILE = prevFile;
    if (prevBoth === undefined) delete process.env.FROM_BOTH;
    else process.env.FROM_BOTH = prevBoth;
  }
});
