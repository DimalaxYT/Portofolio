import "dotenv/config";

/** No implicit local fallback: production must never silently lose data.
 * @param {Record<string, string | undefined>} env
 * @returns {import("@libsql/client").Config} */
export function databaseConfig(env = process.env) {
  const url = env.TURSO_DATABASE_URL?.trim();
  if (!url)
    throw new Error(
      "TURSO_DATABASE_URL manquant. Consultez .env.example et README.md.",
    );
  const local = url.startsWith("file:");
  if (!local && !url.startsWith("libsql://") && !url.startsWith("https://")) {
    throw new Error(
      "TURSO_DATABASE_URL doit utiliser libsql:// ou https:// (file: en développement).",
    );
  }
  if (local && env.NODE_ENV === "production") {
    throw new Error(
      "Une base file: est interdite en production : utilisez Turso distant.",
    );
  }
  if (!local && !env.TURSO_AUTH_TOKEN?.trim())
    throw new Error("TURSO_AUTH_TOKEN manquant.");
  return {
    url,
    authToken: local ? undefined : env.TURSO_AUTH_TOKEN.trim(),
    intMode: "number",
  };
}
