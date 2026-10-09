import type { PagesFunction } from "@cloudflare/workers-types";
import { schemaVersion } from "../lib/db";
import { json, type Env } from "../lib/env";

/** GET /api/health (T7.2): is the API up, and can it read its database? Says nothing else: no versions of software,
 *  no error details. */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const schema = await schemaVersion(env.DB);
    return schema ? json({ ok: true, schema }) : json({ ok: false }, 503);
  } catch {
    return json({ ok: false }, 503);
  }
};
