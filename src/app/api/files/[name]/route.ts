import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!/^[a-f0-9]{64}\.webp$/.test(name))
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  const headers = {
    "Content-Type": "image/webp",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    ETag: `"${name}"`,
  };
  try {
    const result = await getDb().execute({
      sql: "SELECT data FROM media WHERE name=?",
      args: [name],
    });
    if (!result.rows.length)
      return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
    if (req.headers.get("if-none-match") === headers.ETag)
      return new Response(null, { status: 304, headers });
    const data = result.rows[0].data as ArrayBuffer;
    return new Response(new Uint8Array(data), { headers });
  } catch (e) {
    return apiError(e);
  }
}
