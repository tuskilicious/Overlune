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
  - *On hold (2026-10-01): the owner wants the site more approachable and better looking first (T6.15–T6.25 and T6.13).*

## Post-launch
- [x] **T6.1 Arcade 8-Bit theme.**
  - *Passed in OBS (2026-10-01) on the PR #34 preview. `src/themes/arcade-8bit.ts`: CRT scanlines over the scene with a slow rolling band (`bgEffect: "scanlines"`, transform-only roll), `steps` entrance for scenes, chat and alerts, square boxes with a yellow border and hard pink pixel shadow, Press Start 2P / VT323 (VT323 gets `size-adjust: 130%` so it reads at the same size as other fonts), Kenney Digital Audio `powerUp1` (CC0) as `arcade-8bit.ogg`. Fake bold turned off app-wide (`font-synthesis-weight: none`) since both pixel fonts ship one weight. Fixture `v1/arcade-8bit.json`.*
- [x] **T6.2 Pastel Cloud theme.**
  - *Passed in OBS (2026-10-01) on the PR #36 preview. `src/themes/pastel-cloud.ts`: diagonal gradient from `bg` into a pale tint of `primary` with two drifting clouds (`bgEffect: "clouds"`, transform-only), reuses the `bounce` entrance and alert, radius 24, soft lavender shadow, Baloo 2 / Quicksand, Kenney Interface `pluck_002` (CC0) as `pastel-cloud.ogg`. Colors darkened from the suggested pastels to pass AA. Fixture `v1/pastel-cloud.json`.*
- [x] **T6.3 Forest Night theme.**
  - *Passed in OBS (2026-10-01) on the PR #37 preview. `src/themes/forest-night.ts`: moonlight glow in the top corner (a tint of `primary`) and two layers of drifting, blinking fireflies in the `accent` color (`bgEffect: "fireflies"`, transform/opacity only), `slide-fade` entrance and alerts, radius 12, faint green glow, Lora / Nunito Sans, Kenney Interface `bong_001` (CC0) as `forest-night.ogg`. Fixture `v1/forest-night.json`.*
- [x] **T6.4 Bold Esports theme.**
  - *Passed in OBS (2026-10-01) on the PR #38 preview. `src/themes/bold-esports.ts`: new `wipe` entrance and alert. Content wipes in left to right in 250ms, and the socials bar, chat messages and alert box are static parallelograms (clip-path), so the shape stays under reduced motion. Shared `box-wipe` keyframes in `index.css`. Plain background (DESIGN.md lists no effect), Anton / Barlow, Kenney Digital Audio `zapThreeToneUp` (CC0) as `bold-esports.ogg`. Fixture `v1/bold-esports.json`.*
- [x] **T6.5 Vaporwave Sunset theme.**
  - *Passed in OBS (2026-10-01) on the PR #39 preview. `src/themes/vaporwave-sunset.ts`: static `sunset` background (purple sky fading to coral and orange at the horizon, striped sun via `mask-image`, palm silhouettes from `public/images/themes/vaporwave-palms.svg`), chrome titles (`background-clip: text` with a band of `primary`), a soft dark text shadow so scene text stays readable over the sun, `slide-fade` entrance and alerts, Audiowide / Space Grotesk, Kenney Digital Audio `threeTone1` (CC0) as `vaporwave-sunset.ogg`. Fixture `v1/vaporwave-sunset.json`; e2e checks that the palms image loads.*
- [ ] **T6.6 Review feedback from 5 streamers** before starting v2 (see PRD).

### From the new-streamer walkthrough (2026-10-01)
v1 fixes from watching someone set Overlune up as a brand-new streamer. These are not v2 features. One branch and PR per task.

