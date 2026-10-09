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

export async function createSession(
  db: D1Database,
  userId: string,
  tokenHash: string,
  now: number,
  expiresAt: number,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    )
    .bind(tokenHash, userId, now, expiresAt)
    .run();
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
