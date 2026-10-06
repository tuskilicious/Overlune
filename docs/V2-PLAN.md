# Overlune v2: Redesign Plan (draft for owner approval)

Status: **proposal**. Nothing here is approved yet. Once the owner signs off, this plan becomes the new `docs/PRD.md` scope, `docs/STACK.md` changes and `docs/TASKS.md` phases. Until then, CLAUDE.md's v1 rules (no backend, no accounts) still apply.

## What the owner asked for (2026-10-01)
- Keep this repo and stack, and add a backend.
- Serve the site from **overlune.in** (owned; it currently redirects to overlune.pages.dev).
- **Full customization:** drag-and-drop layout, uploads (images, logos, backgrounds, sounds), any color and font, and themes built from a blank canvas.
- **Community:** theme gallery, creator profiles, a help forum / Q&A, and a Discord link.
- **Accounts:** Twitch login.

Note: the PRD gates v2 on "5 real streamers using v1 live" (T5.7, T6.6). This plan moves v2 ahead of that gate, which is the owner's call. Recommendation: still finish T6.12/T6.13 and do T5.7 alongside Phase 0, so real streamer feedback steers the bigger build.

## Principles that don't change
- **Old links never break.** Every `overlune.pages.dev/o/...#1.<payload>` link already in OBS keeps working forever, on both domains.
- **The editor still works with no account.** Login is needed to save to the cloud, upload, publish, like, comment or use follow alerts.
- **Overlays never depend on the backend being up.** If the backend is down, an overlay shows its last known look (see "Saved overlays").
- **No tokens or secrets in overlay URLs.** Overlay IDs are public and safe to show on stream.
- Overlays stay lightweight (<5% CPU in OBS), with reduced-motion versions. Chat text stays hostile input.

## Proposed stack additions (need approval, per STACK.md)
| Area | Recommendation | Why | Alternative |
|---|---|---|---|
| Auth | **Supabase Auth, Twitch provider** | Managed (CLAUDE.md §5), Twitch built in, MFA available | Clerk (managed, but no database/RLS) |
| Database | **Supabase Postgres** | Row-level security is required by CLAUDE.md §4, and Postgres has it natively | Cloudflare D1 (no RLS: every rule would live in app code) |
| Uploads | **Supabase Storage** with per-user folders and storage policies | Same RLS model as the data | Cloudflare R2 |
| Live updates | **Supabase Realtime** | Overlays update the moment a streamer saves, with no re-paste | Polling |
| Server code | Supabase Edge Functions (Twitch EventSub webhooks, upload checks, moderation) | Keeps secrets server-side | Cloudflare Pages Functions |
| Frontend hosting | Cloudflare Pages (unchanged) at **overlune.in** | Already built, headers in place | — |
| Bot protection | Cloudflare Turnstile | CLAUDE.md §8 | hCaptcha |

**Cost warning:** CLAUDE.md requires daily backups with point-in-time recovery, and staging/production separation. On Supabase that means a paid plan for production (the free tier has no backups and pauses inactive projects, which would also stall live overlay updates). Check current pricing before approving. Staging can stay on the free tier.

## Domain move (Phase 0)
1. Add overlune.in (and www) as a **custom domain on the Cloudflare Pages project** instead of a redirect. pages.dev keeps serving the same site, so old links keep working.
2. Editor copies new links as `https://overlune.in/o/...`.
3. Update: CSP and HSTS in `public/_headers`, Sentry allowed URLs, README, setup guide, legal pages, Twitch OAuth redirect URIs.
4. Email: support@overlune.in already matches.

## Saved overlays (the fix for "re-paste every stream")
- A signed-in streamer saves an overlay and gets a **stable link**: `/o/starting/<overlayId>#2.<snapshot>`.
- The overlay loads the latest version by ID and listens on Realtime for changes. Editing in the editor updates OBS live, with no re-paste.
- The fragment keeps a snapshot as fallback, so the overlay still renders if the backend is down or the project is paused.
- Signed-out users keep today's hash-only links, unchanged.

