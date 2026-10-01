# CLAUDE.md: Overlune

Project rules for Claude Code. Follow these on every task. If a rule conflicts with a request, say so before proceeding.

**Overlune** is a free, open-source stream overlay maker. It gets a new streamer from zero to a stream that looks professionally designed in under 10 minutes.
- Product: `docs/PRD.md`
- Tasks: `docs/TASKS.md`
- Stack and folders: `docs/STACK.md`
- Themes and design: `docs/DESIGN.md`
- Asset licenses: `docs/ASSETS.md`
- OBS test steps: `docs/OBS-TESTING.md`

## Overlune-specific rules
- **v1 is a static site:** no backend, no database, no accounts, no payments, no AI. Adding any of these needs approval first. Sections 4, 5 and 8 become mandatory the moment one is added.
- **Test every overlay inside OBS** (OBS uses its own Chromium) before a task is done. Follow `docs/OBS-TESTING.md`.
- **The overlay URL format is a public contract.** Streamers paste a link once and never touch it again. Every payload carries a schema version. Never break an old link: add a migration plus a test instead.
- **Never put login tokens or secrets in an overlay URL.** Streamers show their screens.
- **Chat text is hostile input.** Render messages and emotes as React elements. Never use `innerHTML` or `dangerouslySetInnerHTML`.
- **Overlays must be lightweight:** CSS or canvas effects only, no video backgrounds, and they must run smoothly on low-end PCs. Every animation needs a reduced-motion version.
- **Write UI copy for beginners.** Say "Link to paste into OBS", not "Browser Source URL".
- **Use only free-licensed fonts, sounds and art,** and record each one in `docs/ASSETS.md`.

## 0. How to work
- Read `docs/PRD.md` before starting. Work from `docs/TASKS.md`, one task at a time.
- Do not add features listed under "Out of scope" in the PRD.
- Commit small and often, one logical change per commit, with a clear message.
- Before finishing a task: run `npm run lint`, `npm run typecheck` and `npm test`, tick the task in `docs/TASKS.md`, and list what you changed.
- When unsure, ask instead of guessing.

## 1. Plan before coding
- The PRD covers: value proposition, user pain, ideal customer profile (ICP), core flows, success metrics.
- Keep the PRD in `docs/PRD.md` and break it into small, testable tasks in `docs/TASKS.md`.
- The tech stack is locked in `docs/STACK.md`. Do not swap or add major dependencies without approval.
- Keep an explicit **Out of scope** list in the PRD.

## 2. Repo and workflow
- `.gitignore` is in place **before the first commit**. It covers `.env*`, `node_modules`, build output, OS files and IDE files.
- Keep this file concise. Move long detail into `docs/`.
- Maintain `README.md`: what it is, setup, env vars (names only), run, test, deploy.
- Follow the folder structure in `docs/STACK.md`. Do not create ad-hoc top-level folders.
- Separate staging and production. For v1, staging is Cloudflare Pages preview deploys (one per branch/PR) and production is the `main` branch. Each has its own env vars and Sentry environment. There are no databases in v1.
- Add error tracking (Sentry) in both environments.
- Design system: `docs/DESIGN.md`. Use it for all UI work.

## 3. Secrets and config
- Secrets live only in environment variables. Never hardcode them or put them in client code.
- Commit `.env.example` with names and no values.
- Only public keys may reach the client (e.g. the Sentry DSN). Admin tokens (e.g. `SENTRY_AUTH_TOKEN`, Cloudflare API tokens) are **CI-only**.
- If a secret is ever committed or exposed: **rotate it first**, then purge it from git history. Purging alone is not enough.
- Add secret scanning: a gitleaks pre-commit hook and GitHub secret scanning with push protection. Run gitleaks in CI too.

## 4. Data and database
> **v1 status: not active.** v1 has no database or server. These rules become mandatory as soon as any change adds one.

