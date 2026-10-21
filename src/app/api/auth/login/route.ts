import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { apiError, assertSameOrigin, readJson } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { limitLogin } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await limitLogin(req);
    const { password } = await readJson(req, loginSchema);
    if (!(await verifyPassword(password)))
      throw new AppError(401, "Mot de passe incorrect");
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
