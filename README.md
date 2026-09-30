# Overlune

Free, open-source stream overlays that look professionally designed, set up in OBS in under 10 minutes. No account, no payment.

It includes:
- Starting Soon, BRB and Stream Ending scenes
- A Twitch chat skin
- Alerts for raids, subs, gift subs and bits

Everything matches one theme. Paste the links into OBS or Streamlabs and you're live.

> Status: pre-v1, in development. See `docs/TASKS.md`.

## Setup
Requirements:
- Node.js 24 LTS
- Git
- [gitleaks](https://github.com/gitleaks/gitleaks), for the pre-commit secret scan
- OBS Studio, for testing overlays

```bash
git clone <repo-url> overlune
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
| Name | Where | Purpose |
|---|---|---|
| `VITE_SENTRY_DSN` | client (public) | Sentry error tracking |
| `VITE_SENTRY_ENVIRONMENT` | client (public) | `development`, `staging` or `production` |
| `VITE_SENTRY_RELEASE` | client (public, set by CI) | Git commit SHA |
| `SENTRY_AUTH_TOKEN` | CI only | Upload source maps |
| `CLOUDFLARE_API_TOKEN` | CI only | Deploy |
| `CLOUDFLARE_ACCOUNT_ID` | CI only | Deploy |

## Run
```bash
npm run dev          # editor at http://localhost:5173, overlays at /o/<name>
```

## Test
```bash
npm run lint         # ESLint + Prettier check (npm run format to fix)
npm run typecheck
npm test             # unit tests (Vitest)
npm run test:e2e     # overlay smoke tests (Playwright)
```
Also test every overlay inside OBS. See `docs/OBS-TESTING.md`.

### Updating screenshot baselines
Screenshot tests (`*.visual.spec.ts`) only run on Linux, because fonts render differently on Windows and macOS. CI is the source of truth. When a screenshot test fails in CI, download the `playwright-results` artifact from the run to see the expected, actual and diff images. If the change was intended, copy the actual image over the baseline in `tests/e2e/*.visual.spec.ts-snapshots/` and commit it. A new screenshot test fails once in CI and writes its baseline into the same artifact.

## Deploy
Cloudflare Pages:
- Every PR gets a preview deploy (staging).
- Merging to `main` deploys production.
- Security headers live in `public/_headers`.

Pages settings: build command `npm run build`, output `dist`, Node from `.nvmrc`. Environment variables (Settings → Variables):

| Variable | Production | Preview |
|---|---|---|
| `VITE_SENTRY_DSN` | the Sentry DSN | the Sentry DSN |
| `VITE_SENTRY_ENVIRONMENT` | `production` | `staging` |

## Docs
- Product: `docs/PRD.md`
- Tasks: `docs/TASKS.md`
- Stack and folder layout: `docs/STACK.md`
- Themes and design: `docs/DESIGN.md`
- Asset licenses: `docs/ASSETS.md`
- Rules for Claude Code: `CLAUDE.md`

## License
MIT. See `LICENSE`. Fonts, sounds and art keep their own licenses, listed in `docs/ASSETS.md`.
