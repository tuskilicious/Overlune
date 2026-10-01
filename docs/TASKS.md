# Overlune: Tasks

Work one task at a time, top to bottom. A task is done when its acceptance criteria pass, lint, typecheck and tests pass, and overlay tasks have passed `docs/OBS-TESTING.md`. Tick the box when done.

## Phase 0: Repo foundation
- [x] **T0.1 Choose license.** MIT is recommended. Add `LICENSE`. *Needs owner decision.*
- [x] **T0.2 Git init.** `.gitignore` is already present. Make the first commit with the docs only.
- [x] **T0.3 Scaffold** Vite + React + TS (strict) per `docs/STACK.md`. *Files written by hand. Run `npm install`, then pin the exact installed versions in `package.json` and commit the lockfile.*
  - Accept: `npm run dev` shows a placeholder editor page and `/o/starting` shows a placeholder overlay.
- [x] **T0.4 Scripts:** `lint`, `typecheck`, `test`, `test:e2e`, `build`, with ESLint and Prettier configured.
  - Accept: all scripts pass on a clean checkout.
- [x] **T0.5 Secret scanning:** husky pre-commit running gitleaks and lint-staged. Document installing gitleaks in the README.
  - Accept: committing a fake token is blocked.
- [x] **T0.6 CI:** `.github/workflows/ci.yml` runs lint, typecheck, test, build, gitleaks and `npm audit --audit-level=high`. Add `dependabot.yml`.
  - Accept: CI is green on a PR.
  - *Green on PR #1. Dependabot activates once this is merged to `main`.*
- [x] **T0.7 Deploy:** Cloudflare Pages with production on `main` and previews on PRs. Add `public/_headers` (CSP, HSTS, etc.). The SPA fallback is built into Pages, so no `_redirects`. Set `VITE_SENTRY_DSN` and `VITE_SENTRY_ENVIRONMENT` (`staging` for previews, `production` for `main`) per `docs/SENTRY.md` step 5.
  - Accept: headers are verified on the preview URL with `curl -I`.
  - *Verified on PR #8 preview: all headers on `/` and `/o/starting`, no CSP errors, staging Sentry event received. Production: overlune.pages.dev (headers live once PR #8 merges).*
- [x] **T0.8 Sentry:** separate staging and production environments, `sendDefaultPii: false`, and a `beforeSend` that strips URL fragments.
  - *Verified 2026-09-30: test event reached Sentry (EU, `development`) with no settings fragment. Cloudflare env vars moved to T0.7 (no Pages project yet).*
  - Accept: a test error appears in Sentry without the settings fragment.
- [x] **T0.9 Owner setup:** turn on 2FA for GitHub, Cloudflare and Sentry, and enable GitHub secret scanning with push protection. *Owner does this.*
  - *Done 2026-09-30: 2FA on GitHub, Cloudflare and Sentry. Secret scanning + push protection confirmed on the repo.*

## Phase 1: Week 1, one scene working in OBS
- [x] **T1.1 Theme types + Clean Slate theme** per `docs/DESIGN.md`. Self-host fonts and record them in `docs/ASSETS.md`.
  - *Contrast test covers every theme. Token→CSS variable helper deferred to T1.3 (first consumer).*
- [x] **T1.2 Settings v1 schema** (zod) and URL encode/decode (`#1.<lz-string>`).
  - *Every link carries the full settings. Invalid fields fall back one by one and set `ok: false`. `migrations.ts` comes with v2.*
  - Accept: unit tests cover a round trip, invalid input falling back to defaults, a `javascript:` logo URL being rejected, and very long text being truncated.
- [x] **T1.3 Starting Soon overlay:** title, subtitle, socials row, and a countdown to a fixed end time with the timezone shown. At zero it shows a custom message.
  - *Passed in OBS 32 (2026-09-30). Streamlabs check left for T1.6. Socials are text only; icons need licensed art (T2).*
  - Accept: reloading the page does not reset the countdown, and a unit test covers the time math.
- [x] **T1.4 Overlay error state component,** shown for invalid settings.
  - *Passed in OBS 32 (2026-09-30). `SceneFrame` takes an `error` slot; chat can reuse `OverlayError` with its own message.*
