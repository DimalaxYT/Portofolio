import { test } from "node:test";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

test("production start fails closed before listening with an ephemeral database", () => {
  const child = spawnSync(process.execPath, ["scripts/start.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "development",
      TURSO_DATABASE_URL: "file:.local/forbidden.db",
    },
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /interdite en production/);
});

test("production start rejects missing/invalid public origins without connecting", () => {
  for (const origin of [
    "",
    "http://portfolio.test",
    "https://portfolio.test/path",
  ]) {
    const child = spawnSync(process.execPath, ["scripts/start.mjs"], {
      env: {
        ...process.env,
        TURSO_DATABASE_URL: "libsql://unused.turso.io",
        TURSO_AUTH_TOKEN: "unused",
        APP_ORIGIN: origin,
      },
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(child.status, 1);
    assert.match(child.stderr, /APP_ORIGIN/);
  }
});
