# Overlune: Sentry Setup

Sentry follows the official React guide (https://docs.sentry.io/platforms/javascript/guides/react/): errors plus tracing, React 19 error hooks and React Router v7 tracing. Overlune's privacy rules are added on top.

## What's wired
| File | What it does |
|---|---|
| `src/lib/sentry.ts` | `Sentry.init`: DSN from env, environment, release, `sendDefaultPii: false`, router tracing, sampling |
| `src/lib/sentry-scrub.ts` | Strips `#fragment` (overlay settings) from event URLs and breadcrumbs, and drops console breadcrumbs (they can contain chat text) |
| `src/main.tsx` | Calls `initSentry()` before render, and adds the React 19 `onUncaughtError` / `onCaughtError` / `onRecoverableError` hooks |
| `src/App.tsx` | `withSentryReactRouterV7Routing(Routes)`. The `/_sentry-test` route exists in dev and staging only |
| `tests/unit/lib/sentry-scrub.test.ts` | Proves settings fragments never reach Sentry |

## Deliberate differences from the guide's defaults
- **`tracesSampleRate`:** 1.0 in dev and staging, **0.05 in production**. Overlays run for hours on every streamer's PC, and sampling everything would use up the free quota within days.
- **`tracePropagationTargets: []`:** there is no Overlune backend, so we never add trace headers to requests to Twitch.
- **No Session Replay:** it would record streamers' chat.

## Setup steps (owner)
1. Create the Sentry organization **Overlune** in the **EU** data region, then a **React** project.
2. Copy the DSN into `.env.local`:
   ```
   VITE_SENTRY_DSN=<your DSN>
   VITE_SENTRY_ENVIRONMENT=development
   ```
3. Run `npm install`, then `npm test` and `npm run dev`.
4. **Verify:** open `http://localhost:5173/_sentry-test#secret-settings` and click **Break the world**. In Sentry → Issues, confirm that:
   - "Sentry Test Error" appears (environment `development`).
   - The event's URL does **not** contain `#secret-settings`.
   - The setup isn't done until you see the event in Sentry.
5. In Cloudflare Pages, set `VITE_SENTRY_DSN` and `VITE_SENTRY_ENVIRONMENT`: `staging` for preview deploys, `production` for `main`.

## Later (not done yet)
- **CSP (T0.7):** allow the EU ingest host in `connect-src`: `https://*.ingest.de.sentry.io`.
- **Privacy policy:** "Error reports are processed by Sentry and stored in the EU. They do not include your overlay settings or chat messages."

## Source maps (T6.92)
Error reports show real file names and lines once source maps are uploaded. The upload happens in the build that Cloudflare deploys, so the maps match the served files exactly (debug IDs).
- `vite.config.ts` uses `@sentry/vite-plugin` (org `overlune`, project `javascript-react`) **only when `SENTRY_AUTH_TOKEN` is set**. It makes hidden maps, uploads them for the release (`overlune@<version>+<commit>`), then deletes them from `dist`, so visitors never download them. A failed upload logs an error but never stops the deploy.
- Without the token (local builds, CI, preview deploys) no maps are built at all.
- **Owner setup:** in Sentry, Settings → Auth Tokens → create an **organization token** (it only needs to upload). In Cloudflare Pages → Settings → Variables and Secrets, add `SENTRY_AUTH_TOKEN` as an encrypted **Secret** for **Production** only, then redeploy. The token is build-only, like a CI secret (CLAUDE.md §3): never in client code, never in a link.