- [x] **T6.7 Countdown shows the right day.** A countdown more than a day away shows "37:59:55" and "Starts at 11:30 PM GMT+5:30", which viewers read as tonight.
  - Accept: if the end time isn't today in the streamer's time zone, the label names the day: "Starts tomorrow, 11:30 PM GMT+5:30", or "Starts Fri 3 Oct, 11:30 PM GMT+5:30" from 2 days out. The zone stays shown (PRD).
  - Accept: 24 hours or more shows "1d 13h 59m". Under 24 hours keeps HH:MM:SS (and MM:SS under an hour).
  - Accept: unit tests in `tests/unit/lib/time.test.ts` cover today, tomorrow, 2+ days, just before and after midnight in the streamer's zone, and a DST change day. No link change.
  - Accept: OBS check of Starting Soon with an end time 2 days away.
  - *Passed in OBS (2026-10-01) on the PR #41 preview. `formatCountdown` shows "1d 13h 59m" from 24 hours, and the new `formatStartsAt` (`src/lib/time.ts`) names the day in the streamer's zone. The overlay derives "now" from the countdown, so there's no clock read during render. Editor e2e countdown check made safe in the hour before UTC midnight.*
- [x] **T6.8 Repeating countdown.** A new countdown time means pasting a new Starting Soon link into OBS each time, which breaks "paste once, never touch it again".
  - Accept: new optional link field `starting.repeat` (default off, so old links behave exactly as before): off, "Every day" or "On these days" (weekdays plus a time), using the existing `starting.tz`. The overlay counts down to the next matching time, and DST changes keep the wall-clock time.
  - Accept: after the start time, the overlay shows the done text for 2 hours, then counts to the next stream. *(Rule confirmed by the owner.)*
  - Accept: editor copy for beginners: "Repeat this countdown every stream", plus one line saying a repeating countdown means you never re-paste the link.
  - Accept: fixture `tests/fixtures/links/v1/countdown-repeat.json`; the old-link test still passes for every existing fixture. Unit tests for the next-time logic (today vs. next week, chosen days, DST).
  - Accept: PRD v1 scope line updated (fixed end time stays the default, repeating is an addition). Tested in OBS per `docs/OBS-TESTING.md`.
  - *Passed in OBS (2026-10-01) on the PR #42 preview. Link field `starting.repeat` (`off` / `daily` / `days`, weekdays 0 = Sun, `time` "HH:MM"), default off. `nextRepeatStart` (`src/lib/time.ts`) checks yesterday through a week ahead and keeps a start for 2 hours (`LIVE_WINDOW_MS`). The overlay ticks a per-second clock. Editor: repeat select, weekday checkboxes, "Stream starts at". Fixture `v1/countdown-repeat.json`.*
- [x] **T6.9 Test alerts link is hard to forget.** Beginners paste the test link, forget to switch back, and go live with fake alerts.
  - Accept: in test mode the overlay shows a small, clear label: "Test mode: switch back to your normal Alerts link before going live." It shows on stream on purpose. Its reduced-motion version is static.
  - Accept: new test links carry an expiry (`?test=1&until=<unix seconds>`, stamped 15 minutes ahead when the link is copied). After that time the samples stop, but the label stays. Old `?test=1` links with no `until` keep working exactly as before. `docs/STACK.md` documents the new flag.
  - Accept: unit or e2e tests cover old `?test=1`, a new link before expiry and a new link after expiry. Tested in OBS with "Control audio via OBS".
  - *Passed in OBS (2026-10-01) on the PR #43 preview. `Alerts.tsx` shows `.alerts-test-label` on any `?test=1` link (it pulses; the reduced-motion version is still) and plays samples only without `until` or before it; a value that isn't a number counts as expired. The editor (`AlertTester.tsx`) stamps `until` 15 minutes ahead and restamps every minute. Flag documented in STACK.md.*
- [x] **T6.10 Preview visible in narrow editor windows.** Below 800px wide the preview sits about 2,500px under the controls, so changes can't be seen while typing (the editor is often squeezed next to OBS).
  - Accept: at 800px and narrower, a "Show preview" bar is pinned to the bottom of the window and expands the preview. It works from the keyboard and has a visible focus ring. Wider layouts are unchanged.
  - Accept: narrow desktop windows only, no mobile editor features (PRD out of scope). axe stays clean at 600px and at full width, and the focus order makes sense. e2e test for the toggle.
  - *Done 2026-10-01. At 800px and narrower the scene preview (`.editor-scene-preview`) docks to the bottom behind a "Show preview" / "Hide preview" button (`aria-expanded`, `aria-controls`). The page keeps room for the dock and `scroll-padding-bottom` keeps focused fields visible above it. The bar comes last in Tab order, matching where it sits on screen. Chat and alert previews stay in place. Editor only, so no OBS test. e2e: the bar at 600px (axe clean, closed and open), keyboard Enter/Space, no bar at 1280px.*
