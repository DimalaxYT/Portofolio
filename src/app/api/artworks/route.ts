import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function GET() {
  const artworks = await db.artwork.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(artworks);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const title = strOrNull(body?.title);
    if (!title) {
      return NextResponse.json(
        { error: "Le titre est obligatoire" },
        { status: 400 }
      );
    }
    // Les nouveaux sites apparaissent en premier
    const min = await db.artwork.aggregate({ _min: { order: true } });
    const artwork = await db.artwork.create({
      data: {
        title,
        url: strOrNull(body?.url),
        photo: strOrNull(body?.photo),
        description: strOrNull(body?.description),
        link: strOrNull(body?.link),
        category: strOrNull(body?.category),
        order: (min._min.order ?? 0) - 1,
      },
    });
    return NextResponse.json(artwork, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
