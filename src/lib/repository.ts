import { randomUUID } from "node:crypto";
import type { Transaction, Row } from "@libsql/client";
import { getDb } from "./db";
import { AppError } from "./errors";
import { normalizeCategory, type ArtworkInput } from "./validation";
import { DEFAULT_SETTINGS, type Artwork, type SiteSettings } from "./types";

const selectArtworks = `SELECT a.id, a.title, a.url, a.photo, a.description, a.link,
 c.name AS category, a.sort_order AS "order", a.created_at AS createdAt, a.updated_at AS updatedAt
 FROM artworks a LEFT JOIN categories c ON c.id = a.category_id`;
function mapArtwork(row: Row): Artwork {
  return {
    id: String(row.id),
    title: String(row.title),
    url: row.url == null ? null : String(row.url),
    photo: row.photo == null ? null : String(row.photo),
    description: row.description == null ? null : String(row.description),
    link: row.link == null ? null : String(row.link),
    category: row.category == null ? null : String(row.category),
    order: Number(row.order),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}
export async function listArtworks(): Promise<Artwork[]> {
  const result = await getDb().execute(
    `${selectArtworks} ORDER BY a.sort_order, a.created_at DESC`,
  );
  return result.rows.map(mapArtwork);
}
export async function countArtworks() {
  return Number(
    (await getDb().execute("SELECT count(*) AS n FROM artworks")).rows[0].n,
  );
}
export async function listCategories() {
  return (
    await getDb().execute("SELECT name FROM categories ORDER BY rowid")
  ).rows.map((r) => String(r.name));
}
export async function readSettings(): Promise<SiteSettings> {
  const [result, categories] = await Promise.all([
    getDb().execute(
      "SELECT key, value FROM settings WHERE key IN ('siteTitle', 'heroTitle', 'heroSubtitle', 'footerText')",
    ),
    listCategories(),
  ]);
  const values = Object.fromEntries(
    result.rows.map((r) => [String(r.key), String(r.value)]),
  );
  return {
    ...DEFAULT_SETTINGS,
    ...values,
    categories: JSON.stringify(categories),
  };
}
export async function writeTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const tx = await getDb().transaction("write");
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } finally {
    tx.close();
  }
}
export async function saveSettings(settings: Omit<SiteSettings, "categories">) {
  await writeTransaction(async (tx) => {
    for (const [key, value] of Object.entries(settings)) {
      await tx.execute({
        sql: "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [key, value],
      });
    }
  });
}
export async function saveArtwork(
  input: ArtworkInput,
  id?: string,
): Promise<Artwork> {
  return writeTransaction(async (tx) => {
    let categoryId: string | null = null;
    if (input.category) {
      const category = await tx.execute({
        sql: "SELECT id FROM categories WHERE normalized_name = ?",
        args: [normalizeCategory(input.category)],
      });
      if (!category.rows.length) throw new AppError(400, "Catégorie inconnue");
      categoryId = String(category.rows[0].id);
    }
    if (input.photo?.startsWith("/api/files/")) {
      const media = await tx.execute({
        sql: "SELECT name FROM media WHERE name = ?",
        args: [input.photo.slice("/api/files/".length)],
      });
      if (!media.rows.length)
        throw new AppError(400, "Image importée introuvable");
    }
    const now = new Date().toISOString();
    if (id) {
      const result = await tx.execute({
        sql: "UPDATE artworks SET title=?, url=?, photo=?, description=?, link=?, category_id=?, updated_at=? WHERE id=?",
        args: [
          input.title,
          input.url,
          input.photo,
          input.description,
          input.link,
          categoryId,
          now,
          id,
        ],
      });
      if (!result.rowsAffected)
        throw new AppError(404, "Réalisation introuvable");
    } else {
      id = randomUUID();
      await tx.execute({
        sql: "INSERT INTO artworks(id,title,url,photo,description,link,category_id,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,(SELECT coalesce(min(sort_order),0)-1 FROM artworks),?,?)",
        args: [
          id,
          input.title,
          input.url,
          input.photo,
          input.description,
          input.link,
          categoryId,
          now,
          now,
        ],
      });
    }
    return mapArtwork(
      (await tx.execute({ sql: `${selectArtworks} WHERE a.id=?`, args: [id] }))
        .rows[0],
    );
  });
}
export async function deleteArtwork(id: string) {
  const result = await getDb().execute({
    sql: "DELETE FROM artworks WHERE id = ?",
    args: [id],
  });
  if (!result.rowsAffected) throw new AppError(404, "Réalisation introuvable");
}
export async function reorderArtworks(ids: string[]) {
  await writeTransaction(async (tx) => {
    const current = (await tx.execute("SELECT id FROM artworks")).rows.map(
      (r) => String(r.id),
    );
    if (
      new Set(ids).size !== ids.length ||
      current.length !== ids.length ||
      current.some((id) => !ids.includes(id))
    ) {
      throw new AppError(
        409,
        "La liste des projets a changé. Rechargez puis réessayez.",
      );
    }
    if (ids.length)
      await tx.batch(
        ids.map((id, index) => ({
          sql: "UPDATE artworks SET sort_order=? WHERE id=?",
          args: [index, id],
        })),
      );
  });
}
export async function mutateCategory(
  action: "add" | "rename" | "delete",
  name: string,
  newName?: string,
) {
  await writeTransaction(async (tx) => {
    const key = normalizeCategory(name);
    const current = await tx.execute({
      sql: "SELECT id FROM categories WHERE normalized_name=?",
      args: [key],
    });
    if (action === "add") {
      if (current.rows.length)
        throw new AppError(409, "Cette catégorie existe déjà");
      await tx.execute({
        sql: "INSERT INTO categories VALUES (?,?,?)",
        args: [randomUUID(), name, key],
      });
      return;
    }
    if (!current.rows.length) throw new AppError(404, "Catégorie introuvable");
    const id = String(current.rows[0].id);
    if (action === "rename" && newName) {
      const collision = await tx.execute({
        sql: "SELECT id FROM categories WHERE normalized_name=? AND id<>?",
        args: [normalizeCategory(newName), id],
      });
      if (collision.rows.length)
        throw new AppError(409, "Cette catégorie existe déjà");
      await tx.execute({
        sql: "UPDATE categories SET name=?, normalized_name=? WHERE id=?",
        args: [newName, normalizeCategory(newName), id],
      });
    } else {
      const count = Number(
        (await tx.execute("SELECT count(*) AS n FROM categories")).rows[0].n,
      );
      if (count <= 1)
        throw new AppError(
          400,
          "Impossible de supprimer la dernière catégorie",
        );
      // Explicit for libSQL connections with foreign_keys disabled; remains atomic.
      await tx.execute({
        sql: "UPDATE artworks SET category_id=NULL WHERE category_id=?",
        args: [id],
      });
      await tx.execute({
        sql: "DELETE FROM categories WHERE id=?",
        args: [id],
      });
    }
  });
  return listCategories();
}
export async function getSetting(key: string): Promise<string | null> {
  const result = await getDb().execute({
    sql: "SELECT value FROM settings WHERE key=?",
    args: [key],
  });
  return result.rows.length ? String(result.rows[0].value) : null;
}
export async function setSetting(key: string, value: string) {
  await getDb().execute({
    sql: "INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    args: [key, value],
  });
}
