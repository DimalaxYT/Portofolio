import { NextRequest, NextResponse } from "next/server";
import { getSetting, isAuthenticated, setSetting } from "@/lib/auth";
import { DEFAULT_SETTINGS, SETTINGS_KEYS, type SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await Promise.all(
    SETTINGS_KEYS.map(async (key) => [key, await getSetting(key)] as const)
  );
  const settings = { ...DEFAULT_SETTINGS };
  for (const [key, value] of entries) {
    if (value != null && value !== "") {
      settings[key] = value;
    }
  }
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const body = await req.json();
    for (const key of SETTINGS_KEYS) {
      const value = body?.[key];
      if (typeof value === "string") {
        await setSetting(key, value.trim());
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
