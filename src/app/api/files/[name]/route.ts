import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // Sécurité : nom de fichier strictement alphanumérique, pas de traversal de chemin
  if (!/^[a-zA-Z0-9-]+\.[a-z0-9]{1,5}$/.test(name)) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  try {
    const data = await fs.readFile(path.join(process.cwd(), "uploads", name));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
  }
}