- Enable row-level security (RLS) on every table. Default deny, then add explicit policies.
- Check record ownership on the server for every read, update and delete. Never trust client-supplied IDs or roles.
- Block field tampering: allowlist writable fields (no mass assignment), and never let clients set `role`, `price`, `owner_id` or similar.
- Encrypt sensitive data at rest, and use field-level encryption for the most sensitive values.
- Collect only the data the product needs. (v1 collects none: settings live in the user's link and browser.)
- Give the app's DB user least-privilege permissions. No superuser in app code.
- Trim API responses to the fields the client needs. Never return password hashes, tokens or internal fields.
- **Access-control tests (required):** user A tries to read, edit and delete user B's records through every endpoint and by guessing IDs. Every attempt must return 403/404. Run them in CI. A new route does not ship without its test.
- **Backups (required):** automated daily backups with point-in-time recovery, stored in a separate account or region. Do a real test restore before launch and after major schema changes.

## 5. Auth and sessions
> **v1 status: not active.** v1 has no accounts. v2 follow alerts will use Twitch OAuth (a managed provider). When that lands, every rule below applies. Tokens must also never appear in overlay URLs.

- Prefer a managed auth provider over building auth from scratch.
- Enforce auth on the server for every protected route. Client-side checks are UX only.
- Hash passwords with argon2id or bcrypt. Never store or log plaintext, and never use fast hashes like MD5 or SHA-1.
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`, with a sensible expiry.
- Add CSRF protection for cookie-authenticated state-changing requests.
- Invalidate all other sessions on password change.
- Password reset links: single-use, short expiry, high-entropy tokens.
- Prevent user enumeration: identical responses and timing for "user exists" and "user not found" on login, signup and reset.
- Throttle or progressively delay after failed logins. Avoid hard account lockouts, which attackers can use to lock out real users.
- **MFA:** support TOTP or passkeys for all users, and require it for admin accounts. Use the provider's built-in MFA where available.

## 6. Input, output and injection
- Use parameterized queries or an ORM. Never build SQL by string concatenation. (No SQL in v1.)
- Validate all input with a schema library (zod) and reject by default. In v1, "input" means URL settings, editor fields and Twitch IRC messages. Validate type, length, format and range. Invalid URL settings fall back to theme defaults and show a visible error state.
- Escape output for its context (HTML, attributes, URLs, JS). Use React's auto-escaping, and avoid `dangerouslySetInnerHTML` and `innerHTML`.
- Do not "sanitize before storing" as a substitute for escaping. Validate on input, escape on output.
- User image URLs (logos) are allowed only as `https:`. Never allow `javascript:` or `data:` from user input.
- File uploads: none in v1. If added: allowlist types by content, enforce max size, randomize filenames, store outside the web root, and never execute uploads.
- Limit request body size and lock down CORS on any endpoint. (There are no endpoints in v1.)

## 7. Network and hardening
- Force HTTPS everywhere and redirect HTTP to HTTPS. Cloudflare Pages does this.
- Security headers live in `public/_headers`: HSTS, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `frame-ancestors 'self'`. The CSP must allow only what is needed: Twitch IRC WebSocket, the Twitch emote CDN, Sentry and `https:` images for logos.
- Disable directory listing. Ship no debug routes or sample pages.
- Logs: v1 has no server logs. Sentry must use `sendDefaultPii: false` and strip URL fragments, which hold user settings. Never send tokens or full URLs.
- Scan dependencies in CI (`npm audit` plus Dependabot). Pin versions and review new packages before adding them.

## 8. Abuse, payments and AI
> **v1 status: not active.** There are no public endpoints, payments or AI features. Donations are handled by third-party services the streamer already uses. The rules apply if any of these are added.

- Rate limit login, signup, password reset, and any expensive or public endpoint. Use stricter limits on reset flows.
- Add bot protection (CAPTCHA or Turnstile) on signup, login and public forms.
- Payments: verify webhook signatures, make handlers idempotent, and set prices **server-side** only.
- AI features: cap usage per user and globally, and set provider-side budget alerts.
- Prompt injection: treat model output as untrusted, give tools least privilege, confirm destructive actions, keep secrets out of prompts, and validate model output.

## 9. Legal and accessibility
> Claude can draft these. They are self-written and self-reviewed by the maintainer (Overlune is a free, non-commercial hobby project with no lawyer), and must say they are not legal advice. Requirements vary by jurisdiction (GDPR, CCPA, COPPA, etc.).

- **Documents:** privacy policy and terms of service, in `docs/legal/` and linked in the footer. No refund policy is needed while the product is free. The footer shows a contact email. An individual maintainer does not publish a home address.
- **Privacy policy must state:** no accounts; settings live in the user's link and browser; Twitch chat is read anonymously; what Sentry collects; any analytics.
- **Consent:** no cookie banner as long as there are no non-essential cookies or trackers. Adding analytics needs approval and must be cookie-free.
- **Fair practice:** no dark patterns and no unsupported claims. License all fonts, sounds and images, and record them in `docs/ASSETS.md`.
- **Accessibility:** editor meets WCAG AA contrast, has full keyboard navigation with visible focus, and has meaningful alt text. Overlays support reduced motion.

## Pre-launch checklist
Signed off 2026-10-01 for v1 (T5.6). Re-check every item before any later launch or when a change touches it.
- [x] 1. Rotate any exposed keys. Secret scanning is on locally and in CI. *(Owner confirmed no key was exposed. gitleaks pre-commit and CI; GitHub secret scanning and push protection on.)*
- [x] 2. RLS and access-control tests: **N/A for v1** (no database). Confirm this is still true. *(Still true: no server, Pages Functions, database, cookies or fetch calls.)*
- [x] 3. Backups: **N/A for v1** (no data). The repo is the source of truth.
- [x] 4. MFA: **N/A for v1** (no accounts). Turn on 2FA for the GitHub, Cloudflare and Sentry accounts. *(Owner confirmed.)*
- [x] 5. Sentry events contain no settings fragments, tokens or PII. *(Owner checked production events. Fragments stripped, no chat text, IP storage off. Performance samples can include the logo link, as the privacy policy states.)*
- [x] 6. Security headers, HTTPS and HSTS verified on production. *(HSTS, CSP with frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy; HTTP 301 to HTTPS.)*
- [x] 7. Dependency scan is clean. *(`npm audit`: 0 vulnerabilities.)*
- [x] 8. Privacy policy and terms are drafted and self-reviewed by the maintainer, and say they are not legal advice.
- [x] 9. Every overlay passed `docs/OBS-TESTING.md` in OBS and Streamlabs.
- [x] 10. Old-link test: URLs from every earlier schema version still load. *(Fixture test in CI.)*
