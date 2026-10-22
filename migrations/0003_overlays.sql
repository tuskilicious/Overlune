-- 0003 (T12.2): saved overlays. Each belongs to one account; its settings are kept in the link's own form
-- (`1.<lz-string>`), checked by the API on every write (functions/lib/overlays.ts). `draft` is what the editor shows,
-- `published` what OBS shows since the streamer last pressed "Update OBS" (`version` counts those). A plain rowid table
-- of text and numbers, as the nightly backup needs (BACKUPS.md).
CREATE TABLE overlays (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  draft TEXT NOT NULL,
  published TEXT,
  published_at INTEGER,
  version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX overlays_by_owner ON overlays (owner_id);

UPDATE app_meta SET value = '3' WHERE key = 'schema';
