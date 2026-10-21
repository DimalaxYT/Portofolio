import { createClient } from "@libsql/client";
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { databaseConfig } from "./db-config.mjs";

export async function migrate(client) {
  await client.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const folder = new URL("../migrations/", import.meta.url);
  for (const name of (await readdir(folder))
    .filter((n) => /^\d+.*\.sql$/.test(n))
    .sort()) {
    const tx = await client.transaction("write");
    try {
      const existing = await tx.execute({
        sql: "SELECT name FROM schema_migrations WHERE name = ?",
        args: [name],
      });
      if (!existing.rows.length) {
        const sql = await readFile(new URL(name, folder), "utf8");
        for (const statement of sql
          .split("-- statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean)) {
          await tx.execute(statement);
        }
        await tx.execute({
          sql: "INSERT INTO schema_migrations VALUES (?, ?)",
          args: [name, new Date().toISOString()],
        });
        console.log(`Migration appliquée : ${name}`);
      }
      await tx.commit();
    } finally {
      tx.close();
    }
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  let client;
  try {
    client = createClient(databaseConfig());
    await migrate(client);
  } catch (error) {
    console.error(
      "Migration impossible :",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    client?.close();
  }
}