- [x] **T1.5 Reduced motion:** the `?rm=1` flag and `prefers-reduced-motion` both disable animations.
  - *Passed in OBS 32 (2026-09-30). One global CSS rule covers every animation; JS motion helper comes with alerts (T4).*
- [x] **T1.6 Write `docs/OBS-TESTING.md` results for Starting Soon.** Check it in OBS and Streamlabs: transparency, fonts, countdown after a scene switch, and CPU use.
  - *OBS 32 passed, CPU 1.6–2% (2026-09-30). **Streamlabs deferred**: must be done before launch (pre-launch item 9).*
- [x] **T1.7 Playwright smoke test** that renders `/o/starting` with a fixture link and compares a screenshot.
  - *Linux-only baseline made in CI (fonts render differently on Windows). Fixture saved as `tests/fixtures/links/v1/starting.json`, so T1.8 only needs the "every saved link still loads" check.*
- [x] **T1.8 Save the first link fixture** to `tests/fixtures/links/v1/`.
  - *Fixture added in T1.7. `tests/unit/settings/old-links.test.ts` checks every saved link in `tests/fixtures/links/` still decodes with `ok: true`.*

## Phase 2: Scenes + editor
- [x] **T2.1 BRB and Stream Ending overlays,** reusing the shared scene frame.
  - *Passed in OBS 32 (2026-09-30). One shared `TextScene` serves `/o/brb` and `/o/ending`; split into folders if either scene gets its own features. No new screenshot baselines (shared frame already covered by T1.7).*
- [x] **T2.2 Editor shell:** theme picker with a full-stream preview and text fields for each overlay.
  - *Also covers countdown end time + time zone, socials and logo link (no other task had them). Preview uses `SceneFrame` directly, so no countdown yet; T2.3 splits the scenes into route + view and shows the real overlay. Editor tests are Playwright (`tests/e2e/editor.spec.ts`), so Testing Library/jsdom were not added.*
- [x] **T2.3 Live preview** that renders the overlay components directly (same code as OBS).
  - *Passed in OBS 32 (2026-09-30). `FromLink` reads the link for overlay routes; `StartingSoon`/`TextScene` take `settings` as props, so the editor preview renders them directly, countdown included.*
- [x] **T2.4 "Link to paste into OBS" panel:** copy button and width × height shown for each overlay.
  - *`src/editor/ObsLinks.tsx`. Sizes live in its `overlays` table, so chat and alerts add a row there. If copying is blocked, the link is selected and "Press Ctrl+C to copy" shows. No `?rm=1` toggle; the setup guide (T5.3) can mention it.*
- [x] **T2.5 "Load my overlay from a link"** and "Your link is your save file" messaging.
  - *The editor's own address also carries the settings (`/#1.…`, same format, updated with `replaceState`), so a bookmark or reload keeps the work. `decodeLink()` accepts overlay links, editor links or a bare `#1.…`.*
- [x] **T2.6 Local autosave** (localStorage, wrapped in try/catch). The editor still works without it.
  - *`src/settings/storage.ts` stores the link format, so autosaves get the same validation and migrations. Start order: link in the address, then autosave, then defaults. Added a two-step "Start over" (focus lands on Cancel).*
- [x] **T2.7 Advanced section** for color and font overrides, collapsed by default.
  - *Passed in OBS 32 (2026-09-30). New v1 field `advanced` with defaults (old links unchanged; fixture `v1/advanced.json`). Colors are `#rrggbb` only; fonts from the bundled list (Inter, Orbitron, Rajdhani, Fredoka, Nunito, recorded in ASSETS.md, ready for T5.1/T5.2). Editor warns when overrides drop text below AA contrast.*
- [x] **T2.8 Accessibility pass on the editor:** keyboard navigation, focus rings, labels, AA contrast.
  - *axe (WCAG 2.1 A/AA) runs in CI with no violations. Fixed: control borders 1.2:1 → 5.2:1, placeholder contrast, focus lost when Remove/Reset/Start over buttons disappear, duplicate h1 (preview is now `inert` + `aria-hidden`), added a skip link. Known limit: Chrome's built-in calendar button in the date field shows no focus ring and can't be styled.*

