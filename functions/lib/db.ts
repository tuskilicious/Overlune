import type { D1Database } from "@cloudflare/workers-types";

/**
 * The data layer (CLAUDE.md §4): every D1 read and write goes through this module, and route handlers never query D1
 * directly. Everything that touches a user's data takes that user and is scoped to them, default deny. Queries are
 * always parameterized. Times are Unix seconds.
 */

/** The schema version recorded by the migrations, or null if they haven't run on this database. */
export async function schemaVersion(db: D1Database): Promise<string | null> {
  const row = await db
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .bind("schema")
    .first<{ value: string }>();
  return row?.value ?? null;
}

/** Who someone is on Twitch, as read once at sign-in. */
export interface TwitchProfile {
  twitchId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Creates the account on first sign-in, or refreshes its name and picture. Returns Overlune's own id for it. */
export async function upsertUser(db: D1Database, p: TwitchProfile, now: number): Promise<string> {
  const row = await db
    .prepare(
      `INSERT INTO users (id, twitch_id, login, display_name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (twitch_id) DO UPDATE SET
         login = excluded.login, display_name = excluded.display_name, avatar_url = excluded.avatar_url
       RETURNING id`,
    )
    .bind(crypto.randomUUID(), p.twitchId, p.login, p.displayName, p.avatarUrl, now)
    .first<{ id: string }>();
  return row!.id;
}

/** Starts a session, and clears every expired one (anyone's): a sign-in is the only regular write, so expired rows
 *  last only until the next sign-in (the privacy policy says sessions are removed after 30 days). */
export async function createSession(
  db: D1Database,
  userId: string,
  tokenHash: string,
  now: number,
  expiresAt: number,
): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    db
      .prepare(
        "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
      )
      .bind(tokenHash, userId, now, expiresAt),
  ]);
}

/** The user a session belongs to, if it exists and hasn't expired. */
export async function sessionUserId(
  db: D1Database,
  tokenHash: string,
  now: number,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?")
    .bind(tokenHash, now)
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}

/** Ends one session. Ending a session that doesn't exist does nothing. */
export async function deleteSession(db: D1Database, tokenHash: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

/** "Sign out everywhere": ends every session of this user. */
export async function deleteUserSessions(db: D1Database, userId: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}

/** What the editor shows of an account (T7.4): nothing it doesn't need, so no Twitch or internal ids. */
export interface Profile {
  login: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function profile(db: D1Database, userId: string): Promise<Profile | null> {
  const row = await db
    .prepare("SELECT login, display_name, avatar_url FROM users WHERE id = ?")
    .bind(userId)
    .first<{ login: string; display_name: string; avatar_url: string | null }>();
  return row
    ? { login: row.login, displayName: row.display_name, avatarUrl: row.avatar_url }
    : null;
}

/** Deletes the account and every row that belongs to it, in one transaction (T7.4). Later tables that hold a user's
 *  data join this list. */
export async function deleteUser(db: D1Database, userId: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM overlays WHERE owner_id = ?").bind(userId),
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM users WHERE id = ?").bind(userId),
  ]);
}

/** A saved overlay in a list (T12.2): no settings, which only the one being opened needs. */
export interface OverlaySummary {
  id: string;
  name: string;
  updatedAt: number;
  publishedAt: number | null;
  version: number;
}

/** One saved overlay: its draft (what the editor shows) and what OBS shows (`published`, from "Update OBS"). */
export interface Overlay extends OverlaySummary {
  draft: string;
  published: string | null;
}

type OverlayRow = {
  id: string;
  name: string;
  draft: string;
  published: string | null;
  published_at: number | null;
  version: number;
  updated_at: number;
};

const summary = (r: Omit<OverlayRow, "draft" | "published">): OverlaySummary => ({
  id: r.id,
  name: r.name,
  updatedAt: r.updated_at,
  publishedAt: r.published_at,
  version: r.version,
});

/** This user's saved overlays, most recently changed first. */
export async function listOverlays(db: D1Database, userId: string): Promise<OverlaySummary[]> {
  const { results } = await db
    .prepare(
      "SELECT id, name, published_at, version, updated_at FROM overlays WHERE owner_id = ? ORDER BY updated_at DESC, id",
    )
    .bind(userId)
    .all<Omit<OverlayRow, "draft" | "published">>();
  return results.map(summary);
}

