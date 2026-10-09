import { sessionUserId } from "./db";
import type { Env } from "./env";

/**
 * Sessions and the sign-in cookie (T7.3, CLAUDE.md §5). A session token is 256 random bits, sent only in a __Host-
 * cookie (HttpOnly, Secure, SameSite=Lax, whole site, no domain), and stored only as its SHA-256 hash. A fast hash
 * is right here: the token is random and long, so there's nothing to guess, unlike a password.
 */

export const SESSION_COOKIE = "__Host-ol_session";
/** Holds the sign-in's state and nonce for the trip to Twitch and back. */
export const SIGNIN_COOKIE = "__Host-ol_signin";
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const SIGNIN_SECONDS = 10 * 60;

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const newSessionToken = () => base64url(crypto.getRandomValues(new Uint8Array(32)));

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const now = () => Math.floor(Date.now() / 1000);

/** A Set-Cookie value. Max-Age 0 clears it. */
export const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/** The session token from the cookie, if it's well formed. Anything else counts as signed out. */
export function sessionToken(request: Request): string | null {
  const token = readCookie(request, SESSION_COOKIE);
  return token && TOKEN.test(token) ? token : null;
}

/** State-changing requests must come from Overlune's own pages (CSRF, CLAUDE.md §5). Browsers always send Origin on
 *  a POST, and a site can't fake it, so a missing or foreign one is refused. */
export const sameOrigin = (request: Request) =>
  request.headers.get("Origin") === new URL(request.url).origin;

/** The signed-in user's id, or null: no cookie, a malformed one, an unknown or expired session. Every route that needs
 *  an account starts here (CLAUDE.md §5: auth is enforced on the server). */
export async function currentUserId(request: Request, env: Env): Promise<string | null> {
  const token = sessionToken(request);
  return token ? sessionUserId(env.DB, await hashToken(token), now()) : null;
}
