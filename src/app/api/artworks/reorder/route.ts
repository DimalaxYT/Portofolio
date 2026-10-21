import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

/** Réordonne les sites : reçoit la liste complète des ids dans l'ordre d'affichage voulu. */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const ids: unknown = body?.ids;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "Liste invalide" }, { status: 400 });
    }
    await db.$transaction(
      (ids as string[]).map((id, index) =>
        db.artwork.update({ where: { id }, data: { order: index } })
      )
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Réordonnancement impossible" },
      { status: 400 }
    );
  }
}
