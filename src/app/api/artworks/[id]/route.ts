import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const title = strOrNull(body?.title);
    if (!title) {
      return NextResponse.json(
        { error: "Le titre est obligatoire" },
        { status: 400 }
      );
    }
    const artwork = await db.artwork.update({
      where: { id },
      data: {
        title,
        url: strOrNull(body?.url),
        photo: strOrNull(body?.photo),
        description: strOrNull(body?.description),
        link: strOrNull(body?.link),
        category: strOrNull(body?.category),
      },
    });
    return NextResponse.json(artwork);
  } catch {
    return NextResponse.json(
      { error: "Site introuvable ou requête invalide" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await db.artwork.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Site introuvable" }, { status: 404 });
  }
}
