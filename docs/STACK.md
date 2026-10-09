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
| Sign-in | Twitch OAuth (authorization code + PKCE), sessions in D1 (CLAUDE.md §5) | Free |
| Bot protection and rate limits | Turnstile; the Workers rate limiting binding | Free |
| Backups | Time Travel plus a nightly encrypted `wrangler d1 export`, stored outside the Cloudflare account (CLAUDE.md §4) | Free |

- **Staging and production:** one D1 database each, with separate secrets and Twitch redirect URLs. Preview deploys (each PR) use staging; `main` uses production. Sentry environments match.
- **Secrets** (`TWITCH_CLIENT_SECRET`, the session key, `CLOUDFLARE_API_TOKEN` for the backup job) live in Cloudflare's encrypted variables or GitHub Actions secrets, never in the repo or the client. `.env.example` lists the names.
- **New dependencies this needs**, approved with this plan and each pinned and reviewed in the PR that adds it: `wrangler` and `@cloudflare/workers-types` (dev), `@cloudflare/vitest-pool-workers` (dev, to test Functions against a real local D1), a small OAuth library such as `arctic` (MIT; chosen in T7.3 after a review), and `@sentry/cloudflare` for errors in Functions.
- **Overlays keep working without it:** a saved overlay's link also carries a snapshot, so it still renders if the API is down (v2 Phase 2).

## Twitch data without login
- Chat, sub, resub, gift sub, raid and bits events arrive over anonymous IRC: `PRIVMSG` and `USERNOTICE` (which carries `msg-id`), plus the `bits` tag.
- `CLEARMSG` and `CLEARCHAT` remove deleted messages and banned users' messages.
- Emote images: `https://static-cdn.jtvnw.net/emoticons/v2/{id}/default/dark/1.0` (no auth).
- Badge **images** need the authenticated Helix API. Instead, we render **theme-styled badges** from the `badges` tag (broadcaster, moderator, vip, subscriber). This also matches the theme better.

## URL settings format
- Route per overlay: `/o/starting`, `/o/brb`, `/o/ending`, `/o/offline` (T6.147), `/o/chat`, `/o/alerts`, `/o/frame` (T6.88).
- Settings are in the **hash fragment**: `#<version>.<lz-string payload>`. The fragment is never sent to servers, and it is stripped from Sentry events.
- Optional query flag `?rm=1` (before the `#`) forces reduced motion: every animation is turned off, same as the OS "reduce motion" setting. Never remove or repurpose it.
- Optional payload field `frame` (added T6.88): the webcam frame's `width` (160 to 1920, default 640), `height` (120 to 1080, default 360) and `label` (up to 40 characters, default none). Overlay route `/o/frame`. Links without it get the defaults.
- Optional payload field `chat.showBadges` (added T6.76, default `true`): role badges before chat names. Links without it keep badges.
- Optional payload field `alerts.seconds` (added T6.75, 3 to 15, default 5): how long each alert stays on screen. Links without it keep 5 seconds; a value out of range falls back to 5.
- Optional payload field `lessMotion` (added T6.74, default `false`): the editor's "Less motion" option, which does the same as `?rm=1` but lives in the settings, so the save link remembers it. Links without it keep full motion.
- Optional query flag `?test=1` (before the `#`, alerts only) plays one sample of each alert type when the source loads, then works normally. Lets streamers place the source and check sound in OBS. It also shows an on-stream "Test mode" label, so a forgotten test link gets noticed. Never remove or repurpose it.
- Optional `&until=<unix seconds>` next to `?test=1` (added T6.9): the editor stamps it 15 minutes ahead, and after that time the link plays no samples (the label stays). A value that isn't a number counts as expired. Links without `until` play their samples on every load, as they always have.
- `src/settings/schema.ts` holds zod schemas per version. `src/settings/migrations.ts` upgrades any old version to the current one.
- `tests/fixtures/links/` keeps real links from every version. CI loads all of them.

## Folder structure
```
overlune/
├─ CLAUDE.md  README.md  CHANGELOG.md  LICENSE  .gitignore  .env.example
├─ docs/
│  ├─ PRD.md  TASKS.md  STACK.md  DESIGN.md  LAYOUTS.md  BRAND.md  ASSETS.md  OBS-TESTING.md  FUTURE-SCOPE.md
│  ├─ brand/            logo, icon and social exports (BRAND.md)
│  └─ legal/            privacy.md, terms.md
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
│  └─ fixtures/links/   saved links from every schema version
└─ .github/
   ├─ workflows/ci.yml
   └─ dependabot.yml
```
