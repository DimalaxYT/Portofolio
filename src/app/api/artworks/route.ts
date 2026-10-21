import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listArtworks, saveArtwork } from "@/lib/repository";
import { apiError, assertSameOrigin, readJson } from "@/lib/http";
import { artworkSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(await listArtworks());
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    return NextResponse.json(
      await saveArtwork(await readJson(req, artworkSchema)),
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
