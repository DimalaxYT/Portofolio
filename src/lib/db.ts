import { createClient, type Client } from "@libsql/client";
import { databaseConfig } from "../../scripts/db-config.mjs";

const globalDb = globalThis as typeof globalThis & { portfolioDb?: Client };

/** Lazy initialization also allows `next build` without production secrets. */
export function getDb(): Client {
  return (globalDb.portfolioDb ??= createClient(databaseConfig()));
}
