import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "pf_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
export const SESSION_TTL_S = SESSION_TTL_MS / 1000;
export const DEFAULT_ADMIN_PASSWORD = "admin123";

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** Crée les réglages de base (mot de passe par défaut + secret de session) au premier lancement. */
export async function ensureInit(): Promise<void> {
  if (!(await getSetting("admin_password_hash"))) {
    const salt = crypto.randomBytes(16).toString("hex");
    await setSetting("admin_password_salt", salt);
    await setSetting(
      "admin_password_hash",
      hashPassword(DEFAULT_ADMIN_PASSWORD, salt)
    );
  }
  if (!(await getSetting("session_secret"))) {
    await setSetting("session_secret", crypto.randomBytes(32).toString("hex"));
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  await ensureInit();
  const salt = await getSetting("admin_password_salt");
  const hash = await getSetting("admin_password_hash");
  if (!salt || !hash) return false;
  return safeEqual(hashPassword(password, salt), hash);
}

/** Change le mot de passe et fait tourner le secret de session (invalide les autres sessions). */
export async function changePassword(newPassword: string): Promise<void> {
  await ensureInit();
  const salt = crypto.randomBytes(16).toString("hex");
  await setSetting("admin_password_salt", salt);
  await setSetting(
    "admin_password_hash",
    hashPassword(newPassword, salt)
  );
  await setSetting("session_secret", crypto.randomBytes(32).toString("hex"));
}

export async function createSessionToken(): Promise<string> {
  await ensureInit();
  const secret = (await getSetting("session_secret")) ?? "fallback";
  const expires = Date.now() + SESSION_TTL_MS;
  const mac = crypto
    .createHmac("sha256", secret)
    .update(String(expires))
    .digest("hex");
  return `${expires}.${mac}`;
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const [expires, mac] = token.split(".");
  if (!expires || !mac) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const secret = await getSetting("session_secret");
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(expires)
    .digest("hex");
  return safeEqual(mac, expected);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_S,
};
