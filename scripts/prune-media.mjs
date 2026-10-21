import { createClient } from "@libsql/client";
import { databaseConfig } from "./db-config.mjs";
const db = createClient(databaseConfig());
try {
  // Retain recent uploads for 24 hours so an open form is never broken immediately.
  const args = [new Date(Date.now() - 24 * 3600_000).toISOString()];
  const where =
    "created_at < ? AND NOT EXISTS (SELECT 1 FROM artworks WHERE photo = '/api/files/' || media.name)";
  const count = await db.execute({
    sql: `SELECT count(*) AS n FROM media WHERE ${where}`,
    args,
  });
  if (process.argv.includes("--apply")) {
    const result = await db.execute({
      sql: `DELETE FROM media WHERE ${where}`,
      args,
    });
    console.log(
      `${result.rowsAffected} image(s) non référencée(s) supprimée(s).`,
    );
  } else
    console.log(
      `${count.rows[0].n} image(s) non référencée(s). Relancer avec --apply pour supprimer.`,
    );
} finally {
  db.close();
}
