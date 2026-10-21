import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import sharp from "sharp";
import { migrate } from "../scripts/migrate.mjs";
import { databaseConfig } from "../scripts/db-config.mjs";
import { getDb } from "../src/lib/db";
import * as repository from "../src/lib/repository";
import {
  artworkSchema,
  settingsSchema,
  reorderSchema,
  passwordSchema,
} from "../src/lib/validation";
import {
  ensureInit,
  verifyPassword,
  createSessionToken,
  changePassword,
  validSession,
  signSession,
  safeEqual,
} from "../src/lib/auth";
import {
  optimizeImage,
  storeImage,
  MAX_STORED_BYTES,
  MAX_UPLOAD_BYTES,
} from "../src/lib/media";
import { GET as getImage } from "../src/app/api/files/[name]/route";
import { GET as pingApi } from "../src/app/api/bot/ping/route";
import { consumeLimit, limitLogin } from "../src/lib/rate-limit";
import { assertSameOrigin, readBytes, readJson } from "../src/lib/http";
import { toClickableUrl } from "../src/lib/types";
import { applyArtworkOrder } from "../src/lib/artwork-order";
import {
  buildPingPayload,
  readConfig,
  runPing,
  getBotStatus,
} from "../src/lib/ping-bot";

const path = resolve(".local", `test-${randomUUID()}.db`);
const url = `file:${path}`;
before(async () => {
  await mkdir(".local", { recursive: true });
  process.env.TURSO_DATABASE_URL = url;
  delete process.env.TURSO_AUTH_TOKEN;
  await migrate(getDb());
});
after(async () => {
  getDb().close();
  delete (globalThis as typeof globalThis & { portfolioDb?: unknown })
    .portfolioDb;
  await Promise.all(
    ["", "-wal", "-shm"].map((suffix) => rm(path + suffix, { force: true })),
  );
});

const input = (title = "Mon projet", category: string | null = "Websites") =>
  artworkSchema.parse({ title, category, url: "example.com" });

test("configuration: no silent ephemeral fallback in production", () => {
  assert.throws(() => databaseConfig({}), /TURSO_DATABASE_URL/);
  assert.throws(
    () => databaseConfig({ TURSO_DATABASE_URL: url, NODE_ENV: "production" }),
    /interdite/,
  );
  assert.throws(
    () => databaseConfig({ TURSO_DATABASE_URL: "libsql://test.turso.io" }),
    /TURSO_AUTH_TOKEN/,
  );
  assert.equal(databaseConfig({ TURSO_DATABASE_URL: url }).url, url);
});

test("versioned migrations are idempotent and preserve existing data", async () => {
  await repository.setSetting("siteTitle", "Mon portfolio");
  await migrate(getDb());
  assert.equal(await repository.getSetting("siteTitle"), "Mon portfolio");
  assert.equal((await repository.listCategories()).length, 5);
  assert.equal(
    (await getDb().execute("SELECT * FROM schema_migrations")).rows.length,
    1,
  );
});

test("validation rejects wrong types, large fields, unsafe URLs and category bypass", () => {
  assert.equal(input().url, "example.com");
  assert.equal(
    toClickableUrl("example.com/path?q=x"),
    "https://example.com/path?q=x",
  );
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "https://user:password@example.com",
    "https://example.com\\@evil.com",
  ])
    assert.equal(toClickableUrl(url), null);
  assert.throws(() => artworkSchema.parse({ title: { nested: "wrong type" } }));
  assert.throws(() => artworkSchema.parse({ title: "x".repeat(161) }));
  assert.throws(() =>
    artworkSchema.parse({ title: "x", photo: "data:image/svg+xml,evil" }),
  );
  assert.throws(() =>
    artworkSchema.parse({ title: "x", link: "javascript:alert(1)" }),
  );
  assert.throws(() =>
    settingsSchema.parse({
      siteTitle: "a",
      heroTitle: "b",
      heroSubtitle: "",
      footerText: "",
      categories: "[]",
    }),
  );
  assert.throws(() => reorderSchema.parse({ ids: ["a", "a"] }));
  assert.throws(() =>
    passwordSchema.parse({ currentPassword: "old", newPassword: "short" }),
  );
});

