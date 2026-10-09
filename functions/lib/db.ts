import type { D1Database } from "@cloudflare/workers-types";

/**
 * The data layer (CLAUDE.md §4): every D1 read and write goes through this module, and route handlers never query D1
 * directly. From T7.4 on, everything that touches a user's data takes the signed-in user and is scoped to them,
 * default deny. Queries are always parameterized.
 */

/** The schema version recorded by the migrations, or null if they haven't run on this database. */
export async function schemaVersion(db: D1Database): Promise<string | null> {
  const row = await db
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .bind("schema")
    .first<{ value: string }>();
  return row?.value ?? null;
}
