# Overlune: Product Requirements (v1)

## Value proposition
Free, good-looking, matching stream overlays that a brand-new streamer can set up in OBS on their own, with no account, no payment and no design skills.

## User pain
- Custom overlay packs cost $20–100+.
- "Free" tools lock the good parts behind subscriptions, or look generic.
- Setup is where beginners give up: Browser Sources, sizes, black boxes, silent alerts and blank chat boxes.
- Mixing free widgets from different places gives a stream that doesn't look like one brand.

## Ideal customer profile (ICP)
- New Twitch streamer, 0–6 months in, usually not yet Affiliate.
- Uses OBS Studio or Streamlabs Desktop on a mid- or low-end PC.
- Cares how their stream looks, but has no design skills and no budget.
- Doesn't know what a "Browser Source" is.

Secondary: small streamers who want a quick refresh without paying for a pack.

## Competition and our edge
The free alternatives are StreamElements and Streamlabs themes, OWN3D freebies and Canva templates. Our edge:
1. Taste and cohesion: every surface matches, and one click changes the whole look.
2. Setup that feels like one click, written for beginners.
3. No account needed and open source.
4. Built live on stream by a streamer who uses it.

## Core flows
1. **Pick a look:** open the editor (first-time visitors arrive on the landing page at `/` and go on to `/editor`), browse themes in a full-stream preview, pick one.
2. **Personalize:** enter channel name, title, socials and countdown end time. Optionally paste a logo image URL and use "Advanced" color and font settings.
3. **Set up OBS:** each overlay shows "Link to paste into OBS" with a copy button and its width and height. A step-by-step guide covers OBS and Streamlabs.
4. **Go live:** scenes, chat and alerts work on stream.
5. **Come back later:** paste an old link into "Load my overlay from a link" to edit it. The UI tells users: "Your link is your save file. Bookmark it."

## v1 scope
1. **Themes:** 3 at launch (Clean Slate, Neon Grid, Cozy Café), with 5 more right after launch. See `docs/DESIGN.md`. One theme choice restyles everything. Advanced overrides are tucked away.
2. **Scenes:** Starting Soon, BRB, Stream Ending and Offline, each 1920×1080 (Offline since T6.147).
   - Editable title, subtitle and socials row.
   - Starting Soon counts down to a **fixed end time** stored in the URL, so the countdown survives OBS reloads. The timezone is shown, and the start day is named when it isn't today.
   - Optionally the countdown **repeats** (every day, or on chosen weekdays at a set time), so one link always counts to the next stream and never needs re-pasting. Fixed stays the default. After the start time it shows the done text for 2 hours, then counts to the next stream.
3. **Chat skin** (Twitch, no login):
   - Username colors, Twitch emotes and theme-styled role badges (broadcaster, mod, VIP, sub).
   - Hides bots and `!commands`, removes deleted messages and bans, wraps long messages.
   - Size and font can be adjusted.
4. **Alerts** fired by real events over the same chat connection: raid, sub, resub, gift sub and bits.
   - Simple queue, sound, `{user}` and `{amount}` text variables, and a test button per type.
   - Follows and donations are labeled "coming soon".
5. **Editor:**
   - Live preview.
   - Copy link with size shown next to it.
   - "Load from link".
   - Local autosave in the browser.
6. **Setup guide:**
   - Where to find Browser Source.
   - Sizes to enter.
   - How to fix a black box and a blank chat.
   - "Control audio via OBS", so alert sounds are heard.
7. **Error states** in every overlay, e.g. "Can't connect to chat: check channel name".
8. **Safe link format:** versioned, compressed and validated, and it never breaks old links.

## Out of scope for v1 (what we won't build)
- Backend, database, user accounts, payments, AI features
- Twitch login / EventSub, follow alerts, donation alerts
- TTS, now-playing, webcam cutout, goal bars, latest-follower labels
- YouTube and Kick chat
- Community gallery, theme marketplace, logo-to-palette extraction
- Mobile editor, Tauri desktop app
- File uploads (logos are pasted as image URLs)

## After 1.0, still no backend (approved 2026-10-06)
The owner moved these into scope for v1.x (T6.86). They keep v1's rules: a static site, no accounts, old links never break.
- OBS scene collection file: one import makes every scene with its link and size. OBS only; Streamlabs keeps the guide.
- Webcam frame: a new overlay, a themed border with a clear middle. (A webcam *cutout* stays out of scope.)
- Twitch panels and an offline banner in each look, downloaded as PNG.
- A light look.
- Link previews for each page when it's shared.

