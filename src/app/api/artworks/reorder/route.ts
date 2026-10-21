import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { reorderArtworks } from "@/lib/repository";
import { apiError, assertSameOrigin, readJson } from "@/lib/http";
import { reorderSchema } from "@/lib/validation";
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    await reorderArtworks((await readJson(req, reorderSchema)).ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