- [x] **T6.11 Simpler time zone picker.** The full time zone list is very long.
  - Accept: the editor shows the detected zone as text ("Your time zone: India Standard Time (Asia/Calcutta)") with a "Change" button that reveals the existing select. Keyboard accessible, visible focus, focus moves to the select on "Change". axe clean. e2e test.
  - *Done 2026-10-01. `zoneName` (`src/lib/time.ts`) gives the browser's plain-language name (`longGeneric`). The "Change" button (accessible name "Change time zone") reveals the select and focuses it. The select then stays open, because a closed select changes on every arrow key. Editor only, so no OBS test. e2e: text first, keyboard Change moves focus, new zone shown, axe clean; four countdown tests now pick the zone through "Change".*
- [x] **T6.12 Lighter "save file" box.** "Your link is your save file" is the first thing on the page, before anything has been made.
  - Accept: layout proposed to and approved by the owner before changing it.
  - Accept: the PRD message stays, in a compact form. "Load my overlay from a link" and "Start over" move into a smaller row, and the bookmark reminder gets more weight after the first edit. axe clean, e2e still pass.
  - *Done 2026-10-01 (layout approved by the owner). Fresh editor: one line, "Your link is your save file. No accounts needed." plus a "Load my overlay from a link" button that reveals the paste field (`aria-expanded`, focus moves to it; the field is now labeled "Paste a link from Overlune"). Once anything differs from a fresh editor (including autosave or a loaded link), "Bookmark this page to keep your overlay." leads with an accent bar, and "Start over" appears. After starting over, focus moves to the Load button. Editor only, so no OBS test. e2e for both states, the keyboard reveal and axe; existing load and start-over tests updated.*
- [ ] **T6.13 Privacy and terms as site pages.** Footer links go to markdown on GitHub, which looks unfinished to non-developers.
  - Accept: `/privacy` and `/terms` pages in the editor's style, built from `docs/legal/*.md` (one source of truth). Footer links point to them. No `innerHTML` or `dangerouslySetInnerHTML`.
  - Accept: any new dependency (such as a markdown renderer) is approved by the owner first. CSP in `public/_headers` unchanged and checked on the preview. axe clean on both pages, and no `public/` folder shadows the routes.
- [x] **T6.14 Brand kit.** The owner's new logo replaces the old one, and the site uses Overlune's own colors and fonts.
  - Accept: new logo in the editor header, favicon set, Apple touch icon, link-preview (Open Graph) image and `theme-color` in `index.html`. Editor and guide chrome use the brand tokens (`src/editor/brand.ts`, `docs/BRAND.md`), still WCAG AA (contrast unit test). Assets recorded in `docs/ASSETS.md`. CSP unchanged.
  - Accept: `npm test` and `npm run test:e2e` pass, axe stays clean on the editor and guide, and the link preview shows on the deployed preview.
  - *Done 2026-10-01. Tests pass (263 unit, 93 e2e, axe clean). Owner checked the editor, guide and link preview on the deployed preview.*

### From the look-and-feel walkthrough (2026-10-01)
Found by going through the live site at 1366×768 as a brand-new streamer. These make v1 more approachable before T5.7; they are not v2 features. One branch and PR per task. Tasks that change the layout get a proposal approved by the owner first (as in T6.12). Every task keeps axe clean, e2e passing and old links working.

