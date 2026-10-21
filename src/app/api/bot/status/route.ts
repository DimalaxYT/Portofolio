import { NextResponse } from "next/server";
import { getBotStatus } from "@/lib/ping-bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Statut du bot de ping (jamais l'URL complète du webhook). */
export async function GET() {
  return NextResponse.json(getBotStatus());
}
