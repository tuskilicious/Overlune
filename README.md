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
- Node.js 22 LTS
- Git
- [gitleaks](https://github.com/gitleaks/gitleaks), for the pre-commit secret scan
- OBS Studio, for testing overlays

```bash
git clone <repo-url> overlune
cd overlune
npm ci
cp .env.example .env.local   # fill in values if you use Sentry locally
```

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
npm run lint
npm run typecheck
npm test             # unit tests (Vitest)
npm run test:e2e     # overlay smoke tests (Playwright)
```
Also test every overlay inside OBS. See `docs/OBS-TESTING.md`.

## Deploy
Cloudflare Pages:
- Every PR gets a preview deploy (staging).
- Merging to `main` deploys production.
- Security headers live in `public/_headers`.

## Docs
- Product: `docs/PRD.md`
- Tasks: `docs/TASKS.md`
- Stack and folder layout: `docs/STACK.md`
- Themes and design: `docs/DESIGN.md`
- Asset licenses: `docs/ASSETS.md`
- Rules for Claude Code: `CLAUDE.md`

## License
To be decided (MIT recommended). See `docs/TASKS.md` T0.1.