## Phase 3: Chat skin
- [x] **T3.1 IRC parser** (`src/twitch/parse.ts`) that turns raw IRC lines into typed events.
  - Accept: unit tests with real sample lines for PRIVMSG, USERNOTICE (sub, resub, subgift, raid), bits, CLEARMSG, CLEARCHAT and PING.
  - *Never throws: malformed lines become `unknown`. Name colors must be `#rrggbb` and emote ids `[A-Za-z0-9_]` (both reach CSS/URLs). Emote offsets are code points. Unmapped USERNOTICEs are kept as `kind: "other"` for later.*
- [x] **T3.2 Anonymous connection** (`irc.ts`) with PING/PONG, reconnect with backoff, and a "can't connect / check channel name" state.
  - *`connectChat(channel, { onEvent, onStatus })` returns a stop function. Statuses: `connecting`, `connected` (on ROOMSTATE), `reconnecting`, `error` (4 failures in a row, or no join reply in 10s, which is how Twitch treats a missing channel; it keeps retrying) and `bad-channel` (no socket opened). Backoff 1s→30s with jitter; also reconnects on RECONNECT and after 6 min of silence. Checked live against Twitch. The error screen itself comes with T3.3.*
- [x] **T3.3 Chat overlay:** message list, name colors, emotes rendered as `<img>` elements (no innerHTML), theme-styled role badges, long-message wrapping, and a max message count.
  - *Passed in OBS 32 (2026-09-30). `/o/chat`, 400×600, last 50 messages. New v1 field `chat.channel` (default "", old links unchanged; fixture `v1/chat.json`). Editor has a "Your Twitch channel name" field that accepts a pasted twitch.tv link, plus a Chat row in the OBS links. Name colors are lightened toward the theme text until they read at AA. Editor chat preview with sample messages left for T3.5.*
- [x] **T3.4 Filters:** hide known bots (editable list) and `!commands`, and remove messages on CLEARMSG and CLEARCHAT.
  - *Passed in OBS 32 (2026-09-30). New v1 fields `chat.hideCommands` (default on) and `chat.bots` (default: 12 common bots, max 50; old links get the defaults; fixture `v1/chat-filters.json`). Logic in `src/overlays/chat/filters.ts` (`applyEvent`). Editor: checkbox, one-name-per-line bot box, and "Reset to the usual bots".*
- [x] **T3.5 Chat options:** size, font scale, and optional fade-out.
  - *Passed in OBS 32 (2026-09-30). New v1 fields `chat.width` (250–1920, default 400), `chat.height` (200–1080, default 600), `chat.fontScale` (0.75–2, default 1) and `chat.fadeAfter` (seconds, 0 = never); old links unchanged; fixture `v1/chat-options.json`. Chat sizes are in em so text size scales everything. Fade: CSS fade plus a 1s timer that removes messages (works with reduced motion). Editor: size fields, text size, "Hide messages after", the Chat link row shows the chosen size, and a chat preview with sample messages.*
- [x] **T3.6 OBS test + Playwright test** using a mocked IRC feed.
  - *`tests/e2e/chat.spec.ts` fakes Twitch with `page.routeWebSocket` (no network): anonymous login, rendering, HTML safety, PING/PONG, filters and moderation, both error states, reconnect, fade with `?rm=1`, saved chat links. OBS sign-off passed on the PR #24 preview deploy with real headers (2026-10-01): CPU ~2%, stable after 10 min. Streamlabs deferred to pre-launch (checklist item 9).*

## Phase 4: Alerts
- [x] **T4.1 Alert event mapping** from parsed events: raid, sub, resub, gift sub, bits.
  - *`createAlertMapper()` in `src/alerts/events.ts` → `{ kind, user, amount, message }`. A gift bomb (`submysterygift`, new parser kind `giftbomb` with `giftCount`/`giftId`) is one alert with the total; its individual gifts are skipped. Anonymous gifters show as "Anonymous". Sub tier left out until a template needs it.*