test("CRUD and category relations: Unicode/case-insensitive rename/delete are atomic", async () => {
  await repository.mutateCategory("add", "École");
  await assert.rejects(
    repository.mutateCategory("add", "E\u0301COLE"),
    /existe déjà/,
  );
  const artwork = await repository.saveArtwork(input("Projet école", "école"));
  assert.equal(artwork.category, "École");
  await repository.mutateCategory("rename", "ÉCOLE", "Éducation");
  assert.equal(
    (await repository.listArtworks()).find((a) => a.id === artwork.id)
      ?.category,
    "Éducation",
  );
  await assert.rejects(
    repository.mutateCategory("rename", "éducation", "websites"),
    /existe déjà/,
  );
  assert.equal(
    (await repository.listArtworks()).find((a) => a.id === artwork.id)
      ?.category,
    "Éducation",
  );
  await repository.mutateCategory("delete", "ÉDUCATION");
  assert.equal(
    (await repository.listArtworks()).find((a) => a.id === artwork.id)
      ?.category,
    null,
  );
  await assert.rejects(
    repository.saveArtwork(input("Invalid", "does not exist")),
    /Catégorie inconnue/,
  );
  await assert.rejects(
    repository.saveArtwork({
      ...input(),
      photo: "/api/files/" + "a".repeat(64) + ".webp",
    }),
    /Image importée introuvable/,
  );
  await repository.deleteArtwork(artwork.id);
  await assert.rejects(repository.deleteArtwork(artwork.id), /introuvable/);
});

test("reorder checks the full unique ID set; UI order copies its rollback snapshot", async () => {
  const one = await repository.saveArtwork(input("Premier"));
  const two = await repository.saveArtwork(input("Deuxième"));
  const before = await repository.listArtworks();
  assert.deepEqual(
    before.map((a) => a.id),
    [two.id, one.id],
  );
  for (const ids of [[one.id], [one.id, one.id], [one.id, "missing"]])
    await assert.rejects(repository.reorderArtworks(ids), /a changé/);
  assert.deepEqual(
    (await repository.listArtworks()).map((a) => a.id),
    [two.id, one.id],
  );
  const optimistic = applyArtworkOrder(before, [one.id, two.id]);
  assert.deepEqual(
    optimistic.map((a) => a.id),
    [one.id, two.id],
  );
  assert.deepEqual(
    before.map((a) => a.id),
    [two.id, one.id],
  );
  await repository.reorderArtworks([one.id, two.id]);
  assert.deepEqual(
    (await repository.listArtworks()).map((a) => a.id),
    [one.id, two.id],
  );
  await repository.saveArtwork(input("Modifié"), one.id);
  assert.equal((await repository.listArtworks())[0].title, "Modifié");
});

test("settings update commits all fields without exposing private settings", async () => {
  const values = {
    siteTitle: "Titre",
    heroTitle: "Bienvenue",
    heroSubtitle: "Bonjour",
    footerText: "Copyright",
  };
  await repository.saveSettings(values);
  await repository.setSetting("session_secret", "not-public");
  const settings = await repository.readSettings();
  assert.equal(settings.siteTitle, values.siteTitle);
  assert.ok(!("session_secret" in settings));
  assert.ok(JSON.parse(settings.categories).includes("Websites"));
});

test("bootstrap has no default; async password hashing and rotation invalidate old sessions", async () => {
  delete process.env.ADMIN_PASSWORD;
  await assert.rejects(ensureInit(), /ADMIN_PASSWORD/);
  process.env.ADMIN_PASSWORD = "a-unique-test-password-1234";
  await ensureInit();
  assert.equal(await verifyPassword("admin123"), false);
  assert.equal(await verifyPassword(process.env.ADMIN_PASSWORD), true);
  const secret = (await repository.getSetting("session_secret"))!;
  const token = await createSessionToken();
  assert.equal(validSession(token, secret), true);
  assert.equal(validSession(token + ".extra", secret), false);
  assert.equal(validSession(token.slice(0, -1) + "z", secret), false);
  assert.equal(
    validSession(signSession(secret, Date.now() - 1000), secret),
    false,
  );
  assert.equal(safeEqual("short", "longer"), false);
  await changePassword("changed-test-password-9876");
  assert.equal(await verifyPassword(process.env.ADMIN_PASSWORD), false);
  assert.equal(await verifyPassword("changed-test-password-9876"), true);
  assert.equal(
    validSession(token, (await repository.getSetting("session_secret"))!),
    false,
  );
});

test("rate limiting uses shared durable counters, including login limits", async () => {
  await consumeLimit("test-limit", 2, 60_000);
  await consumeLimit("test-limit", 2, 60_000);
  await assert.rejects(
    consumeLimit("test-limit", 2, 60_000),
    /Trop de tentatives/,
  );
  const other = createClient({ url });
  try {
    assert.equal(
      (
        await other.execute(
          "SELECT hits FROM rate_limits WHERE key='test-limit'",
        )
      ).rows[0].hits,
      3,
    );
  } finally {
    other.close();
  }
  await getDb().execute(
    "UPDATE rate_limits SET expires_at=0 WHERE key='test-limit'",
  );
  await consumeLimit("test-limit", 2, 60_000);
  const req = new Request("http://localhost/api/auth/login");
  for (let i = 0; i < 10; i++) await limitLogin(req);
  await assert.rejects(limitLogin(req), /Trop de tentatives/);
});

