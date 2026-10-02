# Overlune: Product Requirements (v1)

## Value proposition
Free, good-looking, matching stream overlays that a brand-new streamer can set up in OBS in **under 10 minutes**, with no account, no payment and no design skills.

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
2. **Scenes:** Starting Soon, BRB and Stream Ending, each 1920×1080.
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
- OBS scene-collection import file, static exports (panels, banners)
- Mobile editor, Tauri desktop app
- File uploads (logos are pasted as image URLs)

## v2 order (only after 5+ real streamers use v1 live)
1. Follow alerts via Twitch OAuth or a StreamElements/Streamer.bot bridge. Tokens never go in URLs. Activates CLAUDE.md sections 4, 5 and 8 as needed.
2. OBS scene-collection import file.
3. Static exports from the theme: Twitch panels, offline banner, profile banner.
4. Remaining polish: logo-to-palette, theme import/export, community gallery with artist credits.
5. YouTube and Kick chat.

## Success metrics
We measure these without tracking users:
- **Time to first overlay live in OBS: under 10 minutes.** Measured by watching 5 newcomers set it up without help.
- **5 real streamers using it live** within 2 weeks of launch. The builder is streamer #1 from week 1.
- **Zero broken old links.** Enforced by the old-link tests in CI.
- **Overlay performance:** each overlay under 5% CPU in OBS on a mid-range PC (checked per `docs/OBS-TESTING.md`).
- **Qualitative:** GitHub stars, issues and feedback, and "my chat is blank" support requests going down over time.
