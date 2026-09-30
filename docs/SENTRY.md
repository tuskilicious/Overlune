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
- **Source maps:** run `npx @sentry/wizard@latest -i sourcemaps`. `SENTRY_AUTH_TOKEN` is CI-only. The build already emits hidden source maps.
- **Release:** set `VITE_SENTRY_RELEASE` to the git commit SHA in CI.
- **CSP (T0.7):** allow the EU ingest host in `connect-src`: `https://*.ingest.de.sentry.io`.
- **Privacy policy:** "Error reports are processed by Sentry and stored in the EU. They do not include your overlay settings or chat messages."