test("CSRF and body readers reject cross-origin, malformed JSON and oversized streams", async () => {
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("https://portfolio.test/api", {
          headers: { origin: "https://evil.test" },
        }),
      ),
    /Origine/,
  );
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("https://portfolio.test/api", {
          headers: { "sec-fetch-site": "cross-site" },
        }),
      ),
    /Origine/,
  );
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("https://portfolio.test/api", {
        headers: { origin: "https://portfolio.test" },
      }),
    ),
  );
  await assert.rejects(
    readBytes(
      new Request("http://localhost", { method: "POST", body: "12345" }),
      4,
    ),
    /volumineuse/,
  );
  await assert.rejects(
    readJson(
      new Request("http://localhost", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      }),
      artworkSchema,
    ),
    /JSON invalide/,
  );
});

test("media: actual decode, safe WebP, size/pixel bounds, deduplication, durable serving and ETag", async () => {
  const source = await sharp({
    create: { width: 2400, height: 1800, channels: 3, background: "#112233" },
  })
    .png()
    .toBuffer();
  const optimized = await optimizeImage(source);
  const metadata = await sharp(optimized.data).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width! <= 1600);
  assert.ok(optimized.data.byteLength <= MAX_STORED_BYTES);
  assert.equal(metadata.exif, undefined);
  await assert.rejects(
    optimizeImage(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      ),
    ),
    /Formats acceptés/,
  );
  await assert.rejects(
    optimizeImage(Buffer.from("not an image")),
    /Image invalide/,
  );
  await assert.rejects(
    optimizeImage(new Uint8Array(MAX_UPLOAD_BYTES + 1)),
    /8 Mo/,
  );
  const mediaUrl = await storeImage(source);
  assert.equal(await storeImage(source), mediaUrl);
  assert.equal(
    (await getDb().execute("SELECT count(*) AS n FROM media")).rows[0].n,
    1,
  );
  const other = createClient({ url });
  try {
    assert.ok(
      Number(
        (await other.execute("SELECT length(data) AS n FROM media")).rows[0].n,
      ) > 0,
    );
  } finally {
    other.close();
  }
  const response = await getImage(new Request("http://localhost" + mediaUrl), {
    params: Promise.resolve({ name: optimized.name }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), optimized.data);
  const cached = await getImage(
    new Request("http://localhost" + mediaUrl, {
      headers: { "if-none-match": response.headers.get("etag")! },
    }),
    { params: Promise.resolve({ name: optimized.name }) },
  );
  assert.equal(cached.status, 304);
  assert.equal(
    (
      await getImage(new Request("http://localhost"), {
        params: Promise.resolve({ name: "../secret" }),
      })
    ).status,
    400,
  );
});

test("bot: exact Discord hostname, header-only cron auth, cooldown and no public secret", async () => {
  process.env.PING_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
  const discord = readConfig();
  assert.equal(discord.discordMode, true);
  assert.deepEqual(buildPingPayload(discord, "Hello"), {
    username: "Portfolio Bot",
    content: "Hello",
  });
  process.env.PING_WEBHOOK_URL =
    "https://evil.test/discord.com/api/webhooks/test";
  assert.equal(readConfig().discordMode, false);
  delete process.env.PING_BOT_SECRET;
  assert.equal(
    (await pingApi(new Request("http://localhost/api/bot/ping"))).status,
    401,
  );
  process.env.PING_BOT_SECRET = "test-cron-secret";
  assert.equal(
    (
      await pingApi(
        new Request("http://localhost/api/bot/ping?secret=test-cron-secret"),
      )
    ).status,
    401,
  );
  process.env.PING_MESSAGE = "test";
  const originalFetch = globalThis.fetch;
  let sent = 0;
  globalThis.fetch = async () => {
    sent++;
    return new Response(null, { status: 204 });
  };
  try {
    const request = new Request("http://localhost/api/bot/ping", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    assert.equal((await pingApi(request)).status, 200);
    assert.equal((await pingApi(request)).status, 429);
    assert.equal(sent, 1);
    assert.ok(!JSON.stringify(getBotStatus()).includes("test-cron-secret"));
    await assert.rejects(runPing("manual"), /vient de partir/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("last category is protected", async () => {
  const categories = await repository.listCategories();
  for (const category of categories.slice(1))
    await repository.mutateCategory("delete", category);
  await assert.rejects(
    repository.mutateCategory("delete", categories[0]),
    /dernière catégorie/,
  );
  assert.equal((await repository.listCategories()).length, 1);
});

test("failed multi-statement writes roll back every change", async () => {
  await assert.rejects(
    repository.writeTransaction(async (tx) => {
      await tx.execute(
        "INSERT INTO settings(key,value) VALUES ('must_rollback','temporary')",
      );
      await tx.execute("INSERT INTO table_that_does_not_exist VALUES (1)");
    }),
  );
  assert.equal(await repository.getSetting("must_rollback"), null);
});
