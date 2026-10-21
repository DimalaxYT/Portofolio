// Run against an isolated development database only (never production).
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const base = process.env.SMOKE_BASE_URL;
const password = process.env.SMOKE_ADMIN_PASSWORD;
if (!base || !password)
  throw new Error(
    "Set SMOKE_BASE_URL and SMOKE_ADMIN_PASSWORD for an isolated test server.",
  );
const origin = new URL(base).origin;

test("HTTP: auth, CSRF, category CRUD, multipart upload, public SSR, reorder and logout", async () => {
  let cookie = "";
  const ids = [];
  let category = `Smoke-${randomUUID().slice(0, 8)}`;
  let categoryCreated = false;
  const request = (
    path,
    method = "GET",
    data,
    authenticated = true,
    extraHeaders = {},
  ) =>
    fetch(base + path, {
      method,
      headers: {
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
        ...(authenticated && cookie ? { cookie } : {}),
        ...extraHeaders,
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  const login = await request("/api/auth/login", "POST", { password }, false, {
    origin,
  });
  assert.equal(login.status, 200, await login.text());
  const setCookie = login.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=lax/i);
  cookie = setCookie.split(";")[0];
  try {
    assert.equal((await request("/api/health")).status, 200);
    assert.equal(
      (await request("/api/artworks", "POST", { title: "Denied" }, false))
        .status,
      401,
    );
    assert.equal(
      (await request("/api/bot/ping", "GET", undefined, false)).status,
      401,
    );
    assert.equal(
      (await request("/api/bot/status", "GET", undefined, false)).status,
      401,
    );
    assert.equal(
      (
        await request("/api/settings", "PUT", {}, true, {
          origin: "https://evil.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (await request("/api/artworks", "POST", { title: { invalid: true } }))
        .status,
      400,
    );
    assert.equal(
      (await request("/api/categories", "POST", { name: category })).status,
      201,
    );
    categoryCreated = true;
    const png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#abc123" },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set("file", new Blob([png], { type: "image/png" }), "photo.png");
    assert.equal(
      (await fetch(base + "/api/upload", { method: "POST", body: form }))
        .status,
      401,
    );
    const invalid = new FormData();
    invalid.set(
      "file",
      new Blob([
        "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>",
      ]),
      "fake.jpg",
    );
    assert.equal(
      (
        await fetch(base + "/api/upload", {
          method: "POST",
          headers: { cookie, origin },
          body: invalid,
        })
      ).status,
      415,
    );
    const upload = await fetch(base + "/api/upload", {
      method: "POST",
      headers: { cookie, origin },
      body: form,
    });
    assert.equal(upload.status, 201, await upload.clone().text());
    const imageUrl = (await upload.json()).url;
    const image = await request(imageUrl);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/webp");
    assert.match(image.headers.get("cache-control"), /immutable/);
    assert.equal(
      (await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format,
      "webp",
    );
    const optimized = await request(
      `/_next/image?url=${encodeURIComponent(imageUrl)}&w=640&q=75`,
    );
    assert.equal(optimized.status, 200);
    assert.match(optimized.headers.get("content-type"), /^image\//);
    const title = `Projet HTTP ${randomUUID()}`;
    for (const name of [title, title + " second"]) {
      const response = await request("/api/artworks", "POST", {
        title: name,
        category,
        photo: imageUrl,
      });
      assert.equal(response.status, 201, await response.clone().text());
      ids.push((await response.json()).id);
    }
    const all = await (await request("/api/artworks")).json();
    const order = all.map((a) => a.id).reverse();
    assert.equal(
      (await request("/api/artworks/reorder", "POST", { ids: [ids[0]] }))
        .status,
      409,
    );
    assert.equal(
      (await request("/api/artworks/reorder", "POST", { ids: order })).status,
      200,
    );
    assert.deepEqual(
      (await (await request("/api/artworks")).json()).map((a) => a.id),
      order,
    );
    // Project data is present in the response HTML, not fetched only after hydration.
    const html = await (await request("/")).text();
    assert.ok(html.includes(title));
    assert.ok(html.includes("<h3"));
    const renamed = category + "-new";
    assert.equal(
      (
        await request("/api/categories", "PUT", {
          old: category.toLowerCase(),
          new: renamed,
        })
      ).status,
      200,
    );
    category = renamed;
    const updated = await (await request("/api/artworks")).json();
    assert.equal(updated.find((a) => a.id === ids[0]).category, renamed);
    const settings = await (await request("/api/settings")).json();
    assert.deepEqual(Object.keys(settings).sort(), [
      "categories",
      "footerText",
      "heroSubtitle",
      "heroTitle",
      "siteTitle",
    ]);
  } finally {
    for (const id of ids)
      assert.equal(
        (await request("/api/artworks/" + id, "DELETE")).status,
        200,
      );
    if (categoryCreated)
      assert.equal(
        (await request("/api/categories", "DELETE", { name: category })).status,
        200,
      );
    const logout = await request("/api/auth/logout", "POST", undefined, true, {
      origin,
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/i);
    assert.equal(
      (await (await request("/api/auth/session")).json()).authenticated,
      false,
    );
  }
});
