import sharp, { type Metadata } from "sharp";
import { createHash } from "node:crypto";
import { AppError } from "./errors";
import { getDb } from "./db";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_STORED_BYTES = 256 * 1024;

/** Decode, rotate, resize and re-encode: no SVG, metadata or animated payloads. */
export async function optimizeImage(input: Uint8Array) {
  if (!input.length || input.length > MAX_UPLOAD_BYTES)
    throw new AppError(413, "Image vide ou supérieure à 8 Mo");
  const source = sharp(input, {
    limitInputPixels: 24_000_000,
    animated: false,
    failOn: "warning",
  });
  let metadata: Metadata;
  try {
    metadata = await source.metadata();
  } catch {
    throw new AppError(415, "Image invalide");
  }
  if (
    !["jpeg", "png", "webp", "avif"].includes(metadata.format ?? "") ||
    (metadata.pages ?? 1) > 1
  ) {
    throw new AppError(
      415,
      "Formats acceptés : JPEG, PNG, WebP ou AVIF non animés",
    );
  }
  for (const [width, quality] of [
    [1600, 80],
    [1280, 65],
    [960, 50],
  ] as const) {
    let output: Buffer;
    try {
      output = await source
        .clone()
        .rotate()
        .resize({
          width,
          height: width,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 4 })
        .toBuffer();
    } catch {
      throw new AppError(
        415,
        "Image invalide ou trop grande (24 mégapixels maximum)",
      );
    }
    if (output.byteLength <= MAX_STORED_BYTES) {
      const name = `${createHash("sha256").update(output).digest("hex")}.webp`;
      return { name, data: output };
    }
  }
  throw new AppError(
    413,
    "Image trop complexe après compression. Réduisez sa taille avant l'import.",
  );
}
export async function storeImage(input: Uint8Array) {
  const image = await optimizeImage(input);
  await getDb().execute({
    sql: "INSERT INTO media(name,data,created_at) VALUES (?,?,?) ON CONFLICT(name) DO NOTHING",
    args: [image.name, image.data, new Date().toISOString()],
  });
  return `/api/files/${image.name}`;
}