- [x] **T6.15 Guide heading overlaps its intro.** On `/guide`, "Set up your overlays in OBS" is drawn on top of "About 5 minutes…", because `.editor-header h1` had `line-height: 0` (meant for the editor's logo image).
  - Accept: the logo image is `display: block` and the h1 keeps its normal line height. The editor header looks the same. e2e check that the guide heading doesn't overlap the line under it.
  - *Done 2026-10-01. `line-height: 0` replaced by `.editor-header h1 img { display: block }` in `editor.css`. New e2e check in `guide.spec.ts` (fails on the old CSS). Editor and guide only, so no OBS test.*
- [x] **T6.16 A welcome for first-time visitors.** The page opens on a small tagline and a "Load my overlay from a link" box, so a newcomer isn't shown what they'll get.
  - Accept: a short welcome above the editor shows what Overlune makes (a real overlay preview, not a stock image) and what to do first, in beginner words. It gets out of the way once the streamer starts editing or comes back with a saved overlay. No unsupported claims. Layout approved first.
  - *Owner chose option B on 2026-10-01: the welcome is a "Pick a look to start" gallery, and T6.17 is folded in. Built on `feat/look-gallery`: a first visit shows 8 picture cards (each theme's real Starting Soon scene, held still) instead of the editor; picking one opens the editor on that look with focus on its radio. Saved or loaded work skips the gallery, decided once per visit so resetting settings never hides the editor. The editor's "Pick a look" is now picture cards too. "Load my overlay from a link" stays above the gallery. Tests pass (263 unit, 99 e2e, axe clean on the gallery). Owner checked the PR #48 preview (first visit, picker cards at laptop and narrow widths). Editor only, so no OBS test.*
- [x] **T6.17 Theme picker shows the overlays.** *Folded into T6.16.* Themes are radio buttons with small colour swatches, and the default (Clean Slate) is the plainest look.
  - Accept: each theme is a picture card of its Starting Soon scene (CSS-rendered or a static image recorded in ASSETS.md), still a radio group that works from the keyboard. Owner decides whether the default theme changes; a new default must not change what old links show.
- [ ] **T6.18 Editor in clear steps.** Everything is open in one long form (about 3,000px tall at 1366×768).
  - Accept: the controls are grouped into steps a beginner can follow, such as 1. Pick a look, 2. Add your details, 3. Copy your links to OBS. Each step is reachable from the keyboard, and "Skip to your OBS links" still works. No settings are removed. Layout approved first.
- [ ] **T6.19 Alert messages without template code.** `{user}`, `{amount}` and `{s}` look like programming.
  - Accept: beginners can edit alert messages without typing codes (for example, insert buttons labelled "Their name" and "Amount", with a live example line below the field). Links keep the same stored format, so old links are unchanged. Unit or e2e test.
- [ ] **T6.20 Tuck away rarely used settings.** The bot list, chat box size and the disabled "Follow / Donation (coming soon)" buttons are always visible.
  - Accept: these move behind "More chat options" / "More alert options" style toggles (closed by default, `aria-expanded`), and the "coming soon" buttons become one line of text. Settings still save and load as before.
- [ ] **T6.21 Clearer logo help.** The logo field asks for an https:// image link, which most beginners don't have.
  - Accept: help text explains in plain words where to get a link (for example, right-click an image you already use online and copy its address), and a bad link shows a friendly message. Still `https:` only (CLAUDE.md §6). No uploads (out of scope for v1).
- [ ] **T6.22 Fuller previews.** The chat preview has empty space above its messages, and the alerts preview is empty until a test button is pressed.
  - Accept: the chat preview is filled or sized to its messages, and the alerts preview shows a resting sample (or a clear "Press a test button" message) instead of an empty box. Reduced-motion versions stay.
- [ ] **T6.23 Tidier OBS links.** Each link shows a long raw URL (`…#1.N4IgLgFg…`) that looks broken.
  - Accept: the Copy button and the width and height lead. The raw link is shortened or hidden but still selectable for people who want it, and copying still gives the full link. e2e copy tests still pass.
- [ ] **T6.24 A "you're set" moment.** After copying links there is no sign of what's done or left.
  - Accept: copied links are marked (for example, "Copied ✓" stays next to each one for the session), with a short next step pointing to the setup guide. No tracking or storage beyond the existing autosave.
- [ ] **T6.25 Brand header on the guide.** `/guide` has no logo and is dense text.
  - Accept: the guide shows the Overlune logo linking back to the editor, and its steps are easier to scan (for example, numbered step cards). The existing OBS screenshots stay. axe clean.
