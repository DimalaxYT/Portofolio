import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "./errors";

export function assertSameOrigin(req: Request) {
  if (req.headers.get("sec-fetch-site") === "cross-site")
    throw new AppError(403, "Origine non autorisée");
  const origin = req.headers.get("origin");
  if (!origin) return; // Non-browser clients still need auth; reject cross-site browsers above.
  let supplied: URL;
  try {
    supplied = new URL(origin);
  } catch {
    throw new AppError(403, "Origine non autorisée");
  }
  const configured = process.env.APP_ORIGIN;
  const valid = configured
    ? supplied.origin === new URL(configured).origin
    : // Next may normalize req.url to the listening address behind a dev proxy.
      // The Host header, not a caller-provided X-Forwarded-Host, identifies the site.
      ["http:", "https:"].includes(supplied.protocol) &&
      supplied.host === (req.headers.get("host") || new URL(req.url).host);
  if (!valid) throw new AppError(403, "Origine non autorisée");
}
export async function readBytes(
  req: Request,
  limit: number,
): Promise<Uint8Array> {
  const length = Number(req.headers.get("content-length"));
  if (length > limit) throw new AppError(413, "Requête trop volumineuse");
  const reader = req.body?.getReader();
  if (!reader) throw new AppError(400, "Corps de requête manquant");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AppError(413, "Requête trop volumineuse");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}
export async function readJson<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new AppError(415, "JSON requis");
  let body: unknown;
  try {
    body = JSON.parse(
      new TextDecoder().decode(await readBytes(req, 64 * 1024)),
    );
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(400, "JSON invalide");
  }
  return schema.parse(body);
}
export function apiError(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Requête invalide" },
      { status: 400 },
    );
  // Never log connection URLs, tokens, request bodies or password hashes.
  console.error(
    "[api] Échec interne",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    { error: "Service indisponible. Réessayez plus tard." },
    { status: 503 },
  );
}
