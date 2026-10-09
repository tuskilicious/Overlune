-- 0002 (T7.3): accounts and sessions for Sign in with Twitch. Only what the product needs (CLAUDE.md §4): who the
-- streamer is on Twitch, and their sessions. Twitch's tokens are never stored. Sessions keep only a hash of their
-- token, so a copy of this database can't sign anyone in.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  twitch_id TEXT NOT NULL UNIQUE,
  login TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;

CREATE INDEX sessions_by_user ON sessions (user_id);

UPDATE app_meta SET value = '2' WHERE key = 'schema';
