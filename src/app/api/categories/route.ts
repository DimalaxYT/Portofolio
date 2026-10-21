import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listCategories, mutateCategory } from "@/lib/repository";
import { apiError, assertSameOrigin, readJson } from "@/lib/http";
import { categorySchema, renameCategorySchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json({ categories: await listCategories() });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    return NextResponse.json(
      {
        categories: await mutateCategory(
          "add",
          (await readJson(req, categorySchema)).name,
        ),
      },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const body = await readJson(req, renameCategorySchema);
    return NextResponse.json({
      categories: await mutateCategory("rename", body.old, body.new),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    return NextResponse.json({
      categories: await mutateCategory(
        "delete",
        (await readJson(req, categorySchema)).name,
      ),
    });
  } catch (e) {
    return apiError(e);
  }
}