## Customization model (schema v2)
- A scene becomes a **1920×1080 canvas of elements**: text, countdown, socials, logo/image, shape, chat box, alert box. Each has position, size, rotation, layer, style and animation.
- Themes become **presets** (a starting layout + palette + fonts + effects). The 8 current themes are converted into presets, and "Blank canvas" is added.
- **Migration:** every v1 link maps to its theme's preset layout, with the same text and settings. Fixtures for every v1 link must render the same as today (screenshot tests).
- Long layouts make hash links big; saved overlays (above) keep OBS links short.
- **Fonts:** STACK.md requires self-hosted fonts (no Google Fonts CDN, for privacy and offline OBS). Proposal: a large curated library of OFL fonts self-hosted and loaded on demand, plus uploads of the user's own font files. Allowing the Google Fonts CDN is the other option, and would need the privacy policy and CSP updated. **Owner decision.**
- Editor: drag, resize, snap-to-guides, keyboard nudging (arrow keys) so the canvas stays keyboard accessible, undo/redo, layers panel.

## Uploads
- Types allowlisted by file content: PNG, JPEG, WebP, GIF (images); OGG, MP3 (sounds); WOFF2 (fonts). Max size per type, per-user storage quota.
- Random file names, served from the storage domain, never executed. No video backgrounds (performance rule).
- Public uploads (used in gallery themes) can be reported and taken down.

## Community
- **Discord link** in the footer and setup guide: Phase 0, no build needed.
- **Gallery:** publish a theme or overlay, browse, search by tag, like, and "Use this" (remix into your own copy, with credit to the original creator kept).
- **Creator profiles:** Twitch name and avatar, published themes, total remixes.
- **Help forum / Q&A:** last phase. It needs moderation tools (reports, hide, ban, rate limits). Until then, use a Discord forum channel. Revisit whether a built-in forum is still needed once Discord is running.
- Moderation from day one of the gallery: report button, admin queue, takedown, rate limits, Turnstile on publishing and posting.

## Follow alerts (now possible with Twitch login)
- Twitch EventSub webhooks go to an Edge Function, which pushes events to the overlay over Realtime, keyed by overlay ID. The overlay never holds a Twitch token.
- Request only the Twitch scopes needed (follower read), and explain them on the login screen.

## Rules that switch on (CLAUDE.md)
- §4 Data: RLS on every table (default deny), ownership checks, field allowlists, **access-control tests in CI** (user A vs user B on every endpoint), daily backups with PITR, a real test restore before launch.
- §5 Auth: managed provider, server-side enforcement, MFA for admin accounts, session cookie rules.
- §8 Abuse: rate limits, Turnstile, moderation.
- §9 Legal: privacy policy rewritten (now collects Twitch ID, name, avatar, saved overlays, uploads, likes and posts; retention; account deletion). Terms add user content rules, licensing of published themes, takedown contact, minimum age 13.
- Pre-launch checklist items 2–4 are no longer N/A.

## Phases
| Phase | Scope | Done when |
|---|---|---|
| 0 Decisions and domain | Approve this plan and costs; update PRD, STACK, CLAUDE.md; overlune.in as custom domain; Discord link; finish T6.12/T6.13 | New docs merged, overlune.in serves the site, old links pass |
| 1 Backend foundation | Supabase staging + prod, Twitch login (optional in editor), profiles table, RLS + access tests in CI, backups, Sentry for functions | A user can sign in and out; access tests green; test restore done |
| 2 Saved overlays | Save to account, stable links, Realtime updates, snapshot fallback | Edit in editor → OBS updates live; backend down → overlay still renders |
| 3 Customization | Schema v2 + migration, canvas editor, any color, font library, presets, blank canvas | All v1 fixtures render the same; canvas usable by keyboard; <5% CPU in OBS |
| 4 Uploads | Images, sounds, fonts with checks and quotas | Upload abuse cases tested; CSP updated |
| 5 Community | Gallery, remix with credit, likes, profiles, reports, moderation queue | Moderation tested before the gallery is public |
| 6 Follow alerts | EventSub via Edge Function and Realtime | Passes OBS test; no token reaches the overlay |
| 7 Forum (if still wanted) | Built-in Q&A with moderation | Decided after Discord has run for a while |

## Site redesign (owner's mockups, 2026-10-02)
The owner shared mockups of the target look: a dark night palette, crescent moon, glowing panel edges, a landing hero with a live stream frame, and an app shell (left nav, canvas in the middle, layers and properties on the right) with Templates, Assets, Export and My Overlays pages. Decision: **build the v2 features first, then reskin the site, so every screen shows only things Overlune really does.**

