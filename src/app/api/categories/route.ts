import { NextRequest, NextResponse } from "next/server";
import { getSetting, isAuthenticated, setSetting } from "@/lib/auth";
import { parseCategories } from "@/lib/types";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CATEGORIES_KEY = "categories";

async function readCategories(): Promise<string[]> {
  return parseCategories(await getSetting(CATEGORIES_KEY));
}

async function writeCategories(list: string[]): Promise<void> {
  await setSetting(CATEGORIES_KEY, JSON.stringify(list));
}

/** Ajoute une catégorie (création). */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim().slice(0, 40);
    if (!name) {
      return NextResponse.json(
        { error: "Le nom de la catégorie est obligatoire" },
        { status: 400 }
      );
    }
    const list = await readCategories();
    if (list.some((c) => c.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json(
        { error: "Cette catégorie existe déjà" },
        { status: 409 }
      );
    }
    list.push(name);
    await writeCategories(list);
    return NextResponse.json({ categories: list }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

/** Renomme une catégorie et met à jour les œuvres concernées. */
export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const oldName = String(body?.old ?? "").trim();
    const newName = String(body?.new ?? "").trim().slice(0, 40);
    if (!oldName || !newName) {
      return NextResponse.json(
        { error: "Ancien et nouveau noms requis" },
        { status: 400 }
      );
    }
    const list = await readCategories();
    const idx = list.findIndex(
      (c) => c.toLowerCase() === oldName.toLowerCase()
    );
    if (idx === -1) {
      return NextResponse.json(
        { error: "Catégorie introuvable" },
        { status: 404 }
      );
    }
    if (
      list.some(
        (c) => c.toLowerCase() === newName.toLowerCase() && c !== list[idx]
      )
    ) {
      return NextResponse.json(
        { error: "Cette catégorie existe déjà" },
        { status: 409 }
      );
    }
    list[idx] = newName;
    await writeCategories(list);
    await db.artwork.updateMany({
      where: { category: oldName },
      data: { category: newName },
    });
    return NextResponse.json({ categories: list });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

/** Supprime une catégorie : les œuvres associées deviennent « sans catégorie ». */
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Nom de la catégorie requis" },
        { status: 400 }
      );
    }
    const list = await readCategories();
    const next = list.filter((c) => c.toLowerCase() !== name.toLowerCase());
    if (next.length === list.length) {
      return NextResponse.json(
        { error: "Catégorie introuvable" },
        { status: 404 }
      );
    }
    if (next.length === 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer la dernière catégorie" },
        { status: 400 }
      );
    }
    await writeCategories(next);
    await db.artwork.updateMany({
      where: { category: name },
      data: { category: null },
    });
    return NextResponse.json({ categories: next });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
