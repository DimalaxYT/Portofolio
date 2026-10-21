import crypto from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { AppError } from "./errors";
import { getSetting, setSetting, writeTransaction } from "./repository";
export { getSetting, setSetting } from "./repository";

export const SESSION_COOKIE = "pf_admin";
export const SESSION_TTL_S = 7 * 24 * 60 * 60;
const scrypt = promisify(crypto.scrypt);
async function hashPassword(password: string, salt: string) {
  return ((await scrypt(password, salt, 64)) as Buffer).toString("hex");
}
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
/** Bootstrap only once, under a write transaction. No public/default password. */
export async function ensureInit() {
  if (await getSetting("admin_password_hash")) return;
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12 || password.length > 256) {
    throw new AppError(
      503,
      "Configurez ADMIN_PASSWORD (12 à 256 caractères) pour initialiser l'administration.",
    );
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await hashPassword(password, salt);
  await writeTransaction(async (tx) => {
    const existing = await tx.execute(
      "SELECT key FROM settings WHERE key='admin_password_hash'",
    );
    if (existing.rows.length) return;
    for (const [key, value] of Object.entries({
      admin_password_salt: salt,
      admin_password_hash: hash,
      session_secret: crypto.randomBytes(32).toString("hex"),
    })) {
      await tx.execute({
        sql: "INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        args: [key, value],
      });
    }
  });
}
export async function verifyPassword(password: string) {
  await ensureInit();
  const [salt, hash] = await Promise.all([
    getSetting("admin_password_salt"),
    getSetting("admin_password_hash"),
  ]);
  return Boolean(
    salt && hash && safeEqual(await hashPassword(password, salt), hash),
  );
}
/** Atomic password + session key rotation: existing tokens become invalid. */
export async function changePassword(newPassword: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await hashPassword(newPassword, salt);
  await writeTransaction(async (tx) => {
    for (const [key, value] of Object.entries({
      admin_password_salt: salt,
      admin_password_hash: hash,
      session_secret: crypto.randomBytes(32).toString("hex"),
    })) {
      await tx.execute({
        sql: "UPDATE settings SET value=? WHERE key=?",
        args: [value, key],
      });
    }
  });
}
export function signSession(
  secret: string,
  expires = Date.now() + SESSION_TTL_S * 1000,
) {
  const mac = crypto
    .createHmac("sha256", secret)
    .update(String(expires))
    .digest("hex");
  return `${expires}.${mac}`;
}
export function validSession(token: string, secret: string, now = Date.now()) {
  const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expires = Number(match[1]);
  if (expires <= now || expires > now + SESSION_TTL_S * 1000) return false;
  return safeEqual(token, signSession(secret, expires));
}
export async function createSessionToken() {
  const secret = await getSetting("session_secret");
  if (!secret) throw new AppError(503, "Administration non initialisée");
  return signSession(secret);
}
export async function isAuthenticated() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = await getSetting("session_secret");
  return Boolean(secret && validSession(token, secret));
}
export async function requireAdmin() {
  if (!(await isAuthenticated())) throw new AppError(401, "Non autorisé");
}
export async function invalidateSessions() {
  await setSetting("session_secret", crypto.randomBytes(32).toString("hex"));
}
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_S,
};
