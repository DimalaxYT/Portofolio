import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readConfig, runPing } from "@/lib/ping-bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Déclenche un ping immédiat vers le webhook.
 * Accepte GET (compatible crons externes type cron-job.org / UptimeRobot)
 * et POST (bouton « Tester » du dashboard).
 *
 * Si PING_BOT_SECRET est défini, la requête doit fournir le secret via
 * « Authorization: Bearer <secret> », l'en-tête « x-bot-secret » ou
 * « ?secret= » — sauf si l'appelant est un administrateur connecté
 * (session du dashboard).
 */
function extractSecret(request: Request): string | null {
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const url = new URL(request.url);
  return (
    bearer ??
    request.headers.get("x-bot-secret") ??
    url.searchParams.get("secret")
  );
}

async function handle(request: Request) {
  const config = readConfig();
  if (config.secret) {
    const admin = await isAuthenticated().catch(() => false);
    if (!admin && extractSecret(request) !== config.secret) {
      return NextResponse.json(
        { error: "Secret requis (PING_BOT_SECRET)" },
        { status: 401 }
      );
    }
  }

  const result = await runPing("manual");
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
