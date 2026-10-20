# CLAUDE.md: Overlune

Project rules for Claude Code. Follow these on every task. If a rule conflicts with a request, say so before proceeding.

**Overlune** is a free, open-source stream overlay maker. It gets a new streamer from zero to a stream that looks professionally designed, with no account and no payment.
- Product: `docs/PRD.md`
- Tasks: `docs/TASKS.md`
- Stack and folders: `docs/STACK.md`
- Themes and design: `docs/DESIGN.md`
- Asset licenses: `docs/ASSETS.md`
- OBS test steps: `docs/OBS-TESTING.md`

## Overlune-specific rules
- **v1 is a static site:** no backend, no database, no accounts, no payments, no AI. Adding any of these needs approval first. Sections 4, 5 and 8 become mandatory the moment one is added.
- **v2 is approved (2026-10-09) on Cloudflare only:** Pages Functions, D1, Durable Objects and R2, with sign-in through Twitch (`docs/STACK.md`, `docs/TASKS.md` Phase 7). Still no payments and no AI.
- **Test every overlay inside OBS** (OBS uses its own Chromium) before a task is done. Follow `docs/OBS-TESTING.md`.
- **The overlay URL format is a public contract.** Streamers paste a link once and never touch it again. Every payload carries a schema version. Never break an old link: add a migration plus a test instead.
- **Never put login tokens or secrets in an overlay URL.** Streamers show their screens.
- **Chat text is hostile input.** Render messages and emotes as React elements. Never use `innerHTML` or `dangerouslySetInnerHTML`.
- **Overlays must be lightweight:** CSS or canvas effects, plus GSAP in lazy chunks for alert and scene sequences (always through `animate()` in `src/lib/motion.ts`, `docs/STACK.md`). No video backgrounds, and they must run smoothly on low-end PCs. Every animation needs a reduced-motion version.
- **Write UI copy for beginners.** Say "Link to paste into OBS", not "Browser Source URL".
- **Use only free-licensed fonts, sounds and art,** and record each one in `docs/ASSETS.md`.
- **Component galleries (21st.dev) are a reference for the editor and landing page only,** never for overlays. Port the behavior; copy code only under a stated license (`docs/DESIGN.md`).

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
> **Status: active since 2026-10-13** (v2 Phase 1: accounts in Cloudflare D1, launched in T7.9).

