import { NextResponse } from "next/server";
import { isAuthenticated, safeEqual } from "@/lib/auth";
import { readConfig, runPing } from "@/lib/ping-bot";
import { apiError, assertSameOrigin } from "@/lib/http";
import { AppError } from "@/lib/errors";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function handle(request: Request) {
  try {
    const config = readConfig();
    const bearer = request.headers.get("authorization");
    const supplied = bearer?.startsWith("Bearer ")
      ? bearer.slice(7)
      : request.headers.get("x-bot-secret");
    const secretValid = Boolean(
      config.secret && supplied && safeEqual(supplied, config.secret),
    );
    if (!secretValid) {
      // GET with cookies would be CSRF-prone. Cron GET requires a header secret.
      if (request.method !== "POST") throw new AppError(401, "Secret requis");
      assertSameOrigin(request);
      if (!(await isAuthenticated())) throw new AppError(401, "Non autorisé");
    }
    if (!config.webhookUrl) throw new AppError(503, "Webhook non configuré");
    const result = await runPing("manual");
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (e) {
    return apiError(e);
  }
}
export const GET = handle;
export const POST = handle;
