# Overlune: Locked Tech Stack

Do not swap or add major dependencies without approval. Pin exact versions in `package.json`.

## Core
| Area | Choice | Why |
|---|---|---|
| Runtime | Node.js 24 LTS | Current LTS |
| Build | Vite 8 (Rolldown) | Fast, static output. Its default target is Chrome 111+, which the overlays' CSS already needs (`color-mix()`), so OBS 31 or newer (Chromium 127) |
| UI | React + TypeScript (`strict: true`) | Decided in planning |
| Routing | React Router | Landing (`/`), editor (`/editor`), guide, legal and overlay routes |
| Validation | zod | Validates URL settings and parsed IRC messages |
| URL compression | lz-string | Keeps overlay links short |
| Twitch chat | **Own minimal IRC client** over native `WebSocket` (`wss://irc-ws.chat.twitch.tv`), anonymous `justinfan` login | No heavy dependency; the parser is small and fully unit-testable |
| Fonts | `@fontsource/*` (self-hosted, SIL OFL) | No Google Fonts CDN calls (privacy), works offline in OBS, licenses recorded |
| Error tracking | `@sentry/react` | CLAUDE.md §2. PII off, URL fragments stripped |
| Visit counts | Cloudflare Web Analytics (not a dependency: Cloudflare Pages injects its beacon) | Approved by the owner 2026-10-08. Cookie-free and no storage; it reports origin, path and query, never the part after `#` (checked in its beacon script). The CSP allows `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (data); `tests/unit/lib/csp.test.ts` pins every outside host the CSP allows |
| Motion | `gsap` (GSAP Standard "no charge" license, https://gsap.com/standard-license, checked 2026-10-08: free, including commercial use and every plugin. It forbids no-code tools that let people build their own visual animations in competition with Webflow; Overlune offers ready-made looks and no animation builder, so it isn't one. Check the license again before adding anything that lets streamers design their own animations. Its notices must stay in the build: `comments.legal` in `vite.config.ts`) | Approved by the owner for the landing page 2026-10-02 (T6.34), and for the editor and overlays 2026-10-08 (T6.137). **Always through `animate()` in `src/lib/motion.ts`** (ESLint blocks direct imports): GSAP and its plugins are dynamic imports, so each use is its own lazy chunk and GSAP is never a dependency of the overlay core bundle (the main entry) or the editor's chunk. Every sequence runs inside `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`, never under `?rm=1` or Still motion, and is reverted on unmount. Budgets, gzipped: GSAP core 30 KB, each plugin 20 KB (measured 26.8 and 17.2 KB for core and ScrollTrigger with their notices; e2e build check in `tests/e2e/landing.spec.ts`, which also checks the notices are kept). **Overlay alerts stay CSS** (T6.137 Part C, measured 2026-10-08 in Chromium with 4x CPU throttling, 50 alerts per build): Clean Slate's alert as a GSAP timeline dropped 71 to 72 frames, with 8 to 11 over 50 ms and a worst frame of 117 to 133 ms, against 1 to 9 dropped and none over 50 ms for CSS, because GSAP animates on the main thread while CSS opacity, transform and filter animations run on the compositor. The same alert with its lines staggered in CSS dropped none (worst frame 16.8 ms). Try GSAP in an overlay again only with new measurements |
| Smooth scrolling | `lenis` (MIT, no dependencies) | Approved by the owner 2026-10-09 (T6.150). **Landing page only**: the wheel scrolls smoothly; touch, keys and anchor links stay native. It loads by dynamic import inside the landing page's `animate()` sequence, so reduced motion (the OS setting, `?rm=1`, Still) never downloads it, and it runs on GSAP's ticker so ScrollTrigger and the ruler read the same position. Never in the editor (its own smooth scroll, T6.103) or an overlay (`tests/e2e/landing.spec.ts` checks the bundles) |
| Landing page styling | Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`, dev only) | Approved by the owner 2026-10-02 (T6.34). **Landing page only**: `src/landing/landing.css` imports Tailwind's theme and utilities without its preflight reset, and generates classes from `src/landing` only, so the editor's plain CSS is untouched |
| Panel and banner export | `html-to-image` (MIT, no dependencies) | Approved by the owner 2026-10-06 (T6.86) for downloading Twitch panels and the offline banner as PNG (T6.91). **Editor only**, loaded when someone presses Download, never in overlays. It draws through a `data:` SVG image, so the CSP allows `data:` images; streamer logo links still accept `https:` only |
| Platform icons | `simple-icons` (CC0 data; brand logos are their owners' trademarks) | Approved by the owner 2026-10-02 (T6.35). Six named imports (`src/overlays/social-icons.tsx`), tree-shaken into the bundle as inline SVG paths: no CDN, so the CSP is unchanged |

## Quality and security tooling
| Area | Choice |
|---|---|
| Unit tests | Vitest + Testing Library |
| Overlay smoke tests | Playwright (Chromium, which is close to OBS's browser) with screenshot checks |
| Accessibility checks | `@axe-core/playwright` (dev only): the editor must have no WCAG 2.1 A/AA violations |
| Lint / format | ESLint + Prettier |
| Typecheck | `tsc --noEmit` |
| Git hooks | husky → gitleaks (secrets) + lint-staged |
| CI | GitHub Actions: lint, typecheck, test, build, gitleaks, `npm audit` |
| Dependency updates | Dependabot |

## Hosting
- **Cloudflare Pages** (free). We chose it over GitHub Pages because GitHub Pages cannot set the security headers CLAUDE.md §7 requires.
- Production is the `main` branch. Staging is the automatic preview deploy for each branch or PR.
- Headers: `public/_headers`. SPA fallback: built in (Pages serves `index.html` for unknown paths when there is no `404.html`), so no `_redirects`.
- **Antideploy:** a second copy ran at overlune.antideploy.app from 2026-10-01; the owner scrapped it on 2026-10-07. Cloudflare Pages is the only host, so the security headers in `public/_headers` are the only place the CSP lives.

## Backend (v2, approved 2026-10-09)
All on Cloudflare, next to the site: one provider, one deploy, one domain, so the API needs no CORS. Chosen over Supabase (the earlier plan) because it doesn't pause idle projects, includes point-in-time restore on the free plan, keeps idle live connections free, and is already where Overlune runs. Free plan first; move to Workers Paid ($5 a month) when a limit below gets close. Check current limits before relying on them.

| Area | Choice | Free plan (checked 2026-10-09) |
|---|---|---|
| Server code | Cloudflare Pages Functions (Workers) in `functions/`, TypeScript, same origin as the site under `/api/...` | 100,000 requests a day, 10 ms CPU each |
| Database | D1 (SQLite), schema changes as numbered SQL migrations in `migrations/` | 500 MB per database, 5 GB per account |
| Point-in-time restore | D1 Time Travel | 7 days (30 on Workers Paid) |
| Live updates (v2 Phase 2 and 3) | Durable Objects with the WebSocket Hibernation API | On the free plan since April 2025; idle connections cost nothing; 100,000 requests a day, with 100 incoming WebSocket messages counted as 5 |
| Uploads (v2 Phase 4) | R2 | Free allowance |
| Sign-in | Twitch OpenID Connect (authorization code, state and nonce, ID token verified; Twitch has no PKCE) through `oauth4webapi`; sessions in D1 (CLAUDE.md §5) | Free |
| Rate limits | A Cloudflare WAF rate-limiting rule at the edge, plus in-memory limits in the Functions (T7.6, below) | One rate-limiting rule; 10-second windows only |
| Backups | Time Travel plus a nightly age-encrypted dump with read-only `SELECT`s, kept 90 days as Actions artifacts in the private repo `tuskilicious/overlune-backups` (CLAUDE.md §4, `docs/BACKUPS.md`) | Free |

- **Staging and production:** one D1 database each, with separate secrets and Twitch redirect URLs. Preview deploys (each PR) use staging; `main` uses production. Sentry environments match.
- **Secrets** (`TWITCH_CLIENT_SECRET`, the session key, `CLOUDFLARE_API_TOKEN` for the backup job) live in Cloudflare's encrypted variables or GitHub Actions secrets, never in the repo or the client. `.env.example` lists the names.
- **New dependencies this needs**, approved with this plan and each pinned and reviewed in the PR that adds it: `wrangler` and `@cloudflare/workers-types` (dev), a small OAuth library (chosen in T7.3: `oauth4webapi` 3.8.8, MIT, no dependencies, by panva, an OpenID-certified implementer, released 2026-09-05; over `arctic`, whose Twitch provider sends no nonce, checks no ID token, and last released 2025-05), and `@sentry/cloudflare` for errors in Functions. `@cloudflare/vitest-pool-workers` was planned for tests but dropped in T7.2: its latest (0.23.0) needs Vitest 4 and Overlune is on 5. Function tests use wrangler's `getPlatformProxy` instead, which runs the same local D1 (Miniflare) inside the usual Vitest run (`tests/functions/`).
- **Config (T7.2):** `wrangler.jsonc` is the Pages project's source of truth: the D1 binding (`DB`) and the plain variables for local, preview (staging) and production. Its `vars` replace the dashboard's, at build time too, so `NODE_VERSION`, `VITE_SENTRY_DSN` and `VITE_SENTRY_ENVIRONMENT` live there now. Secrets stay in the dashboard. Pages environments don't inherit, so preview and production each list everything.
- **Functions (T7.2):** only `/api/*` runs code (the generated `_routes.json` includes nothing else), so the site stays static and free. `functions/api/_middleware.ts` runs Sentry (`@sentry/cloudflare`, the site's `dataCollection` and scrubber from `src/lib/sentry-scrub.ts`, `traceLifecycle: "static"`) and adds the API's own security headers, since `public/_headers` never covers Functions: `default-src 'none'`, `frame-ancestors 'none'`, HSTS, `nosniff`, `no-referrer`, `no-store`. `functions/api/[[path]].ts` answers any other `/api` path, or the wrong method, with a JSON 404 instead of the site's HTML. `functions/lib/db.ts` is the one data layer (CLAUDE.md §4). **Access-control tests (T7.5):** `tests/functions/access.test.ts` holds a registry of every route (file, path, methods, who may use it) and attacks each one; it fails for any route file it doesn't list.
- **Abuse limits (T7.6):** two layers. **At the edge:** one WAF rate-limiting rule on the overlune.in zone (`http_ratelimit` phase, made with `cf rulesets entrypoint update`): paths starting `/api/`, 60 requests per 10 seconds per IP (and Cloudflare data centre), blocked for 10 seconds. It runs before any Function, so a flood costs no Function requests or D1 reads. **In the Functions:** `functions/lib/limits.ts`, from `_middleware.ts`: sign-in start and callback 10 a minute per IP; account routes with a session cookie 60 a minute per session; everything else 120 a minute per IP; over a limit, a 429 with `Retry-After`. A declared body over 16 KB is a 413. These counts live in memory per Worker instance, so they're approximate: the Workers rate limiting binding isn't available to Pages Functions (their config takes no `ratelimits`), and a count in D1 would spend a write per request. **No Turnstile yet** (decided in T7.6): an account needs a Twitch account, starting a sign-in writes nothing, and a callback writes (2 rows) only with a real code from Twitch, so bots can't fill D1. D1's free 100,000 writes a day is about 50,000 sign-ins. Checked again at the launch (T7.9, 2026-10-13): still off, with one account and the limits live. Revisit if Sentry or D1 metrics show abuse.
- **Migrations (T7.2):** numbered SQL files in `migrations/`. They don't run on deploy: apply each new one to staging, then to production after its PR is approved, with `npx wrangler d1 migrations apply overlune-staging --remote`, and for production `npx wrangler d1 migrations apply overlune-production --remote --env production` (Wrangler only sees the production database with `--env production`). `/api/health` reports the schema version, so a missed migration shows.
- **Overlays keep working without it:** a saved overlay's link also carries a snapshot, so it still renders if the API is down (v2 Phase 2).

## Twitch data without login
- Chat, sub, resub, gift sub, raid and bits events arrive over anonymous IRC: `PRIVMSG` and `USERNOTICE` (which carries `msg-id`), plus the `bits` tag.
- `CLEARMSG` and `CLEARCHAT` remove deleted messages and banned users' messages.
- Emote images: `https://static-cdn.jtvnw.net/emoticons/v2/{id}/default/dark/1.0` (no auth).
- Badge **images** need the authenticated Helix API. Instead, we render **theme-styled badges** from the `badges` tag (broadcaster, moderator, vip, subscriber). This also matches the theme better.

## URL settings format
- Route per overlay: `/o/starting`, `/o/brb`, `/o/ending`, `/o/offline` (T6.147), `/o/chat`, `/o/alerts`, `/o/frame` (T6.88), `/o/live` (T9.7: chat, alerts and the frame in one 1920×1080 source, placed by `layouts.landscape.scenes.live` or a default), `/o/chatting` and `/o/reaction` (Phase 10: Just Chatting and Reaction, see the Layout model).
- Settings are in the **hash fragment**: `#<version>.<lz-string payload>`. The fragment is never sent to servers, and it is stripped from Sentry events.
- Optional query flag `?rm=1` (before the `#`) forces reduced motion: every animation is turned off, same as the OS "reduce motion" setting. Never remove or repurpose it.
- Optional query flag `?canvas=vertical` (before the `#`, added in Phase 10) renders the overlay from `layouts.portrait` (its own size, 1080×1920 by default) instead of `layouts.landscape`, or from the look's portrait default when there is none (DESIGN.md "Vertical layout"). The settings after the `#` are the same as the landscape link's, so one save gives both, and the two layouts never touch each other. Any other value, or none, is the 1920×1080 landscape overlay every earlier link shows. It combines with `?rm=1` and `?test=1`. Never remove or repurpose it.
- Optional payload field `frame` (added T6.88): the webcam frame's `width` (160 to 1920, default 640), `height` (120 to 1080, default 360) and `label` (up to 40 characters, default none). Overlay route `/o/frame`. Links without it get the defaults.
- Optional payload field `chat.showBadges` (added T6.76, default `true`): role badges before chat names. Links without it keep badges.
- Optional payload field `alerts.seconds` (added T6.75, 3 to 15, default 5): how long each alert stays on screen. Links without it keep 5 seconds; a value out of range falls back to 5.
- Optional payload field `lessMotion` (added T6.74, default `false`): the editor's "Less motion" option, which does the same as `?rm=1` but lives in the settings, so the save link remembers it. Links without it keep full motion.
- Optional query flag `?test=1` (before the `#`, alerts only) plays one sample of each alert type when the source loads, then works normally. Lets streamers place the source and check sound in OBS. It also shows an on-stream "Test mode" label, so a forgotten test link gets noticed. Never remove or repurpose it.
- Optional `&until=<unix seconds>` next to `?test=1` (added T6.9): the editor stamps it 15 minutes ahead, and after that time the link plays no samples (the label stays). A value that isn't a number counts as expired. Links without `until` play their samples on every load, as they always have.
- `src/settings/schema.ts` holds zod schemas per version. `src/settings/migrations.ts` upgrades any old version to the current one.
- `tests/fixtures/links/` keeps real links from every version. CI loads all of them.

## Layout model (Phase 9, the canvas editor)
A customized scene is a list of positioned elements in the link's settings, as a new optional field. The v1 contract allows it without a new schema version: links without the field render exactly as before, so there is nothing to migrate. A version bump comes only if a later change renames, removes or tightens something.
- **Field:** `layouts`, optional, default none. `layouts.landscape` (Phase 9) and `layouts.portrait` (Phase 10, picked by `?canvas=vertical`), each `{ size, scenes }`: `size` is the canvas in px (default 1920×1080; 1080×1920 for portrait; custom sizes from T9.8, 320–3840 by 320–3840), `scenes` maps `starting`, `brb`, `ending`, `offline` and `live` to an element list. A scene without a list renders the look's composed scene.
- **Element:** `id` (8 characters), `type`, `x`, `y`, `w`, `h` (integers, canvas px, may run partly off the canvas), `r` (rotation, -180 to 180 degrees), `o` (opacity 0–1), `hidden`, `locked`; list order is stacking order. Types: `title`, `subtitle`, `countdown`, `socials`, `logo` and `ticker` (they render today's components and read today's settings, so editing the title text still happens in one place); `text` (its own words, up to 200 characters), `image` (an https link, CLAUDE.md §6, `fit` cover or contain), `shape` (rectangle, ellipse or line); and for `live`: `chat`, `alerts`, `frame`, `label` (Phase 13 fills labels). Styles are the look's tokens or `#rrggbb` (the existing `hexColor`), fonts are `fontIds`, sizes are bounded numbers: never free CSS, never `url()`.
- **Limits:** 40 elements per scene. A link's whole encoded fragment stays under 24 KB; the editor warns at 16 KB and suggests saving to the account (Phase 12).
- **Validation:** zod, like every setting: an invalid element is dropped and the rest render, with the overlay's error card (as for any damaged link).
- **Rendering (T9.3):** the overlay renders the look's composed scene as always, then moves its own parts (logo, title, subtitle, countdown, socials, ticker) to their layout boxes with `translate`, `scale` and `rotate` from where they naturally sit; a part left out of the layout, or hidden, isn't shown. So every look's styling carries over exactly, and the look's art (its cards, bands and motifs, which its containers paint) stays where the look puts it. Added elements (text, images, shapes) are drawn in a layer over the scene. Resizing one of the scene's own parts scales it; its words and look stay its own.
- **Default layouts (T9.3):** "Customize" measures each part's box in the composed scene (`measureLayout`, layout offsets, so it works on the editor's scaled preview), so the default renders the same as the composed scene: checked for every look and scene, with and without the ticker, by comparing screenshots (`tests/e2e/look-layouts.spec.ts`, under 0.5% of pixels).
- **Canvas sizes (T9.8):** the looks are designed at 1920×1080, so a scene (and Live) is drawn on a box of the canvas's shape whose short side matches that design, scaled to the canvas (`canvasOf` in `src/overlays/measure.ts`): 1280×720 and 4K show the same scene at another scale, a wider or taller canvas gets a wider or taller scene. **Element coordinates are in that box's units, not canvas px**, so 16:9 sizes share one layout and the box is never smaller than 1920×1080. Changing the size in the editor moves each element's center proportionally and keeps its size (`rescale`), shrinking only what no longer fits, so switching there and back gives the layout back. The editor allows sizes at most 3:1 either way, which keeps every coordinate inside the schema's bounds.
- **Portrait (Phase 10):** `layouts.portrait` has the same shape as `landscape`. Its box follows the same rule with a 1080×1920 design instead of 1920×1080 (`canvasOf` picks the design by the layout, not by the size), so a 1080×1920 portrait canvas is a 1080×1920 box at scale 1 and the looks' type reads at phone size. A tall size picked for `landscape` keeps the T9.8 rule, so no link from 2.0.0 changes.
- **Just Chatting and Reaction (Phase 10, owner 2026-10-14):** two more scene ids, `chatting` and `reaction`, added to `layoutScenes` (a wider enum is additive: old links have neither). Like Live, they are element lists with a default per canvas, but drawn over the look's own background and art. A new element type `camera` is the hole the streamer's camera shows through: the background is masked out under it and the look's webcam-frame border is drawn around it. New optional settings `chatting: { title, topic }` and `reaction: { title }`, bounded text like the others.
- **No new dependency:** selection, dragging, resizing, rotating and snapping use pointer events and plain math in `src/editor/canvas/`. A library like react-moveable would add weight to every editor visit for what a few hundred lines do.
- **Stays out:** custom code, HTML or CSS strings, fonts not in `fontIds`, video, uploaded files, and any link other than https images.

## Folder structure
```
overlune/
├─ CLAUDE.md  README.md  CHANGELOG.md  LICENSE  .gitignore  .env.example  wrangler.jsonc
├─ docs/
│  ├─ PRD.md  TASKS.md  STACK.md  DESIGN.md  LAYOUTS.md  BRAND.md  ASSETS.md  OBS-TESTING.md  FUTURE-SCOPE.md
│  ├─ brand/            logo, icon and social exports (BRAND.md)
│  └─ legal/            privacy.md, terms.md
├─ functions/          Pages Functions (v2), only under /api: api/ (routes, _middleware.ts), lib/ (db.ts: the one data
│                       layer; env.ts), its own tsconfig.json
├─ migrations/         D1 schema changes, numbered SQL (0001_init.sql, …)
├─ public/
│  ├─ _headers
│  └─ sounds/           licensed alert sounds (recorded in ASSETS.md)
├─ src/
│  ├─ main.tsx  App.tsx  routes.tsx
│  ├─ landing/          landing page at / (Tailwind + GSAP, lazy-loaded)
│  ├─ editor/           editor UI, preview, copy-link, setup guide; sections/ holds one file per form section
│  ├─ overlays/         starting/ brb/ ending/ chat/ alerts/ + shared frame & error state; layouts.css (a scene layout per look)
│  ├─ themes/           types.ts, index.ts, one file per theme
│  ├─ settings/         schema.ts, url.ts (encode/decode), migrations.ts, storage.ts
│  ├─ twitch/           irc.ts (connection), parse.ts (IRC → typed events), emotes.ts
│  ├─ alerts/           queue.ts, sound.ts, templates.ts
│  ├─ components/       shared UI primitives
│  └─ lib/              time.ts, url-safety.ts, sentry.ts, motion.ts (the only GSAP entry point)
├─ tests/
│  ├─ unit/             mirrors src/
│  ├─ e2e/              Playwright overlay smoke tests
│  ├─ functions/        the API against a local D1 (wrangler's getPlatformProxy)
│  └─ fixtures/links/   saved links from every schema version
└─ .github/
   ├─ workflows/ci.yml
   └─ dependabot.yml
```
