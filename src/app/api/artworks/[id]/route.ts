import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteArtwork, saveArtwork } from "@/lib/repository";
import { apiError, assertSameOrigin, readJson } from "@/lib/http";
import { artworkSchema } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: Context) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    return NextResponse.json(
      await saveArtwork(await readJson(req, artworkSchema), (await params).id),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(req: Request, { params }: Context) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    await deleteArtwork((await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