/** Saves a new overlay, in one statement, only while this user has fewer than `limit`: null when they don't. */
export async function createOverlay(
  db: D1Database,
  userId: string,
  overlay: { id: string; name: string; settings: string },
  limit: number,
  now: number,
): Promise<OverlaySummary | null> {
  const row = await db
    .prepare(
      `INSERT INTO overlays (id, owner_id, name, draft, published, published_at, version, created_at, updated_at)
       SELECT ?, ?, ?, ?, NULL, NULL, 0, ?, ?
       WHERE (SELECT count(*) FROM overlays WHERE owner_id = ?) < ?
       RETURNING id, name, published_at, version, updated_at`,
    )
    .bind(overlay.id, userId, overlay.name, overlay.settings, now, now, userId, limit)
    .first<Omit<OverlayRow, "draft" | "published">>();
  return row ? summary(row) : null;
}

/** One of this user's overlays; null when there's no such overlay or it isn't theirs, which look the same. */
export async function getOverlay(
  db: D1Database,
  userId: string,
  id: string,
): Promise<Overlay | null> {
  const row = await db
    .prepare(
      "SELECT id, name, draft, published, published_at, version, updated_at FROM overlays WHERE id = ? AND owner_id = ?",
    )
    .bind(id, userId)
    .first<OverlayRow>();
  return row ? { ...summary(row), draft: row.draft, published: row.published } : null;
}

/** Renames an overlay or saves its draft, or both. Null when it isn't this user's. */
export async function updateOverlay(
  db: D1Database,
  userId: string,
  id: string,
  change: { name?: string; settings?: string },
  now: number,
): Promise<OverlaySummary | null> {
  const row = await db
    .prepare(
      `UPDATE overlays SET name = coalesce(?, name), draft = coalesce(?, draft), updated_at = ?
       WHERE id = ? AND owner_id = ?
       RETURNING id, name, published_at, version, updated_at`,
    )
    .bind(change.name ?? null, change.settings ?? null, now, id, userId)
    .first<Omit<OverlayRow, "draft" | "published">>();
  return row ? summary(row) : null;
}

/** "Update OBS": the draft becomes what OBS shows, under a new version. Null when it isn't this user's. Also gives
 *  the settings it published, for the live channel (T12.3). */
export async function publishOverlay(
  db: D1Database,
  userId: string,
  id: string,
  now: number,
): Promise<{ summary: OverlaySummary; settings: string } | null> {
  const row = await db
    .prepare(
      `UPDATE overlays SET published = draft, published_at = ?, version = version + 1
       WHERE id = ? AND owner_id = ?
       RETURNING id, name, published, published_at, version, updated_at`,
    )
    .bind(now, id, userId)
    .first<Omit<OverlayRow, "draft"> & { published: string }>();
  return row ? { summary: summary(row), settings: row.published } : null;
}

/** What an overlay's links show (T12.3): only its published copy and version, for anyone with its id, which only its
 *  owner's links carry. The one read here that isn't scoped to a signed-in user: an overlay in OBS has no session, and
 *  its link already holds a copy of the same settings. Null when there's no such overlay. */
export async function publishedOverlay(
  db: D1Database,
  id: string,
): Promise<{ published: string | null; version: number } | null> {
  return db
    .prepare("SELECT published, version FROM overlays WHERE id = ?")
    .bind(id)
    .first<{ published: string | null; version: number }>();
}

/** The ids of this user's overlays, to close their live channels when the account goes. */
export async function overlayIds(db: D1Database, userId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT id FROM overlays WHERE owner_id = ?")
    .bind(userId)
    .all<{ id: string }>();
  return results.map((r) => r.id);
}

/** Deletes an overlay. False when it isn't this user's. */
export async function deleteOverlay(db: D1Database, userId: string, id: string): Promise<boolean> {
  const { meta } = await db
    .prepare("DELETE FROM overlays WHERE id = ? AND owner_id = ?")
    .bind(id, userId)
    .run();
  return meta.changes > 0;
}
