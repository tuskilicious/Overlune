# Overlune: Tasks

Work one task at a time, top to bottom. A task is done when its acceptance criteria pass, lint, typecheck and tests pass, and overlay tasks have passed `docs/OBS-TESTING.md`. Tick the box when done.

## Phase 0: Repo foundation
- [ ] **T0.1 Choose license.** MIT is recommended. Add `LICENSE`. *Needs owner decision.*
- [ ] **T0.2 Git init.** `.gitignore` is already present. Make the first commit with the docs only.
- [ ] **T0.3 Scaffold** Vite + React + TS (strict) per `docs/STACK.md`. *Files written by hand. Run `npm install`, then pin the exact installed versions in `package.json` and commit the lockfile.*
  - Accept: `npm run dev` shows a placeholder editor page and `/o/starting` shows a placeholder overlay.
- [ ] **T0.4 Scripts:** `lint`, `typecheck`, `test`, `test:e2e`, `build`, with ESLint and Prettier configured.
  - Accept: all scripts pass on a clean checkout.
- [ ] **T0.5 Secret scanning:** husky pre-commit running gitleaks and lint-staged. Document installing gitleaks in the README.
  - Accept: committing a fake token is blocked.
- [ ] **T0.6 CI:** `.github/workflows/ci.yml` runs lint, typecheck, test, build, gitleaks and `npm audit --audit-level=high`. Add `dependabot.yml`.
  - Accept: CI is green on a PR.
- [ ] **T0.7 Deploy:** Cloudflare Pages with production on `main` and previews on PRs. Add `public/_headers` (CSP, HSTS, etc.) and `public/_redirects` for the SPA fallback.
  - Accept: headers are verified on the preview URL with `curl -I`.
- [ ] **T0.8 Sentry:** separate staging and production environments, `sendDefaultPii: false`, and a `beforeSend` that strips URL fragments.
  - *Code is in place (see `docs/SENTRY.md`). Remaining: add the DSN, run the verify step, and set the Cloudflare env vars.*
  - Accept: a test error appears in Sentry without the settings fragment.
- [ ] **T0.9 Owner setup:** turn on 2FA for GitHub, Cloudflare and Sentry, and enable GitHub secret scanning with push protection. *Owner does this.*

## Phase 1: Week 1, one scene working in OBS
- [ ] **T1.1 Theme types + Clean Slate theme** per `docs/DESIGN.md`. Self-host fonts and record them in `docs/ASSETS.md`.
- [ ] **T1.2 Settings v1 schema** (zod) and URL encode/decode (`#1.<lz-string>`).
  - Accept: unit tests cover a round trip, invalid input falling back to defaults, a `javascript:` logo URL being rejected, and very long text being truncated.
- [ ] **T1.3 Starting Soon overlay:** title, subtitle, socials row, and a countdown to a fixed end time with the timezone shown. At zero it shows a custom message.
  - Accept: reloading the page does not reset the countdown, and a unit test covers the time math.
- [ ] **T1.4 Overlay error state component,** shown for invalid settings.
- [ ] **T1.5 Reduced motion:** the `?rm=1` flag and `prefers-reduced-motion` both disable animations.
- [ ] **T1.6 Write `docs/OBS-TESTING.md` results for Starting Soon.** Check it in OBS and Streamlabs: transparency, fonts, countdown after a scene switch, and CPU use.
- [ ] **T1.7 Playwright smoke test** that renders `/o/starting` with a fixture link and compares a screenshot.
- [ ] **T1.8 Save the first link fixture** to `tests/fixtures/links/v1/`.

## Phase 2: Scenes + editor
- [ ] **T2.1 BRB and Stream Ending overlays,** reusing the shared scene frame.
- [ ] **T2.2 Editor shell:** theme picker with a full-stream preview and text fields for each overlay.
- [ ] **T2.3 Live preview** that renders the overlay components directly (same code as OBS).
- [ ] **T2.4 "Link to paste into OBS" panel:** copy button and width × height shown for each overlay.
- [ ] **T2.5 "Load my overlay from a link"** and "Your link is your save file" messaging.
- [ ] **T2.6 Local autosave** (localStorage, wrapped in try/catch). The editor still works without it.
- [ ] **T2.7 Advanced section** for color and font overrides, collapsed by default.
- [ ] **T2.8 Accessibility pass on the editor:** keyboard navigation, focus rings, labels, AA contrast.

## Phase 3: Chat skin
- [ ] **T3.1 IRC parser** (`src/twitch/parse.ts`) that turns raw IRC lines into typed events.
  - Accept: unit tests with real sample lines for PRIVMSG, USERNOTICE (sub, resub, subgift, raid), bits, CLEARMSG, CLEARCHAT and PING.
- [ ] **T3.2 Anonymous connection** (`irc.ts`) with PING/PONG, reconnect with backoff, and a "can't connect / check channel name" state.
- [ ] **T3.3 Chat overlay:** message list, name colors, emotes rendered as `<img>` elements (no innerHTML), theme-styled role badges, long-message wrapping, and a max message count.
- [ ] **T3.4 Filters:** hide known bots (editable list) and `!commands`, and remove messages on CLEARMSG and CLEARCHAT.
- [ ] **T3.5 Chat options:** size, font scale, and optional fade-out.
- [ ] **T3.6 OBS test + Playwright test** using a mocked IRC feed.

## Phase 4: Alerts
- [ ] **T4.1 Alert event mapping** from parsed events: raid, sub, resub, gift sub, bits.
- [ ] **T4.2 Alert queue:** one at a time, bursts are handled, and there is a maximum queue length.
  - Accept: unit test with 20 events arriving at once.
- [ ] **T4.3 Alert templates** with `{user}` and `{amount}` variables. Values are escaped.
- [ ] **T4.4 Sound playback,** with a volume setting and licensed default sounds recorded in `ASSETS.md`.
- [ ] **T4.5 Test buttons in the editor** that trigger alerts in the preview. Follows and donations are shown as "coming soon".
- [ ] **T4.6 OBS test,** including "Control audio via OBS".

## Phase 5: Launch
- [ ] **T5.1 Neon Grid theme.**
- [ ] **T5.2 Cozy Café theme.**
- [ ] **T5.3 Setup guide page** for OBS and Streamlabs, with screenshots: Browser Source, sizes, black box fix, blank chat fix, audio.
- [ ] **T5.4 Legal drafts** in `docs/legal/` (privacy policy and terms) plus footer links and a contact email. *Needs review.*
- [ ] **T5.5 README complete:** what it is, setup, env var names, run, test, deploy.
- [ ] **T5.6 Pre-launch checklist** in CLAUDE.md, all items checked.
- [ ] **T5.7 Launch:** use it live on the owner's stream and hand it to 5 streamers.

## Post-launch
- [ ] **T6.1–T6.5 Themes 4–8:** Arcade 8-Bit, Pastel Cloud, Forest Night, Bold Esports, Vaporwave Sunset.
- [ ] **T6.6 Review feedback from 5 streamers** before starting v2 (see PRD).
