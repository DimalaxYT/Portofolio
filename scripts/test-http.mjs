// Isolated end-to-end runner. Uses no Turso account, secrets or existing database.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, rm } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { migrate } from "./migrate.mjs";

const listener = createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const path = resolve(".local", `http-${randomUUID()}.db`);
await mkdir(".local", { recursive: true });
const url = `file:${path}`;
const client = createClient({ url });
try {
  await migrate(client);
} finally {
  client.close();
}
const base = `http://localhost:${port}`;
const password = randomBytes(24).toString("hex");
const env = {
  ...process.env,
  NODE_ENV: "development",
  TURSO_DATABASE_URL: url,
  TURSO_AUTH_TOKEN: "",
  ADMIN_PASSWORD: password,
  APP_ORIGIN: base,
  TRUST_PROXY: "false",
  PING_WEBHOOK_URL: "",
  PING_BOT_SECRET: "",
  PING_INTERNAL_SCHEDULER: "false",
};
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "0.0.0.0",
    "--port",
    String(port),
  ],
  { env, detached: true, stdio: ["ignore", "pipe", "pipe"] },
);
const closed = new Promise((resolve) => server.once("close", resolve));
let log = "";
let timer;
try {
  await new Promise((resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error("Test server startup timed out")),
      60_000,
    );
    const read = (data) => {
      log = (log + data).slice(-12_000);
      if (log.includes("Ready in")) resolve();
    };
    server.stdout.on("data", read);
    server.stderr.on("data", read);
    server.once("error", reject);
    server.once("exit", (code) =>
      reject(new Error(`Test server exited: ${code}`)),
    );
  });
  clearTimeout(timer);
  const tests = spawn(process.execPath, ["--test", "tests/http.smoke.mjs"], {
    env: { ...env, SMOKE_BASE_URL: base, SMOKE_ADMIN_PASSWORD: password },
    stdio: "inherit",
  });
  const code = await new Promise((resolve, reject) => {
    tests.once("error", reject);
    tests.once("exit", resolve);
  });
  if (code !== 0) {
    console.error(log);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message, log);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already exited */
  }
  const force = setTimeout(() => {
    try {
      process.kill(-server.pid, "SIGKILL");
    } catch {
      /* already exited */
    }
  }, 5000);
  await closed;
  clearTimeout(force);
  await Promise.all(
    ["", "-wal", "-shm"].map((suffix) => rm(path + suffix, { force: true })),
  );
}
