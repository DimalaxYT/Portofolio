import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  changePassword,
  createSessionToken,
  requireAdmin,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { apiError, assertSameOrigin, readJson } from "@/lib/http";
import { passwordSchema } from "@/lib/validation";
import { consumeLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    await consumeLimit("password", 10, 15 * 60_000);
    const body = await readJson(req, passwordSchema);
    if (!(await verifyPassword(body.currentPassword)))
      throw new AppError(400, "Mot de passe actuel incorrect");
    await changePassword(body.newPassword);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      SESSION_COOKIE,
      await createSessionToken(),
      sessionCookieOptions,
    );
    return res;
  } catch (e) {
    return apiError(e);
  }
}