The palette already matches BRAND.md (Night, Deep Space, Lune Violet, Signal Cyan), so this is a layout and feature change, not a rebrand.

### Each mockup element and the phase that makes it real
| Mockup element | Becomes real in | Notes |
|---|---|---|
| Sign In / Log in | Phase 1 | "Sign in with Twitch". The editor still works signed out. |
| My Overlays (list, "last edited") | Phase 2 | Saved overlays with stable links |
| Drag-and-drop editor: layers, X/Y/W/H, animation, colors | Phase 3 | Canvas editor, keyboard accessible |
| Templates with categories (Alerts, Scenes, Panels…) | Phase 3 (presets), Phase 5 (community) | Hearts/likes only once the gallery exists |
| Webcam frame | Phase 3 | New canvas element type (a frame with a transparent middle) |
| Asset / Elements library (icons, frames, buttons) | Phase 3 (built-in), Phase 4 (uploads) | Built-in items must be free-licensed and listed in ASSETS.md |
| Twitch panels (About me, Schedule, Donate) | Needs a decision | PRD lists static exports as out of scope. A PNG export is cheap to build on the client. |
| Export & Download (PNG, 1080p/4K, WebM, MP4) | Needs a decision | Live browser-source links stay the main product (alerts and chat can't be a PNG). PNG export for panels and banners is fine. Video export is heavy; recommend skipping it. |
| Donation alert | Not planned | Donations go through the streamer's own service (CLAUDE.md §8). Raid alerts already exist. |
| "Works with Twitch, YouTube, Kick, Facebook" | Wording fix | Overlays work in any app with a browser source; chat is Twitch only. The site must say exactly that. |
| Light/dark toggle | Any time | Needs a light editor palette that passes the contrast test |
| Pricing, Go Pro, Upgrade, "premium templates", "HD exports" upsell | **Never** | Overlune is free and non-commercial. BRAND.md bans paywall hints. |
| Castle-and-moon landscape art | **Never** | Generic AI art. The hero shows real Overlune overlays instead (below). |

### Visual rules (what "without the AI slop" means here)
- **Hero:** real scenes, alerts and chat rendered live in a 16:9 stream frame and cycling through the themes, over a CSS night sky with a crescent moon. No stock or AI images. Reduced motion: one still theme.
- **Gradient:** the signature gradient appears once per page (the mark or one hero word), never as text on every heading.
- **Glow:** only on the stream frame and the primary button, never on every card.
- **Copy:** use BRAND.md's voice and real numbers ("8 looks"). Drop "Create Stunning…", "Hundreds of templates", "No design skills needed. Just your creativity." and setup-time promises like "under 10 minutes".
- **Feature rows:** each card shows a real screenshot or live mini preview, not a generic icon plus a hype line.
- **Editor shell:** follow the mockups' three-column layout (nav, canvas, properties), with DESIGN.md spacing, Quicksand/Nunito, and visible focus rings.

### Where it fits in the phases
- **Now (v1, 2026-10-02):** an honest pass brings the good ideas to the current site with no new features: the landing hero becomes the whole kit (a live scene in a stream frame, real alert cards, scene tags) over a CSS night sky, with a fact row and live element cards; the editor gets the three-column shell (section list, live preview, settings), look filters, swatch rows and tidier link panels (TASKS.md T6.59, T6.60).
- **With their phases:** the v2-only screens arrive with the features behind them: sign in (Phase 1), My Overlays (Phase 2), the canvas editor with layers and properties (Phase 3), the template gallery and asset library (Phases 3 to 5). Each phase restyles only the screens it builds, using the shell above.
- **Phase 5b, Site redesign:** after Phase 5, rebuild the landing page and nav around the finished features, then remove anything left from the v1 look.

## Decisions needed from the owner
1. Approve Supabase (auth, Postgres, storage, realtime) and its paid production plan.
2. Fonts: self-hosted library + font uploads, or allow Google Fonts CDN?
3. Build v2 now, or launch v1 (T5.7) first and build v2 in parallel?
4. Built-in forum later, or Discord forum only?
5. Who moderates the gallery at launch (owner only, or trusted helpers)?
6. Twitch panel and banner PNG export: add it to scope? (Recommended: yes, PNG only. Skip WebM/MP4 export.)
7. Light/dark toggle: wanted?