- [x] **T4.2 Alert queue:** one at a time, bursts are handled, and there is a maximum queue length.
  - Accept: unit test with 20 events arriving at once.
  - *`createAlertQueue(onChange)` in `src/alerts/queue.ts`: 5 s per alert, 0.5 s gap, first come first served, at most 30 waiting (extras dropped and counted), `stop()` for unmount. Used by the `/o/alerts` overlay from T4.3.*
- [x] **T4.3 Alert templates** with `{user}` and `{amount}` variables. Values are escaped.
  - *Passed in OBS 32 (2026-10-01). `fillTemplate` in `src/alerts/templates.ts` (also `{s}` for plurals); everything renders as React text. New v1 field `alerts.templates` (defaults; fixture `v1/alerts.json`). Built the `/o/alerts` overlay (1920×1080, box centered top, uses the Chat channel), editor fields and an Alerts link row. New public link flag `?test=1` plays one sample of each alert (documented in STACK.md); the editor will offer it in T4.5.*
- [x] **T4.4 Sound playback,** with a volume setting and licensed default sounds recorded in `ASSETS.md`.
  - *Passed in OBS 32 (2026-10-01). `playSound` in `src/alerts/sound.ts` (an `<audio>` element, never throws). Clean Slate plays Kenney Interface Sounds `confirmation_002` (CC0) as `public/sounds/clean-slate.ogg`. New v1 field `alerts.volume` (0–100, default 70; fixture `v1/alerts-volume.json`) with an editor slider. Custom sounds were asked for and skipped for now: an upload needs a backend (v2), and an https sound link would need the CSP `media-src` widened.*
- [x] **T4.5 Test buttons in the editor** that trigger alerts in the preview. Follows and donations are shown as "coming soon".
  - *Passed in OBS 32 (2026-10-01). New "Preview: Alerts" section (`src/editor/AlertTester.tsx`): five test buttons play samples through the real queue with sound, disabled Follow/Donation "coming soon" buttons, and a "Link to test your alerts in OBS" (`?test=1`) kept apart from the main links with a switch-back warning. `Preview` moved to `src/editor/Preview.tsx`; fixed the alerts preview not being scaled.*
- [x] **T4.6 OBS test,** including "Control audio via OBS".
  - *Passed on the PR #29 preview deploy with real headers (2026-10-01): alerts, sound in the Audio Mixer, reload behavior, 10 min stable, CPU ~2%. Automated coverage: `tests/e2e/alerts.spec.ts` and the editor alert tests. Streamlabs deferred to pre-launch (checklist item 9).*

## Phase 5: Launch
- [x] **T5.1 Neon Grid theme.**
  - *Passed in OBS 32 (2026-10-01), CPU ~2%. `src/themes/neon-grid.ts`: scrolling perspective grid with a glowing horizon (`bgEffect: "grid"`, transform-only), glitch-in alerts (`alertAnim: "glitch"`), Kenney Sci-Fi `forceField_000` (CC0) as `neon-grid.ogg`. New theme token `shadow` (surface glow; Cozy Café will reuse it for soft shadows). Fixture `v1/neon-grid.json`. Screenshot baseline for the theme left for later (Linux-only baselines).*
- [x] **T5.2 Cozy Café theme.**
  - *Passed in OBS 32 (2026-10-01), CPU ~2%. `src/themes/cozy-cafe.ts`: rising steam wisps (`bgEffect: "steam"`, transform/opacity only), `bounce` entrance for scenes, chat and alerts, soft `shadow`, Kenney Interface `glass_004` (CC0) as `cozy-cafe.ogg`. Accent darkened to `#9C5A2C` (the suggested `#D98E5A` failed AA on the surface). Fixture `v1/cozy-cafe.json`. Screenshot baseline left for later (Linux-only baselines).*
- [x] **T5.3 Setup guide page** for OBS and Streamlabs, with screenshots: Browser Source, sizes, black box fix, blank chat fix, audio.
  - *Done 2026-10-01. `/guide` (`src/editor/SetupGuide.tsx`), linked from "Links to paste into OBS". Sizes table comes from the editor's `overlays` list (e2e checks they match). Four OBS 32 screenshots by the owner in `public/images/guide/` (moved from `public/guide/`, which made `/guide` a 404 on Antideploy) (recorded in ASSETS.md); e2e checks they load. **Left for later:** Streamlabs screenshots (the Streamlabs section is text only).*
