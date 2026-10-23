import { DurableObject } from "cloudflare:workers";
import { publishedOverlay } from "./lib/db";
import type { Env } from "./lib/env";
import { LIVE_DELETED, liveMessage } from "./lib/overlays";

/**
 * A saved overlay's live channel (T12.3): one object per overlay, holding the read-only connections of every open copy
 * of it (OBS, the editor's preview). A connection gets what's published as it opens, and again on every "Update OBS";
 * it never sees the draft. The connections use the hibernation API, so an overlay sitting idle in OBS keeps its
 * connection without keeping this object in memory, and the keep-alive "ping" is answered without waking it.
 */
export class OverlayLive extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  /** A connection from an overlay, sent on by GET /api/live/:id. The overlay's id is the path's last part. */
  async fetch(request: Request): Promise<Response> {
    const id = new URL(request.url).pathname.split("/").pop()!;
    const overlay = await publishedOverlay(this.env.DB, id);
    if (!overlay) return new Response('{"error":"not found"}', { status: 404 });
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    if (overlay.published) server.send(liveMessage(overlay.version, overlay.published));
    return new Response(null, { status: 101, webSocket: client });
  }

  /** "Update OBS": every open copy gets the new settings. */
  publish(version: number, settings: string): void {
    const message = liveMessage(version, settings);
    for (const ws of this.ctx.getWebSockets()) ws.send(message);
  }

  /** The overlay, or its account, was deleted: every copy keeps what it shows and stops listening. They're told in a
   *  message and close from their side: a close begun from here, outside a socket's own event, never finished in local
   *  tests (2026-10-23, both ends stuck closing), where one from the client does. */
  deleted(): void {
    for (const ws of this.ctx.getWebSockets()) ws.send(LIVE_DELETED);
  }

  /** Read-only: anything but the keep-alive ping (answered before it gets here) closes the connection. */
  webSocketMessage(ws: WebSocket): void {
    ws.close(1008, "read-only");
  }

  /** A copy closing (OBS hiding the source, or the overlay told it was deleted): finish the close from this side. */
  webSocketClose(ws: WebSocket, code: number, reason: string): void {
    ws.close(code, reason);
  }
}
