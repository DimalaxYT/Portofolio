import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, assertSameOrigin, readBytes } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { consumeLimit } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES, storeImage } from "@/lib/media";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    await consumeLimit("upload", 20, 60_000);
    const type = req.headers.get("content-type") ?? "";
    if (!type.startsWith("multipart/form-data;"))
      throw new AppError(415, "Formulaire multipart requis");
    const bytes = await readBytes(req, MAX_UPLOAD_BYTES + 16 * 1024);
    let form: FormData;
    try {
      form = await new Response(bytes as BodyInit, {
        headers: { "Content-Type": type },
      }).formData();
    } catch {
      throw new AppError(400, "Formulaire invalide");
    }
    const files = form.getAll("file");
    if (files.length !== 1 || !(files[0] instanceof File))
      throw new AppError(400, "Un fichier image est requis");
    return NextResponse.json(
      { url: await storeImage(new Uint8Array(await files[0].arrayBuffer())) },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
