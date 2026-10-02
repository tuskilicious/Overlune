# Overlune: Locked Tech Stack

Do not swap or add major dependencies without approval. Pin exact versions in `package.json`.

## Core
| Area | Choice | Why |
|---|---|---|
| Runtime | Node.js 24 LTS | Current LTS |
| Build | Vite | Fast, static output |
| UI | React + TypeScript (`strict: true`) | Decided in planning |
| Routing | React Router | Landing (`/`), editor (`/editor`), guide, legal and overlay routes |
| Validation | zod | Validates URL settings and parsed IRC messages |
| URL compression | lz-string | Keeps overlay links short |
| Twitch chat | **Own minimal IRC client** over native `WebSocket` (`wss://irc-ws.chat.twitch.tv`), anonymous `justinfan` login | No heavy dependency; the parser is small and fully unit-testable |
| Fonts | `@fontsource/*` (self-hosted, SIL OFL) | No Google Fonts CDN calls (privacy), works offline in OBS, licenses recorded |
| Error tracking | `@sentry/react` | CLAUDE.md §2. PII off, URL fragments stripped |
| Landing page motion | `gsap` + `@gsap/react` (GSAP's Standard "no charge" license, free for this use) | Approved by the owner 2026-10-02 (T6.34). **Landing page only**: lazy-loaded with it, never in the editor or overlays (e2e check). All animation sits behind `prefers-reduced-motion: no-preference` |
| Landing page styling | Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`, dev only) | Approved by the owner 2026-10-02 (T6.34). **Landing page only**: `src/landing/landing.css` imports Tailwind's theme and utilities without its preflight reset, and generates classes from `src/landing` only, so the editor's plain CSS is untouched |

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
- **Antideploy** (free for static sites), a second copy at https://overlune.antideploy.app, added 2026-10-01 alongside Cloudflare. Cloudflare stays production, and every overlay link points there. The app id is in `.antideploy.json` (no secret).
  - Antideploy ignores `public/_headers`. The build adds the CSP and `no-referrer` as `<meta>` tags instead (`vite.config.ts`, CSP read from `_headers`). HSTS, `nosniff`, `Permissions-Policy` and `frame-ancestors` cannot be set this way, and HTTP is not redirected to HTTPS, so this copy is weaker than Cloudflare's. Don't give streamers this address until that changes.
  - A `public/` folder with the same name as a page (e.g. `public/guide/`) shadows the page there. Keep static files under `public/images/`, `public/sounds/` and so on.
  - Deploys are manual: the owner uploads a `git archive` of `main` (README, "Deploy").

## Twitch data without login
- Chat, sub, resub, gift sub, raid and bits events arrive over anonymous IRC: `PRIVMSG` and `USERNOTICE` (which carries `msg-id`), plus the `bits` tag.
- `CLEARMSG` and `CLEARCHAT` remove deleted messages and banned users' messages.
- Emote images: `https://static-cdn.jtvnw.net/emoticons/v2/{id}/default/dark/1.0` (no auth).
- Badge **images** need the authenticated Helix API. Instead, we render **theme-styled badges** from the `badges` tag (broadcaster, moderator, vip, subscriber). This also matches the theme better.

## URL settings format
- Route per overlay: `/o/starting`, `/o/brb`, `/o/ending`, `/o/chat`, `/o/alerts`.
- Settings are in the **hash fragment**: `#<version>.<lz-string payload>`. The fragment is never sent to servers, and it is stripped from Sentry events.
- Optional query flag `?rm=1` (before the `#`) forces reduced motion: every animation is turned off, same as the OS "reduce motion" setting. Never remove or repurpose it.
- Optional query flag `?test=1` (before the `#`, alerts only) plays one sample of each alert type when the source loads, then works normally. Lets streamers place the source and check sound in OBS. It also shows an on-stream "Test mode" label, so a forgotten test link gets noticed. Never remove or repurpose it.
- Optional `&until=<unix seconds>` next to `?test=1` (added T6.9): the editor stamps it 15 minutes ahead, and after that time the link plays no samples (the label stays). A value that isn't a number counts as expired. Links without `until` play their samples on every load, as they always have.
- `src/settings/schema.ts` holds zod schemas per version. `src/settings/migrations.ts` upgrades any old version to the current one.
- `tests/fixtures/links/` keeps real links from every version. CI loads all of them.

## Folder structure
```
overlune/
├─ CLAUDE.md  README.md  LICENSE  .gitignore  .env.example
├─ docs/
│  ├─ PRD.md  TASKS.md  STACK.md  DESIGN.md  BRAND.md  ASSETS.md  OBS-TESTING.md
│  ├─ brand/            logo, icon and social exports (BRAND.md)
│  └─ legal/            privacy.md, terms.md
├─ public/
│  ├─ _headers
│  └─ sounds/           licensed alert sounds (recorded in ASSETS.md)
├─ src/
│  ├─ main.tsx  App.tsx  routes.tsx
│  ├─ landing/          landing page at / (Tailwind + GSAP, lazy-loaded)
│  ├─ editor/           editor UI, preview, copy-link, setup guide
│  ├─ overlays/         starting/ brb/ ending/ chat/ alerts/ + shared frame & error state
│  ├─ themes/           types.ts, index.ts, one file per theme
│  ├─ settings/         schema.ts, url.ts (encode/decode), migrations.ts, storage.ts
│  ├─ twitch/           irc.ts (connection), parse.ts (IRC → typed events), emotes.ts
│  ├─ alerts/           queue.ts, sound.ts, templates.ts
│  ├─ components/       shared UI primitives
│  └─ lib/              time.ts, url-safety.ts, sentry.ts
├─ tests/
│  ├─ unit/             mirrors src/
│  ├─ e2e/              Playwright overlay smoke tests
│  └─ fixtures/links/   saved links from every schema version
└─ .github/
   ├─ workflows/ci.yml
   └─ dependabot.yml
```
