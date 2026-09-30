# Overlune: Locked Tech Stack

Do not swap or add major dependencies without approval. Pin exact versions in `package.json`.

## Core
| Area | Choice | Why |
|---|---|---|
| Runtime | Node.js 24 LTS | Current LTS |
| Build | Vite | Fast, static output |
| UI | React + TypeScript (`strict: true`) | Decided in planning |
| Routing | React Router | Editor + overlay routes |
| Validation | zod | Validates URL settings and parsed IRC messages |
| URL compression | lz-string | Keeps overlay links short |
| Twitch chat | **Own minimal IRC client** over native `WebSocket` (`wss://irc-ws.chat.twitch.tv`), anonymous `justinfan` login | No heavy dependency; the parser is small and fully unit-testable |
| Fonts | `@fontsource/*` (self-hosted, SIL OFL) | No Google Fonts CDN calls (privacy), works offline in OBS, licenses recorded |
| Error tracking | `@sentry/react` | CLAUDE.md §2. PII off, URL fragments stripped |

## Quality and security tooling
| Area | Choice |
|---|---|
| Unit tests | Vitest + Testing Library |
| Overlay smoke tests | Playwright (Chromium, which is close to OBS's browser) with screenshot checks |
| Lint / format | ESLint + Prettier |
| Typecheck | `tsc --noEmit` |
| Git hooks | husky → gitleaks (secrets) + lint-staged |
| CI | GitHub Actions: lint, typecheck, test, build, gitleaks, `npm audit` |
| Dependency updates | Dependabot |

## Hosting
- **Cloudflare Pages** (free). We chose it over GitHub Pages because GitHub Pages cannot set the security headers CLAUDE.md §7 requires.
- Production is the `main` branch. Staging is the automatic preview deploy for each branch or PR.
- Headers: `public/_headers`. SPA fallback: `public/_redirects`.

## Twitch data without login
- Chat, sub, resub, gift sub, raid and bits events arrive over anonymous IRC: `PRIVMSG` and `USERNOTICE` (which carries `msg-id`), plus the `bits` tag.
- `CLEARMSG` and `CLEARCHAT` remove deleted messages and banned users' messages.
- Emote images: `https://static-cdn.jtvnw.net/emoticons/v2/{id}/default/dark/1.0` (no auth).
- Badge **images** need the authenticated Helix API. Instead, we render **theme-styled badges** from the `badges` tag (broadcaster, moderator, vip, subscriber). This also matches the theme better.

## URL settings format
- Route per overlay: `/o/starting`, `/o/brb`, `/o/ending`, `/o/chat`, `/o/alerts`.
- Settings are in the **hash fragment**: `#<version>.<lz-string payload>`. The fragment is never sent to servers, and it is stripped from Sentry events.
- `src/settings/schema.ts` holds zod schemas per version. `src/settings/migrations.ts` upgrades any old version to the current one.
- `tests/fixtures/links/` keeps real links from every version. CI loads all of them.

## Folder structure
```
overlune/
├─ CLAUDE.md  README.md  LICENSE  .gitignore  .env.example
├─ docs/
│  ├─ PRD.md  TASKS.md  STACK.md  DESIGN.md  ASSETS.md  OBS-TESTING.md
│  └─ legal/            privacy.md, terms.md
├─ public/
│  ├─ _headers  _redirects
│  └─ sounds/           licensed alert sounds (recorded in ASSETS.md)
├─ src/
│  ├─ main.tsx  App.tsx  routes.tsx
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
