import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { getDb } from "./db";
import { AppError } from "./errors";

/** Shared by all Render instances; windows and counters survive restarts. */
export async function consumeLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const result = await getDb().execute({
    sql: `INSERT INTO rate_limits(key,hits,expires_at) VALUES (?,1,?)
      ON CONFLICT(key) DO UPDATE SET
      hits=CASE WHEN expires_at<=? THEN 1 ELSE hits+1 END,
      expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END
      RETURNING hits`,
    args: [key, now + windowMs, now, now],
  });
  if (Number(result.rows[0].hits) > max)
    throw new AppError(429, "Trop de tentatives. Réessayez plus tard.");
}
export async function limitLogin(req: Request) {
  // Render appends the connecting address. Do not trust the first user-supplied XFF value.
  const address =
    process.env.TRUST_PROXY === "true"
      ? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
      : null;
  const ip = address && isIP(address) ? address : "untrusted";
  const hash = createHash("sha256").update(ip).digest("hex");
  await getDb().execute({
    sql: "DELETE FROM rate_limits WHERE expires_at < ?",
    args: [Date.now()],
  });
  await consumeLimit("login:global", 100, 15 * 60_000);
  await consumeLimit(`login:${hash}`, 10, 15 * 60_000);
}
