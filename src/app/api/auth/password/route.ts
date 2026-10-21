import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  changePassword,
  createSessionToken,
  isAuthenticated,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const current =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const next = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (!(await verifyPassword(current))) {
      return NextResponse.json(
        { error: "Le mot de passe actuel est incorrect" },
        { status: 400 }
      );
    }
    if (next.length < 6) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }
    await changePassword(next);
    // Re-émet une session fraîche (les anciens tokens sont invalidés par la rotation du secret)
    const token = await createSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