## v2 order (only after 5+ real streamers use v1 live)
1. Follow alerts via Twitch OAuth or a StreamElements/Streamer.bot bridge. Tokens never go in URLs. Activates CLAUDE.md sections 4, 5 and 8 as needed.
2. ~~OBS scene-collection import file~~ and 3. ~~static exports (panels, offline banner)~~: moved to v1.x above (2026-10-06). A profile banner can follow the panels.
4. Remaining polish: logo-to-palette, theme import/export, community gallery with artist credits.
5. YouTube and Kick chat.

The realistic plan beyond this list (v1.x goals, v2 phases on Cloudflare, open decisions): `docs/FUTURE-SCOPE.md`.

## Canvas editor (approved 2026-10-13, `docs/TASKS.md` Phase 9)
Streamers asked for freedom, as in StreamElements' overlay editor, without losing what makes Overlune easy.
- **Looks stay the start.** A beginner picks a look and is done, as today.
- **Customize is the freedom.** It opens a canvas where every part of a scene (title, subtitle, countdown, socials, logo, ticker) and anything added (text, images, shapes) can be moved, resized, rotated, layered, hidden, locked or removed, with snapping guides, a layers panel, an inspector and undo.
- **One source if you want it.** An optional Live overlay places chat, alerts, the webcam frame and labels freely in one browser source.
- **Still no account.** A layout lives in the link like every other setting; saved overlays (Phase 12) add a short link and live edits later.
- **Every old link looks the same.** Only links that were customized carry a layout.
- **Out of scope:** custom code (a streamer's own HTML, CSS or JavaScript), video, uploaded files (images are https links until Phase 12+ uploads), and per-element animation editors.
- **Done when:** a streamer can rebuild any scene by hand, by mouse or keyboard, every old link renders as before, and 2.0.0 is released.

## Vertical overlays (approved 2026-10-13, `docs/TASKS.md` Phase 10, built on the canvas editor)
Streamers increasingly go live in portrait: TikTok Live, YouTube Shorts and OBS's vertical canvases (OBS 32.1+, or the Aitum Vertical plugin). Every look gets portrait versions of its scenes (Live, Just Chatting and Reaction included), and alerts, chat and the webcam frame work on a tall canvas. Built on the canvas editor: portrait is its own layout in the same save, so either can be customized without touching the other.
- **One save, two canvases.** A vertical link is the same save after the `#` plus `?canvas=vertical` before it. No existing link changes, and no account is needed.
- **Made for the phone screen.** Text stays out of the places where TikTok and Shorts draw their own buttons and captions (DESIGN.md "Vertical layout").
- **Rolled out in batches** of four, each batch checked in OBS on a vertical canvas; the editor offers Vertical only for looks that have it until all sixteen do.
- **Two new scenes (owner, 2026-10-14):** Just Chatting (a large camera with a header and a "Talking about" line) and Reaction (a camera beside the video being reacted to, with chat), in every look, landscape and vertical.
- **Done when:** every look's scenes, alerts, chat and frame pass the OBS test on a vertical canvas, the safe zone is checked on a phone in a private live test, every old link renders as before, and 2.1.0 is released.

## v2 Phase 1: accounts on Cloudflare (approved 2026-10-09)
The v2 gate (5 real streamers, T6.6) is met, and the owner approved starting v2 on Cloudflare (`docs/STACK.md` "Backend"). Phase 1 is the foundation the later phases build on; it adds no overlay features yet.
- **Optional "Sign in with Twitch".** The editor, every overlay and every old link keep working signed out.
- **A profile:** Twitch ID, login, display name and avatar link. Nothing else is stored.
- **Your data, yours:** see what's stored, sign out everywhere, delete the account.
- **Safety from day one:** every rule in CLAUDE.md §4, §5 and §8 (access control in one data layer, access tests in CI, rate limits, sessions), backups with a real test restore, and a rewritten privacy policy and terms (minimum age 13).
- **Cost:** Cloudflare's free plan. Moving to Workers Paid needs the owner's OK.
- **Done when:** a streamer can sign in and out on production; user A can't read, change or delete user B's data through any route (tested in CI); a test restore from the off-site backup worked.

Later phases (saved overlays with live edits, follow alerts, logo upload) each move into this PRD when they start.

## Success metrics
We measure these without tracking users:
- **First overlay live in OBS without help.** Measured by watching 5 newcomers set it up (T5.7). We note how long it takes, but don't promise a time (the owner dropped the "under 10 minutes" claim as unrealistic, 2026-10-02).
- **5 real streamers using it live** within 2 weeks of launch. The builder is streamer #1 from week 1.
- **Zero broken old links.** Enforced by the old-link tests in CI.
- **Overlay performance:** each overlay under 5% CPU in OBS on a mid-range PC (checked per `docs/OBS-TESTING.md`).
- **Qualitative:** GitHub stars, issues and feedback, and "my chat is blank" support requests going down over time.
