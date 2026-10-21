import { createClient } from "@libsql/client";
import { databaseConfig } from "./db-config.mjs";
import { migrate } from "./migrate.mjs";

// Render supplies PORT. Validate and migrate in production mode BEFORE listening.
process.env.NODE_ENV = "production";
process.env.HOSTNAME = "0.0.0.0";
let client;
try {
  const config = databaseConfig();
  const origin = process.env.APP_ORIGIN;
  if (!origin)
    throw new Error(
      "APP_ORIGIN manquant (ex. https://votre-site.onrender.com).",
    );
  const parsed = new URL(origin);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "APP_ORIGIN doit être une origine HTTPS publique, sans chemin ni identifiants.",
    );
  }
  client = createClient(config);
  await migrate(client);
  const initialized = await client.execute(
    "SELECT key FROM settings WHERE key='admin_password_hash'",
  );
  if (
    !initialized.rows.length &&
    (!process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD.length < 12 ||
      process.env.ADMIN_PASSWORD.length > 256)
  ) {
    throw new Error(
      "ADMIN_PASSWORD requis (12 à 256 caractères) pour la première connexion.",
    );
  }
} catch (error) {
  console.error("[startup]", error.message);
  process.exitCode = 1;
} finally {
  client?.close();
}
if (!process.exitCode) await import("../.next/standalone/server.js");
