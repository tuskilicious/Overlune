import { json, type Handler } from "../lib/env";

/** Any /api path without its own Function (T7.2): a plain 404, instead of falling through to the site's HTML. Also
 *  catches the wrong method on a real route. Default deny. */
export const onRequest: Handler = () => json({ error: "not found" }, 404);
