import { getPlatformProxy } from "wrangler";
import type { Env } from "../../functions/lib/env";

/** A real local D1 for a test file (T7.2): wrangler's platform proxy runs Miniflare with the bindings from
 *  wrangler.jsonc, in memory, so every file starts from an empty database. Dispose it after the file. */
export const localD1 = () => getPlatformProxy<Env>({ persist: false });

/** migrations/, in order, applied as `wrangler d1 migrations apply` does. */
const migrations = import.meta.glob<string>("../../migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});

export async function migrate(db: Env["DB"]) {
  for (const file of Object.keys(migrations).sort()) {
    const sql = migrations[file]!.replace(/^--.*$/gm, "");
    for (const statement of sql.split(";").map((s: string) => s.trim()))
      if (statement) await db.prepare(statement).run();
  }
}

/** Calls a Pages Function with only the parts of its context it reads. */
export const call = async <C>(fn: (c: C) => unknown, context: object) =>
  (await fn(context as C)) as Response;
