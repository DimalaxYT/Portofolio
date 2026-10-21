import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  isAuthenticated,
  invalidateSessions,
} from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (await isAuthenticated()) await invalidateSessions();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    return res;
  } catch (e) {
    return apiError(e);
  }
}
