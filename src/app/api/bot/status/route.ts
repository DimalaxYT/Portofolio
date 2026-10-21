import { NextResponse } from "next/server";
import { getBotStatus } from "@/lib/ping-bot";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(getBotStatus());
  } catch (e) {
    return apiError(e);
  }
}
