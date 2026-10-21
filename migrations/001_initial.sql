-- These tables replace the unused local Prisma/SQLite schema.
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 40),
  normalized_name TEXT NOT NULL UNIQUE
);
-- statement-breakpoint
CREATE TABLE artworks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
  url TEXT,
  photo TEXT,
  description TEXT,
  link TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- statement-breakpoint
CREATE INDEX artworks_display_order ON artworks(sort_order, created_at DESC);
-- statement-breakpoint
CREATE INDEX artworks_category ON artworks(category_id);
-- statement-breakpoint
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
-- statement-breakpoint
CREATE TABLE media (
  name TEXT PRIMARY KEY,
  data BLOB NOT NULL CHECK(length(data) <= 262144),
  created_at TEXT NOT NULL
);
-- statement-breakpoint
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
-- statement-breakpoint
CREATE TABLE bot_locks (key TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
-- statement-breakpoint
INSERT INTO categories(id, name, normalized_name) VALUES
 ('cat_3d', '3D', '3d'),
 ('cat_roblox', 'Roblox Studio', 'roblox studio'),
 ('cat_video', 'Vidéo', 'vidéo'),
 ('cat_cyber', 'Cyberdéfense', 'cyberdéfense'),
 ('cat_web', 'Websites', 'websites');