- [x] **T5.4 Legal drafts** in `docs/legal/` (privacy policy and terms) plus footer links and a contact email. *Needs review.*
  - *Drafted 2026-10-01: `docs/legal/privacy.md` and `terms.md`, linked (on GitHub) from a footer on the editor and `/guide` with support@overlune.in. Sentry "Prevent Storing of IP Addresses" turned on by the owner, matching the policy. **Update (T5.5):** the owner has no lawyer, so both docs now say they are self-written, not lawyer-reviewed and not legal advice. support@overlune.in confirmed working. Governing law set to India and CLAUDE.md §9 changed to self-reviewed (T5.6).*
- [x] **T5.5 README complete:** what it is, setup, env var names, run, test, deploy.
  - *Done 2026-10-01. Added a "For streamers" section, themes, setup guide, real clone URL, build/preview, CI summary, contributing notes (link contract, adding a theme), full docs list, contact and an as-is/no-warranty note (MIT `LICENSE`). Env table corrected: `VITE_SENTRY_RELEASE` is not set yet, `SENTRY_AUTH_TOKEN` is planned but unused, and the unused `CLOUDFLARE_*` names were removed (also from `.env.example`). Privacy policy now describes all Sentry data: error reports with breadcrumbs, a session ping per page load, and 5% performance samples that can include the logo link.*
- [x] **T5.6 Pre-launch checklist** in CLAUDE.md, all items checked.
  - *Signed off 2026-10-01 after PR #30 brought T2.8–T5.5 to `main`. All 10 items checked in CLAUDE.md; production headers re-verified; `npm audit` clean after the vitest 4.1.11 merge. CLAUDE.md §9 changed to self-reviewed legal docs, governing law India. **Left for later:** the two Streamlabs screenshots in the setup guide (from T5.3).*
- [ ] **T5.7 Launch:** use it live on the owner's stream and hand it to 5 streamers.

## Post-launch
- [x] **T6.1 Arcade 8-Bit theme.**
  - *Passed in OBS (2026-10-01) on the PR #34 preview. `src/themes/arcade-8bit.ts`: CRT scanlines over the scene with a slow rolling band (`bgEffect: "scanlines"`, transform-only roll), `steps` entrance for scenes, chat and alerts, square boxes with a yellow border and hard pink pixel shadow, Press Start 2P / VT323 (VT323 gets `size-adjust: 130%` so it reads at the same size as other fonts), Kenney Digital Audio `powerUp1` (CC0) as `arcade-8bit.ogg`. Fake bold turned off app-wide (`font-synthesis-weight: none`) since both pixel fonts ship one weight. Fixture `v1/arcade-8bit.json`.*
- [x] **T6.2 Pastel Cloud theme.**
  - *Passed in OBS (2026-10-01) on the PR #36 preview. `src/themes/pastel-cloud.ts`: diagonal gradient from `bg` into a pale tint of `primary` with two drifting clouds (`bgEffect: "clouds"`, transform-only), reuses the `bounce` entrance and alert, radius 24, soft lavender shadow, Baloo 2 / Quicksand, Kenney Interface `pluck_002` (CC0) as `pastel-cloud.ogg`. Colors darkened from the suggested pastels to pass AA. Fixture `v1/pastel-cloud.json`.*
- [x] **T6.3 Forest Night theme.**
  - *Passed in OBS (2026-10-01) on the PR #37 preview. `src/themes/forest-night.ts`: moonlight glow in the top corner (a tint of `primary`) and two layers of drifting, blinking fireflies in the `accent` color (`bgEffect: "fireflies"`, transform/opacity only), `slide-fade` entrance and alerts, radius 12, faint green glow, Lora / Nunito Sans, Kenney Interface `bong_001` (CC0) as `forest-night.ogg`. Fixture `v1/forest-night.json`.*
- [ ] **T6.4–T6.5 Themes 7–8:** Bold Esports, Vaporwave Sunset.
- [ ] **T6.6 Review feedback from 5 streamers** before starting v2 (see PRD).
