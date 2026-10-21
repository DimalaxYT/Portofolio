import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readSettings, saveSettings } from "@/lib/repository";
import { apiError, assertSameOrigin, readJson } from "@/lib/http";
import { settingsSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(await readSettings());
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    await saveSettings(await readJson(req, settingsSchema));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