- D1 has no row-level security, so access control lives in one server-side data layer: every read and write goes through it, scoped to the signed-in user, default deny. Route handlers never query D1 directly.
- Check record ownership on the server for every read, update and delete. Never trust client-supplied IDs or roles.
- Block field tampering: allowlist writable fields (no mass assignment), and never let clients set `role`, `price`, `owner_id` or similar.
- Encrypt sensitive data at rest, and use field-level encryption for the most sensitive values.
- Collect only the data the product needs. (v1 collects none: settings live in the user's link and browser.)
- Least privilege: each Function gets only the bindings it needs, and CI tokens get only the permissions their job needs. No account-wide tokens in app code.
- Trim API responses to the fields the client needs. Never return password hashes, tokens or internal fields.
- **Access-control tests (required):** user A tries to read, edit and delete user B's records through every endpoint and by guessing IDs. Every attempt must return 403/404. Run them in CI. A new route does not ship without its test: add it to the registry in `tests/functions/access.test.ts`, which fails for any file in `functions/api/` that isn't listed.
- **Backups (required):** point-in-time recovery (D1 Time Travel) plus a nightly encrypted copy stored outside the Cloudflare account. Do a real test restore before launch and after major schema changes.

## 5. Auth and sessions
> **Status: active since 2026-10-13.** Sign in with Twitch is live on overlune.in (T7.9). Tokens must never appear in overlay URLs.

- Sign-in is Twitch OAuth only (authorization code with OpenID Connect: a `state` check, a `nonce`, and the ID token's signature and claims verified. Twitch has no PKCE: its discovery document lists no `code_challenge_methods`, checked 2026-10-09, so the client secret stays on the server and state plus nonce tie the answer to the browser that asked; owner-approved 2026-10-09): Twitch is the identity provider, and Overlune never sees or stores a password. Use a small, well-reviewed OAuth library over hand-rolled protocol code.
- Enforce auth on the server for every protected route. Client-side checks are UX only.
- Session tokens are random (256 bits) and stored only as a hash. Never store or log a token or a Twitch access token, and never use fast hashes like MD5 or SHA-1 for anything secret.
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`, with a sensible expiry.
- Add CSRF protection for cookie-authenticated state-changing requests.
- "Sign out everywhere" deletes every session of that account. There are no passwords, so no password resets.
- Prevent user enumeration: any route that looks up an account or overlay by ID answers "not found" and "not yours" the same way.
- Rate limit the sign-in routes (start and callback) per IP. Avoid hard account lockouts, which attackers can use to lock out real users.
- **MFA:** Twitch handles it for users (Twitch two-factor). Require 2FA on every admin account: GitHub, Cloudflare, Sentry and the Twitch developer console.

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
- Security headers live in `public/_headers`: HSTS, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `frame-ancestors 'self'`. The CSP must allow only what is needed: Twitch IRC WebSocket, the Twitch emote CDN, Sentry, Cloudflare Web Analytics and `https:` images for logos.
- Disable directory listing. Ship no debug routes or sample pages.
- Logs: v1 has no server logs. Sentry must use `sendDefaultPii: false` and strip URL fragments, which hold user settings. Never send tokens or full URLs.
- Scan dependencies in CI (`npm audit` plus Dependabot). Pin versions and review new packages before adding them.

## 8. Abuse, payments and AI
> **Status: abuse rules apply from v2 Phase 1** (public endpoints on Cloudflare). There are still no payments or AI features. Donations are handled by third-party services the streamer already uses.

- Rate limit login, signup, password reset, and any expensive or public endpoint. Use stricter limits on reset flows.
- Add bot protection (CAPTCHA or Turnstile) on signup, login and public forms.
- Webhooks (Twitch EventSub in v2): verify the signature and the timestamp, reject replays, and make handlers idempotent.
- Payments: none. If that ever changes, set prices **server-side** only.
- AI features: cap usage per user and globally, and set provider-side budget alerts.
- Prompt injection: treat model output as untrusted, give tools least privilege, confirm destructive actions, keep secrets out of prompts, and validate model output.

## 9. Legal and accessibility
> Claude can draft these. They are self-written and self-reviewed by the maintainer (Overlune is a free, non-commercial hobby project with no lawyer), and must say they are not legal advice. Requirements vary by jurisdiction (GDPR, CCPA, COPPA, etc.).

- **Documents:** privacy policy and terms of service, in `docs/legal/` and linked in the footer. No refund policy is needed while the product is free. The footer shows a contact email. An individual maintainer does not publish a home address.
- **Privacy policy must state:** accounts are optional, and for those who sign in with Twitch, what is stored, why, for how long (backups included) and how to see and delete it; settings live in the user's link and browser; Twitch chat is read anonymously; what Sentry collects; any analytics.
- **Consent:** no cookie banner as long as there are no non-essential cookies or trackers. Adding analytics needs approval and must be cookie-free. Approved (2026-10-08): Cloudflare Web Analytics, injected by Cloudflare Pages; cookie-free, and it never sends the part of a link after `#`.
- **Fair practice:** no dark patterns and no unsupported claims. License all fonts, sounds and images, and record them in `docs/ASSETS.md`.
- **Accessibility:** editor meets WCAG AA contrast, has full keyboard navigation with visible focus, and has meaningful alt text. Overlays support reduced motion.

## Pre-launch checklist
Signed off 2026-10-01 for v1 (T5.6). Re-checked 2026-10-03 for the 1.0.0 release (T6.83). Re-checked 2026-10-13 for accounts (T7.9), with items 2 to 4 active. Re-checked 2026-10-14 for the 2.0.0 release (T9.10). Re-checked 2026-10-15 for the 2.1.0 release (T10.10). Re-checked 2026-10-20 for the 2.2.0 release (T11.7). Re-check every item before any later launch or when a change touches it.
- [x] 1. Rotate any exposed keys. Secret scanning is on locally and in CI. *(Owner confirmed no key was exposed. gitleaks pre-commit and CI; GitHub secret scanning and push protection on, rechecked 2026-10-13; no new secrets or keys since, 2026-10-14. 2026-10-15: no new secrets or keys; gitleaks remains in the commit hook and CI. 2026-10-20: deploys moved to GitHub Actions; the owner put the new CI-only secrets (`CLOUDFLARE_PAGES_TOKEN`, Cloudflare Pages Edit only; `SENTRY_AUTH_TOKEN`) straight into GitHub secrets, never in the repo or chat; no key exposed; gitleaks still in the hook and CI.)*
- [x] 2. Access-control tests (D1 has no RLS). *(2026-10-13: `tests/functions/access.test.ts` attacks every API route and runs in CI; its registry fails for any route without an entry. 2026-10-14: no API route changed since. 2026-10-15: no API changes since 2.0.0; the access tests stand. 2026-10-20: signed-out `/api/me` answers an empty 204 instead of 401 (#264), with the access tests updated to match; no new route.)*
- [x] 3. Backups and a real restore. *(2026-10-13: D1 Time Travel on; nightly age-encrypted copies kept 90 days outside Cloudflare; restore drill with real account rows passed, logged in `docs/BACKUPS.md`. 2026-10-14: no schema change since. 2026-10-15: no migration changes since 2.0.0; backups and the restore check stand. 2026-10-20: still no migration since 2.0.0; they stand.)*
- [x] 4. MFA: 2FA on GitHub, Cloudflare, Sentry and the Twitch developer console; users get Twitch's own. *(Owner confirmed all four, 2026-10-13. 2026-10-15: the existing owner confirmation stands; nothing new needed. 2026-10-20: stands.)*
- [x] 5. Sentry events contain no settings fragments, tokens or PII. *(Owner checked production events. Fragments stripped, no chat text, IP storage off. Performance samples can include the logo link, as the privacy policy states. 2026-10-13: no Sentry span has ever had a cookie or authorization header, an IP or a user id; sign-in callbacks show `code` and `state` as `[Filtered]`; no production errors. 2026-10-14: layouts live in the fragment, which is stripped; no production errors from Phase 9. 2026-10-15: settings still live in the stripped fragment; no API or Sentry configuration change since 2.0.0, so the existing check stands. 2026-10-20: the Sentry client is unchanged; source maps now upload from CI (token CI-only); the look pages carry no settings.)*
- [x] 6. Security headers, HTTPS and HSTS verified on production. *(HSTS, CSP with frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy; HTTP 301 to HTTPS. 2026-10-13: the API's own headers too (`default-src 'none'`, `no-store`). 2026-10-14: unchanged. 2026-10-15: no API or public/_headers changes since 2.0.0; the production headers check stands. 2026-10-20: rechecked on overlune.in after the Actions deploys, on a look page: HSTS, CSP, nosniff, Referrer-Policy, Permissions-Policy; HTTP 301 to HTTPS. `public/_headers` unchanged; the prerendered pages keep the CSP by moving inline styles into stylesheets.)*
- [x] 7. Dependency scan is clean. *(`npm audit`: 0 vulnerabilities, rechecked 2026-10-14. 2026-10-15: owner confirmed npm audit shows 0 vulnerabilities. 2026-10-20: `npm audit` 0 vulnerabilities.)*
- [x] 8. Privacy policy and terms are drafted and self-reviewed by the maintainer, and say they are not legal advice. *(Rewritten for accounts in T7.8, owner-approved 2026-10-13. 2026-10-14: canvas pictures and text added for 2.0.0. 2026-10-15: the legal diff since 2.0.0 contains only the owner-approved local-storage line for site light mode and the phone notice (2026-10-14); left unchanged. 2026-10-20: the legal diff since 2.1.0 is only the owner-requested contact email, overlune@proton.me, and its date.)*
- [x] 9. Every overlay passed `docs/OBS-TESTING.md` in OBS and Streamlabs. *(2026-10-13: no overlay changed in Phase 7; the owner loaded one in OBS after the launch. 2026-10-14: the owner's OBS run for 2.0.0 passed: Live with chat and a test alert, scenes and Live at 1280×720, an old link. 2026-10-15: the owner reported the vertical OBS and private-live phone safe-zone checks passed; no words under the apps' buttons or comments. Logged in OBS-TESTING.md; OBS version and CPU not recorded. 2026-10-20: Eclipse, Rain City, Paper Cut and Aurora Tundra each have an owner-reported horizontal and vertical pass (Paper Cut's confirmed 2026-10-20); #263 later took the tiles off Rain City's countdown separators, covered by its e2e but not re-checked in OBS; Phase 15 changed no overlay. Streamlabs not tested.)*
- [x] 10. Old-link test: URLs from every earlier schema version still load. *(Fixture test in CI. 2026-10-15: old-link fixtures remain in CI for the release. 2026-10-20: they remain, with a fixture per new look.)*
