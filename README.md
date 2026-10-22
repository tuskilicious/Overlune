# Overlune

Free, open-source stream overlays that look professionally designed. Paste one link per overlay into OBS. No account, no payment.

It includes:
- Starting Soon, BRB, Stream Ending and Offline scenes
- A Twitch chat skin
- Alerts for raids, subs, gift subs and bits, with sound
- A webcam frame in your look
- A socials ticker
- Twitch panels and an offline banner, downloaded as pictures
- One file that imports every scene into OBS Studio
- 20 looks: Clean Slate, Neon Grid, Cozy Café, Arcade 8-Bit, Pastel Cloud, Forest Night, Bold Esports, Vaporwave Sunset, Daylight, Abyss, Session, Shonen, Sakura, Skate Deck, Phosphor, Quest, Eclipse, Rain City, Paper Cut and Aurora Tundra
- A step-by-step setup guide for OBS and Streamlabs

Everything matches one theme. Paste the links into OBS or Streamlabs and you're live.

> Status: v1.6.0, live at **https://overlune.in**. What changed: `CHANGELOG.md`. Work in progress: `docs/TASKS.md`. What's next: `docs/FUTURE-SCOPE.md`.

Overlune is a free, non-commercial hobby project, provided **as is, with no warranty** (see [License](#license)).

## For streamers
1. Open **https://overlune.in** and press **Make your overlays** (the editor is at **/editor**). Pick a look and type your text.
2. Copy each "Link to paste into OBS" into a Browser source, with the width and height shown next to it.
3. Stuck? Follow the setup guide at **https://overlune.in/guide**.

Your settings live in your links and your browser. There is nothing to sign up for.

## Setup
Requirements:
- Node.js 24 LTS
- Git
- [gitleaks](https://github.com/gitleaks/gitleaks), for the pre-commit secret scan
- OBS Studio, for testing overlays

```bash
git clone https://github.com/tuskilicious/Overlune.git overlune
cd overlune
npm ci
npx playwright install chromium   # one-time, for npm run test:e2e
cp .env.example .env.local   # fill in values if you use Sentry locally
```

Install gitleaks (the pre-commit hook refuses to commit without it):
- Windows: `winget install --id Gitleaks.Gitleaks`, then open a new terminal
- macOS: `brew install gitleaks`
- Linux: download a release binary from the gitleaks GitHub page

### Pre-commit checks
`npm ci` installs a git hook (husky) that runs on every commit:
1. gitleaks scans the staged changes and blocks the commit if it finds a secret.
2. lint-staged runs ESLint and Prettier on the staged files.

Never skip it with `--no-verify`. If a secret does get committed, rotate it first, then purge it from history (see `CLAUDE.md` §3).

## Environment variables (names only)
All are optional for local development. Without `VITE_SENTRY_DSN`, Sentry stays off.

| Name | Where | Purpose |
|---|---|---|
| `VITE_SENTRY_DSN` | client (public) | Sentry error tracking |
| `VITE_SENTRY_ENVIRONMENT` | client (public) | `development`, `staging` or `production` |
| `VITE_SENTRY_RELEASE` | client (public) | Release name for Sentry events. Optional: by default the build uses `overlune@<package.json version>`, plus the commit when CI builds it (e.g. `overlune@1.0.0+319afe4`). |
| `SENTRY_AUTH_TOKEN` | build only (a GitHub Actions secret, used for **production** builds) | Uploads source maps to Sentry during the production build, then deletes them so they're never served. Without it, no maps are built. Never in client code (see `docs/SENTRY.md`) |

Deploys run from GitHub Actions with a token for this account's Workers only (see Deploy).

The API (v2, `functions/`) also reads these, server only:

| Name | Where | Purpose |
|---|---|---|
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Worker secrets: `npx wrangler secret put <NAME>` for production (the Overlune Twitch app), `npx wrangler preview secret put <NAME>` for Previews (Overlune Staging) | Sign in with Twitch (T7.3). Locally, in `.dev.vars`, which git ignores |
| `AUTH_ORIGIN` | `wrangler.jsonc` | Where Sign in with Twitch comes back to: `https://overlune.in`, `https://staging-overlune.overlune.workers.dev` (the Preview of a branch named `staging`) or, in `.dev.vars`, `http://localhost:8787`. Each Twitch app lists `<AUTH_ORIGIN>/api/auth/twitch/callback` |
| `SAVED_OVERLAYS_OPEN` | `wrangler.jsonc` | `true` opens saved overlays (T12.2): on for Previews, off in production until the privacy policy covers them (T12.6), when their routes answer 404. Locally, in `.dev.vars` |
| `DB` | `wrangler.jsonc` (a binding, not a secret) | The D1 database: `overlune-production` for production, `overlune-staging` for Previews, and a local copy for `wrangler dev` |

## Optional tooling
- **21st.dev plugin for Claude Code.** A design reference for the editor and landing page only, never overlays (`docs/DESIGN.md`, "Outside components"). It reads `API_KEY_21ST`: set it in the plugin's own settings or in `.env.local`, which git ignores. It isn't an app variable (no `VITE_` prefix), so the build never puts it in client code. Never add it to CI, Cloudflare Pages or a URL, and don't use install commands that put the key in a URL. Hosted AI generation stays off: v1 has no AI (`CLAUDE.md`).

## Run
```bash
npm run dev          # editor at http://localhost:5173, guide at /guide, overlays at /o/<name>
npm run build        # production build into dist/
npm run preview      # serve the production build locally
```

The site and its API (`/api/*`, the Worker in `functions/index.ts`) run together under Wrangler, against a local D1:
```bash
npx wrangler d1 migrations apply DB --local     # once, and after each new migration
npm run build && npx wrangler dev               # the site and /api at http://localhost:8787
```
`wrangler.jsonc`'s top level is production, so local runs need a `.dev.vars` file (git ignores it) with `VITE_SENTRY_DSN=` (empty: Sentry off), `VITE_SENTRY_ENVIRONMENT=development`, `AUTH_ORIGIN=http://localhost:8787` and `SAVED_OVERLAYS_OPEN=true`, plus the staging Twitch app's `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` to try sign-in. Never run `wrangler dev --remote`: it would use production's database.

## Test
```bash
npm run lint         # ESLint + Prettier check (npm run format to fix)
npm run typecheck
npm test             # unit tests and the API against a local D1 (Vitest)
npm run test:e2e     # editor and overlay tests (Playwright)
```
Also test every overlay inside OBS. See `docs/OBS-TESTING.md`.

### Updating screenshot baselines
Screenshot tests (`*.visual.spec.ts`) only run on Linux, because fonts render differently on Windows and macOS. CI is the source of truth. When a screenshot test fails in CI, download the `playwright-results` artifact from the run to see the expected, actual and diff images. If the change was intended, copy the actual image over the baseline in `tests/e2e/*.visual.spec.ts-snapshots/` and commit it. A new screenshot test fails once in CI and writes its baseline into the same artifact.

## Deploy
One Cloudflare Worker (since T12.1; Cloudflare Pages before), deployed by GitHub Actions:
- CI builds the site, runs every check, prerenders the public pages (`npm run prerender`) and only then deploys. A pull request from this repository gets its own Preview at `<branch>-overlune.overlune.workers.dev`, with the staging database and Sentry (`wrangler preview`); merging to `main` deploys production (`wrangler deploy`). The deploy job runs while the repository variable `DEPLOY_FROM_ACTIONS` is `true`.
- `wrangler.jsonc` holds the Worker's settings: production at the top level, Previews under `previews`. The Worker runs only for `/api/*`; everything else is a static file from `dist/`, with `public/_headers` and `public/_redirects`. The API sets its own security headers (`functions/api/_middleware.ts`).
- Database migrations don't run on deploy. Apply each new one to staging with `npx wrangler d1 migrations apply overlune-staging --remote --config wrangler.preview-migrations.jsonc`, then to production with `npx wrangler d1 migrations apply overlune-production --remote` once its PR is approved.

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to `main`: lint, typecheck, unit tests, build, `npm audit`, Playwright tests, the prerender, a gitleaks scan, and the deploy. Its secrets: `CLOUDFLARE_PAGES_TOKEN` (the deploy token, named in the Pages days: this account's Workers Scripts and overlune.in's Workers Routes, Edit, plus Cloudflare Pages, Edit until that project is deleted) and `SENTRY_AUTH_TOKEN` (source maps for production); its variables: `CLOUDFLARE_ACCOUNT_ID` and `DEPLOY_FROM_ACTIONS`.

## Contributing notes
- **Overlay links are a public contract.** Streamers paste a link once and never touch it again. Every link carries a schema version. Never break an old link: add a migration plus a saved link in `tests/fixtures/links/` (see its README).
- **Adding a theme:** one file in `src/themes/` registered in `src/themes/index.ts`, with its id added to the end of `themeIds` (and any new fonts to the end of `fontIds`) in `src/themes/types.ts`. Add a link fixture in `tests/fixtures/links/`. The contrast test checks text on its surface meets WCAG AA. Record every font, sound and image in `docs/ASSETS.md`.
- **Test overlays in OBS**, not only in Chrome. See `docs/OBS-TESTING.md`.
- Chat text is untrusted: render it as React text, never as HTML.

## Docs
- Product: `docs/PRD.md`
- Tasks: `docs/TASKS.md`
- Stack and folder layout: `docs/STACK.md`
- Themes and design: `docs/DESIGN.md`
- Asset licenses: `docs/ASSETS.md`
- OBS test checklist: `docs/OBS-TESTING.md`
- Sentry setup: `docs/SENTRY.md`
- Privacy policy and terms: `docs/legal/privacy.md`, `docs/legal/terms.md`. They were written by the maintainer, have not been reviewed by a lawyer, and are not legal advice.
- Rules for Claude Code: `CLAUDE.md`

## Contact
overlune@proton.me

## License
MIT License. See [`LICENSE`](LICENSE). Overlune is provided "as is", without warranty of any kind. Fonts, sounds and art keep their own licenses, listed in `docs/ASSETS.md`.
