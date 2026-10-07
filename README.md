# Overlune

Free, open-source stream overlays that look professionally designed. Paste one link per overlay into OBS. No account, no payment.

It includes:
- Starting Soon, BRB and Stream Ending scenes
- A Twitch chat skin
- Alerts for raids, subs, gift subs and bits, with sound
- A webcam frame in your look
- A socials ticker
- Twitch panels and an offline banner, downloaded as pictures
- One file that imports every scene into OBS Studio
- 16 looks: Clean Slate, Neon Grid, Cozy Café, Arcade 8-Bit, Pastel Cloud, Forest Night, Bold Esports, Vaporwave Sunset, Daylight, Abyss, Session, Shonen, Sakura, Skate Deck, Phosphor and Quest
- A step-by-step setup guide for OBS and Streamlabs

Everything matches one theme. Paste the links into OBS or Streamlabs and you're live.

> Status: v1.2.0, live at **https://overlune.in**. What changed: `CHANGELOG.md`. Work in progress: `docs/TASKS.md`. What's next: `docs/FUTURE-SCOPE.md`.

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
| `VITE_SENTRY_RELEASE` | client (public) | Release name for Sentry events. Optional: by default the build uses `overlune@<package.json version>`, plus the commit on Cloudflare Pages (e.g. `overlune@1.0.0+319afe4`). |
| `SENTRY_AUTH_TOKEN` | build only (Cloudflare Pages **production**, as an encrypted secret) | Uploads source maps to Sentry during the production build, then deletes them so they're never served. Without it, no maps are built. Never in client code (see `docs/SENTRY.md`) |

Deploys use the Cloudflare Pages Git integration, so no Cloudflare token is needed.

## Run
```bash
npm run dev          # editor at http://localhost:5173, guide at /guide, overlays at /o/<name>
npm run build        # production build into dist/
npm run preview      # serve the production build locally
```

## Test
```bash
npm run lint         # ESLint + Prettier check (npm run format to fix)
npm run typecheck
npm test             # unit tests (Vitest)
npm run test:e2e     # editor and overlay tests (Playwright)
```
Also test every overlay inside OBS. See `docs/OBS-TESTING.md`.

### Updating screenshot baselines
Screenshot tests (`*.visual.spec.ts`) only run on Linux, because fonts render differently on Windows and macOS. CI is the source of truth. When a screenshot test fails in CI, download the `playwright-results` artifact from the run to see the expected, actual and diff images. If the change was intended, copy the actual image over the baseline in `tests/e2e/*.visual.spec.ts-snapshots/` and commit it. A new screenshot test fails once in CI and writes its baseline into the same artifact.

## Deploy
Cloudflare Pages:
- Every PR gets a preview deploy (staging).
- Merging to `main` deploys production.
- Security headers live in `public/_headers`.

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to `main`: lint, typecheck, unit tests, build, `npm audit`, Playwright tests and a gitleaks scan.

### Cloudflare Pages settings
Pages settings: build command `npm run build`, output `dist`, Node from `.nvmrc`. Environment variables (Settings → Variables):

| Variable | Production | Preview |
|---|---|---|
| `VITE_SENTRY_DSN` | the Sentry DSN | the Sentry DSN |
| `VITE_SENTRY_ENVIRONMENT` | `production` | `staging` |

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
support@overlune.in

## License
MIT License. See [`LICENSE`](LICENSE). Overlune is provided "as is", without warranty of any kind. Fonts, sounds and art keep their own licenses, listed in `docs/ASSETS.md`.
